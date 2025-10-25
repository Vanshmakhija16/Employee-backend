import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import University from "../models/University.js";
import User from "../models/User.js";
import Doctor from "../models/Doctor.js";
import axios from "axios";

const router = express.Router();

/* ---------------------------
    AUTH MIDDLEWARE
--------------------------- */
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = (decoded.role || "").toLowerCase();
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

/* ---------------------------
    ROLE MIDDLEWARE
--------------------------- */
const requireRole = (roles) => (req, res, next) => {
  const allowedRoles = Array.isArray(roles)
    ? roles.map((r) => r.toLowerCase())
    : [roles.toLowerCase()];

  if (!allowedRoles.includes(req.userRole)) {
    console.log("Access denied:", req.userRole, allowedRoles);
    return res.status(403).json({ error: "Access denied: insufficient permissions" });
  }
  next();
};

/* ---------------------------
    HELPER FUNCTION
--------------------------- */
const getTodayAvailability = async (doctorId) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";

    const response = await axios.get(
      `${backendUrl}/api/doctors/${doctorId}/availability/${today}`
    );

    const slots = Array.isArray(response.data) ? response.data : [];
    return { available: slots.length > 0, slotsCount: slots.length };
  } catch (error) {
    console.error(`Error fetching availability for doctor ${doctorId}:`, error.message);
    return { available: false, slotsCount: 0 };
  }
};

/* ---------------------------
    ROUTES
--------------------------- */

// PUBLIC: Get all universities with admin info + assigned doctors
router.get("/", async (req, res) => {
  try {
    const universities = await University.find();

    const universitiesWithDetails = await Promise.all(
      universities.map(async (uni) => {
        const admin = await User.findOne({
          university: uni._id,
          role: "university_admin",
        }).select("name email");

        const assignedDoctors = await Doctor.find({ universities: uni._id }).select(
          "name email availabilityType specialization"
        );

        const doctorsWithAvailability = await Promise.all(
          assignedDoctors.map(async (doctor) => {
            const todayAvailability = await getTodayAvailability(doctor._id);
            return {
              ...doctor.toObject(),
              todaySchedule: todayAvailability,
            };
          })
        );

        return {
          _id: uni._id,
          name: uni.name,
          domainPatterns: uni.domainPatterns,
          adminName: admin ? admin.name : null,
          adminEmail: admin ? admin.email : null,
          assignedDoctors: doctorsWithAvailability,
        };
      })
    );

    res.status(200).json({ data: universitiesWithDetails });
  } catch (err) {
    console.error("Failed to fetch universities:", err);
    res.status(500).json({ error: "Failed to fetch universities" });
  }
});

// ADMIN: Add new university with manual admin creation
router.post("/", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { name, domainPatterns, adminName, adminEmail, adminPassword } = req.body;

    if (!name || !Array.isArray(domainPatterns) || domainPatterns.length === 0 || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existingUni = await University.findOne({ name });
    if (existingUni) return res.status(400).json({ error: "University already exists" });

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) return res.status(400).json({ error: "Admin email already exists" });

    const newUniversity = new University({ name, domainPatterns });
    await newUniversity.save();

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const uniAdmin = new User({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: "university_admin",
      university: newUniversity._id,
      isVerified: true,
      isApproved: true,
    });
    await uniAdmin.save();

    res.status(201).json({
      data: newUniversity,
      universityAdmin: { name: adminName, email: adminEmail, password: adminPassword },
      message: "University and university admin created successfully",
    });
  } catch (err) {
    console.error("Failed to add university:", err);
    res.status(500).json({ error: "Failed to add university" });
  }
});

// ADMIN: Delete university by ID
router.delete("/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid university ID" });

    const deletedUniversity = await University.findByIdAndDelete(id);
    if (!deletedUniversity) return res.status(404).json({ error: "University not found" });

    await User.deleteMany({ university: id });
    await Doctor.updateMany({ universities: id }, { $pull: { universities: id } });

    res.status(200).json({ message: "University and its users deleted successfully" });
  } catch (err) {
    console.error("Failed to delete university:", err);
    res.status(500).json({ error: "Failed to delete university" });
  }
});

// ADMIN: Get university stats
router.get("/:id/stats", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid university ID" });

    const studentCount = await User.countDocuments({ university: id, role: "student" });
    res.status(200).json({ studentCount });
  } catch (err) {
    console.error("Failed to fetch university stats:", err);
    res.status(500).json({ error: "Failed to fetch university stats" });
  }
});

// ADMIN: Get students of a university
router.get("/:id/students", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid university ID" });

    const students = await User.find({ university: id, role: "student" }).select("name email");
    res.status(200).json({ data: students });
  } catch (err) {
    console.error("Failed to fetch students:", err);
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

/* ---------------------------
    DOCTOR ASSIGNMENT ROUTES
--------------------------- */

// Get all doctors assigned to a university by ID
router.get("/:id/doctors", authMiddleware, requireRole(["admin", "university_admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid university ID" });

    const doctors = await Doctor.find({ universities: id }).select("name email");
    res.status(200).json({ data: doctors });
  } catch (err) {
    console.error("Failed to fetch doctors:", err);
    res.status(500).json({ error: "Failed to fetch doctors" });
  }
});

// Get all doctors (for assigning)
router.get("/doctors/all", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const doctors = await Doctor.find().select("name email universities");
    res.status(200).json({ data: doctors });
  } catch (err) {
    console.error("Failed to fetch all doctors:", err);
    res.status(500).json({ error: "Failed to fetch all doctors" });
  }
});

// Assign a doctor to a university
router.post("/:id/doctors", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { doctorId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(doctorId))
      return res.status(400).json({ error: "Invalid IDs" });

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });

    const uniObjectId = new mongoose.Types.ObjectId(id);
    if (!doctor.universities.some((u) => u.equals(uniObjectId))) {
      doctor.universities.push(uniObjectId);
      await doctor.save();
    }

    res.status(200).json({ message: "Doctor assigned to university successfully" });
  } catch (err) {
    console.error("Failed to assign doctor:", err);
    res.status(500).json({ error: "Failed to assign doctor" });
  }
});

// Unassign a doctor from a university
router.delete("/:id/doctors/:doctorId", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { id, doctorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(doctorId))
      return res.status(400).json({ error: "Invalid IDs" });

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });

    const uniObjectId = new mongoose.Types.ObjectId(id);
    doctor.universities = doctor.universities.filter((u) => !u.equals(uniObjectId));
    await doctor.save();

    res.status(200).json({ message: "Doctor unassigned from university successfully" });
  } catch (err) {
    console.error("Failed to unassign doctor:", err);
    res.status(500).json({ error: "Failed to unassign doctor" });
  }
});

// Get total students for logged-in user's university
router.get("/my-university/students/count", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("university");
    if (!user || !user.university) return res.status(404).json({ error: "University not found for this user" });

    const count = await User.countDocuments({ university: user.university, role: "student" });
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch student count" });
  }
});

// Get doctors assigned to logged-in user's university with today's schedule
router.get("/my-university/doctors", authMiddleware, requireRole(["admin", "university_admin"]), async (req, res) => {
  try {
    
    const user = await User.findById(req.userId).select("university");
        console.log(user);

    if (!user || !user.university) return res.status(404).json({ error: "University not found for this user" });

    const doctors = await Doctor.find({ universities: user.university }).select(
      "name email availabilityType specialization hospital dateSlots"
    );

    const doctorsWithAvailability = doctors.map((doctor) => {
      const todayKey = new Date().toISOString().split("T")[0];
      const todaySchedule = doctor.dateSlots?.get(todayKey) || [];
      return { ...doctor.toObject(), todaySchedule };
    });

    res.json({ data: doctorsWithAvailability });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch doctors" });
  }
});

export default router;

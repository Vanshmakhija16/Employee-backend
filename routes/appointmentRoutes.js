import express from "express";
import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";
import User from "../models/User.js"; // For student info
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const router = express.Router();

// ======================
// Auth Middleware
// ======================
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

// ======================
// Helper: Send Emails
// ======================
const sendEmail = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      text,
    });
  } catch (err) {
    console.error("Failed to send email:", err);
  }
};

// ======================
// Book a new appointment (first-come-first-serve, auto-approved)
// ======================
router.post("/", authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== "student") {
      return res.status(403).json({ error: "Access denied: students only" });
    }

    const { doctorId, slotStart, slotEnd, notes, mode } = req.body;

    if (!doctorId || !slotStart || !slotEnd) {
      return res.status(400).json({ error: "Doctor ID, slotStart and slotEnd are required" });
    }

   // Check doctor availability
const doctor = await Doctor.findById(doctorId);
if (!doctor || doctor.isAvailable !== "available") {
  return res.status(400).json({ error: "Doctor is not available for booking" });
}

// Convert slotStart and slotEnd to local date and time strings
const slotStartDate = new Date(slotStart);
const slotEndDate = new Date(slotEnd);

// Local date in YYYY-MM-DD format
const dateStr = slotStartDate.toLocaleDateString("en-CA"); // "YYYY-MM-DD"

// Local time in HH:mm format
const startTimeStr = slotStartDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); // "HH:mm"
const endTimeStr = slotEndDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

// Check if slot is available
const isAvailable = doctor.isAvailableAtDateTime(dateStr, startTimeStr, endTimeStr);
if (!isAvailable) {
  return res.status(400).json({ error: "Selected slot is already booked" });
}

// Book slot immediately
await doctor.bookSlot(dateStr, startTimeStr, endTimeStr);


    // Create appointment (auto-approved)
    const appointment = new Appointment({
      student: req.userId,
      doctor: doctorId,
      slotStart,
      slotEnd,
      notes,
      mode,
      status: "approved",
    });

    await appointment.save();

    // Send emails
    const student = await User.findById(req.userId);
    const adminEmail = process.env.ADMIN_EMAIL;
    const emailText = `Appointment Details:
Doctor: ${doctor.name}
Date: ${dateStr}
Time: ${startTimeStr} - ${endTimeStr}
Mode: ${mode}
Notes: ${notes || "N/A"}`;

    sendEmail(student.email, "Appointment Confirmed", `Dear ${student.name},\n\n${emailText}`);
    sendEmail(doctor.email, "New Appointment Booked", emailText);
    if (adminEmail) sendEmail(adminEmail, "New Appointment Booked", emailText);

    res.status(201).json({ message: "Appointment booked successfully!", appointment });
  } catch (err) {
    console.error("Error booking appointment:", err);
    res.status(500).json({ error: "Failed to book appointment" });
  }
});

// ======================
// Get all appointments (admin only)
// ======================
router.get("/", authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ error: "Access denied: admins only" });
    }

    const appointments = await Appointment.find()
      .populate("doctor", "name specialization email phone")
      .populate("student", "name email phone")
      .sort({ slotStart: 1 });
    console.log("hello")
    res.json({ data: appointments });
  } catch (err) {
    console.error("Error fetching all appointments:", err);
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

// ======================
// Get all appointments for a specific doctor (admin only)
// ======================
router.get("/doctor/:doctorId", authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ error: "Access denied: admins only" });
    }

    const { doctorId } = req.params;
    const appointments = await Appointment.find({ doctor: doctorId })
      .populate("student", "name email phone")
      .sort({ slotStart: 1 });

    res.json({ data: appointments });
  } catch (err) {
    console.error("Failed to fetch appointments:", err);
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

// ======================
// Update appointment status (doctors or admins only)
// ======================
router.patch("/:id/status", authMiddleware, async (req, res) => {
  try {
    if (!["doctor", "admin"].includes(req.userRole)) {
      return res.status(403).json({ error: "Access denied: doctors or admins only" });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "approved", "rejected", "completed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) return res.status(404).json({ error: "Appointment not found" });

    if (req.userRole === "doctor" && appointment.doctor.toString() !== req.userId) {
      return res.status(403).json({ error: "Access denied: not your appointment" });
    }

    appointment.status = status;
    await appointment.save();

    res.json({ message: "Appointment status updated", appointment });
  } catch (err) {
    console.error("Error updating appointment status:", err);
    res.status(500).json({ error: "Failed to update appointment status" });
  }
});

// ======================
// Student-Specific Routes
// ======================
router.get("/my/attended", authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== "student") {
      return res.status(403).json({ error: "Access denied: students only" });
    }

    const count = await Appointment.countDocuments({
      student: req.userId,
      status: "completed",
    });
    res.json({ count });
  } catch (err) {
    console.error("Error getting total attended sessions:", err);
    res.status(500).json({ error: "Failed to get attended sessions" });
  }
});

router.get("/my/upcoming", authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== "student") {
      return res.status(403).json({ error: "Access denied: students only" });
    }

    const now = new Date();
    const count = await Appointment.countDocuments({
      student: req.userId,
      status: "booked",
      slotStart: { $gte: now },
    });
    res.json({ count });
  } catch (err) {
    console.error("Error getting upcoming sessions:", err);
    res.status(500).json({ error: "Failed to get upcoming sessions" });
  }
});

// ======================
// Doctor-Specific Routes
// ======================
router.get("/my/appointments", authMiddleware, async (req, res) => {
  try {
    if (!["doctor", "admin"].includes(req.userRole)) {
      return res.status(403).json({ error: "Access denied: doctors or admins only" });
    }

    let query = {};
    if (req.userRole === "doctor") query.doctor = req.userId;

    if (req.query.status) {
      if (!["pending", "approved", "rejected", "completed"].includes(req.query.status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      query.status = req.query.status;
    }

    if (req.query.search && req.query.search.trim()) {
      query.$or = [
        { "student.name": { $regex: req.query.search, $options: "i" } },
        { notes: { $regex: req.query.search, $options: "i" } },
      ];
      if (req.userRole === "admin") {
        query.$or.push({ "doctor.name": { $regex: req.query.search, $options: "i" } });
      }
    }

    const appointments = await Appointment.find(query)
      .populate("student", "name email phone")
      .populate("doctor", "name specialization email phone")
      .sort({ slotStart: 1 });

    res.json({ data: appointments });
  } catch (err) {
    console.error("Failed to fetch appointments:", err);
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

// ======================
// Pending appointments
// ======================
router.get("/appointments/pending", authMiddleware, async (req, res) => {
  try {
    if (!["doctor", "admin"].includes(req.userRole)) {
      return res.status(403).json({ error: "Access denied: doctors or admins only" });
    }

    let query = { status: "pending" };
    if (req.userRole === "doctor") query.doctor = req.userId;

    if (req.query.search && req.query.search.trim()) {
      query.$or = [
        { "student.name": { $regex: req.query.search, $options: "i" } },
        { notes: { $regex: req.query.search, $options: "i" } },
      ];
      if (req.userRole === "admin") query.$or.push({ "doctor.name": { $regex: req.query.search, $options: "i" } });
    }

    const appointments = await Appointment.find(query)
      .populate("student", "name email phone")
      .populate("doctor", "name specialization email phone")
      .sort({ createdAt: -1 });

    res.json({ data: appointments });
  } catch (err) {
    console.error("ERROR in pending appointments:", err);
    res.status(500).json({ error: "Failed to fetch pending appointments" });
  }
});

// ======================
// Rejected appointments
// ======================
router.get("/rejected", authMiddleware, async (req, res) => {
  try {
    if (!["doctor", "admin"].includes(req.userRole)) {
      return res.status(403).json({ error: "Access denied: doctors or admins only" });
    }

    let query = { status: "rejected" };
    if (req.userRole === "doctor") query.doctor = req.userId;

    if (req.query.search && req.query.search.trim()) {
      query.$or = [
        { "student.name": { $regex: req.query.search, $options: "i" } },
        { notes: { $regex: req.query.search, $options: "i" } },
      ];
      if (req.userRole === "admin") query.$or.push({ "doctor.name": { $regex: req.query.search, $options: "i" } });
    }

    const appointments = await Appointment.find(query)
      .populate("student", "name email phone")
      .populate("doctor", "name specialization email phone")
      .sort({ createdAt: -1 });

    res.json({ data: appointments });
  } catch (err) {
    console.error("Error fetching rejected appointments:", err);
    res.status(500).json({ error: "Failed to fetch rejected appointments" });
  }
});

// ======================
// Approved appointments
// ======================
router.get("/approved", authMiddleware, async (req, res) => {
  try {
    if (!["doctor", "admin"].includes(req.userRole)) {
      return res.status(403).json({ error: "Access denied: doctors or admins only" });
    }

    let query = { status: "approved" };
    if (req.userRole === "doctor") query.doctor = req.userId;

    if (req.query.search && req.query.search.trim()) {
      query.$or = [
        { "student.name": { $regex: req.query.search, $options: "i" } },
        { notes: { $regex: req.query.search, $options: "i" } },
      ];
      if (req.userRole === "admin") query.$or.push({ "doctor.name": { $regex: req.query.search, $options: "i" } });
    }

    const appointments = await Appointment.find(query)
      .populate("student", "name email phone")
      .populate("doctor", "name specialization email phone")
      .sort({ slotStart: 1 });

    res.json({ data: appointments });
  } catch (err) {
    console.error("Error fetching approved appointments:", err);
    res.status(500).json({ error: "Failed to fetch approved appointments" });
  }
});

export default router;

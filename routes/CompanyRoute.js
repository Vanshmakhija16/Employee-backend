import express from "express";
import Company from "../models/Company.js";
import jwt from "jsonwebtoken"
import User from "../models/User.js"; // ✅ make sure this path is correct!
import Doctor from "../models/Doctor.js";
import EmployeeAppointment from "../models/EmployeeAppointment.js";
import nodemailer from "nodemailer";
import Employee from "../models/Employee.js";


const router = express.Router();


const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmployeeAppointmentEmail = async (appointment) => {
  try {
    const employee = await Employee.findById(appointment.employee);
    const doctor = await Doctor.findById(appointment.doctor);

    if (!employee || !doctor) return;

    const date = new Date(appointment.slotStart).toLocaleDateString();
    const startTime = new Date(appointment.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endTime = new Date(appointment.slotEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const subject = "✅ Your session is confirmed";
    
    const employeeText = `
Hi ${employee.name},

Your session with Dr. ${doctor.name} has been booked successfully.

Date: ${date}
Time: ${startTime} - ${endTime}
Mode: ${appointment.mode || "N/A"}
Notes: ${appointment.notes || "N/A"}

Thank you!
`;

    const doctorText = `
Hi Dr. ${doctor.name},

A new session has been booked by ${employee.name}.

Date: ${date}
Time: ${startTime} - ${endTime}
Mode: ${appointment.mode || "N/A"}
Notes: ${appointment.notes || "N/A"}

Please be prepared.
`;

    // Send emails
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: employee.email,
      subject,
      text: employeeText,
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: doctor.email,
      subject,
      text: doctorText,
    });

  } catch (err) {
    console.error("Failed to send email:", err);
  }
};


// ✅ Inline authMiddleware
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("id email role");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err.message);
    res.status(403).json({ error: "Invalid or expired token" });
  }
};

// ✅ Inline requireRole middleware
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  };
};

// 📌 Add a new company
router.post("/add", async (req, res) => {
  try {
    const { name, domainPatterns } = req.body;

    // Basic validation
    if (!name || !domainPatterns || !Array.isArray(domainPatterns) || domainPatterns.length === 0) {
      return res.status(400).json({ error: "Please provide company name and at least one domain pattern" });
    }

    // Check if a company with same domain already exists
    const existingCompany = await Company.findOne({ domainPatterns: { $in: domainPatterns } });
    if (existingCompany) {
      return res.status(400).json({ error: "A company with one of these domains already exists" });
    }

    // Create and save new company
    const company = new Company({ name, domainPatterns });
    await company.save();

    res.status(201).json({
      message: "Company added successfully",
      company,
    });
  } catch (error) {
    console.error("Error adding company:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 📍 Get all companies (universities)
router.get("/", async (req, res) => {
  try {
    const companies = await Company.find().sort({ createdAt: -1 }); // latest first
    res.status(200).json(companies);
  } catch (error) {
    console.error("Error fetching companies:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/company/:id
router.delete("/:id", async (req, res) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }
    res.status(200).json({ message: "Company deleted successfully" });
  } catch (error) {
    console.error("Error deleting company:", error);
    res.status(500).json({ message: "Server error while deleting company" });
  }
});




router.get("/doctors/all", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const doctors = await Doctor.find().select("name email");
    res.status(200).json({ data: doctors });
  } catch (err) {
    console.error("Failed to fetch all doctors:", err);
    res.status(500).json({ error: "Failed to fetch all doctors" });
  }
});


// 🏢 2. Get all doctors assigned to a specific company
router.get("/:companyId/doctors", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId).populate("doctors", "name email");
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    res.status(200).json({ data: company.doctors });
  } catch (err) {
    console.error("Failed to fetch assigned doctors:", err);
    res.status(500).json({ error: "Failed to fetch assigned doctors" });
  }
});


// ➕ 3. Assign a doctor to a company
router.post("/:companyId/doctors", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { doctorId } = req.body;
    if (!doctorId) return res.status(400).json({ error: "Doctor ID is required" });

    const company = await Company.findById(req.params.companyId);
    if (!company) return res.status(404).json({ error: "Company not found" });

    if (company.doctors.includes(doctorId)) {
      return res.status(400).json({ error: "Doctor already assigned to this company" });
    }

    company.doctors.push(doctorId);
    await company.save();

    res.status(200).json({ message: "Doctor assigned successfully" });
  } catch (err) {
    console.error("Failed to assign doctor:", err);
    res.status(500).json({ error: "Failed to assign doctor" });
  }
});


// ❌ 4. Unassign (remove) a doctor from a company
router.delete("/:companyId/doctors/:doctorId", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { companyId, doctorId } = req.params;

    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ error: "Company not found" });

    company.doctors = company.doctors.filter((d) => d.toString() !== doctorId);
    await company.save();

    res.status(200).json({ message: "Doctor unassigned successfully" });
  } catch (err) {
    console.error("Failed to unassign doctor:", err);
    res.status(500).json({ error: "Failed to unassign doctor" });
  }
});


// 🧾 5. Get all companies (optional helper route)
router.get("/all", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const companies = await Company.find().select("name email doctors");
    res.status(200).json({ data: companies });
  } catch (err) {
    console.error("Failed to fetch companies:", err);
    res.status(500).json({ error: "Failed to fetch companies" });
  }
});


// // ✅ Get all doctors assigned to the company of the logged-in employee
// router.get("/assigned-doctors", async (req, res) => {
//   try {
//     const { company } = req.query;
//     if (!company) return res.status(400).json({ error: "Company ID required" });

//     const foundCompany = await Company.findById(company)
//       .populate("doctors", "name email specialization profileImage");

//     if (!foundCompany) return res.status(404).json({ error: "Company not found" });

//     res.status(200).json({ data: foundCompany.doctors });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Failed to fetch doctors" });
//   }
// });


// ✅ Get all doctors (no company filter)
router.get("/assigned-doctors", async (req, res) => {
  try {
    const doctors = await Doctor.find({}, "name email specialization imageUrl");
    res.status(200).json({ data: doctors });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch doctors" });
  }
});


// ✅ Create employee appointment
// ✅ Create employee appointment (prevent duplicate bookings)
router.post("/", async (req, res) => {
  try {
    const { employeeId, doctorId, slotStart, slotEnd, notes, mode } = req.body;

    if (!employeeId || !doctorId || !slotStart || !slotEnd) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if slot is already booked
    const overlappingSession = await EmployeeAppointment.findOne({
      doctor: doctorId,
      $or: [
        { slotStart: { $lt: slotEnd }, slotEnd: { $gt: slotStart } },
      ],
    });

    if (overlappingSession) {
      return res.status(400).json({
        error: "This time slot is already booked for the selected doctor.",
      });
    }

    // Create appointment
    const newAppointment = new EmployeeAppointment({
      employee: employeeId,  // store employee reference
      doctor: doctorId,
      slotStart,
      slotEnd,
      notes,
      mode,
    });

    await newAppointment.save();

    // Send email notifications
    await sendEmployeeAppointmentEmail(newAppointment);

    res.status(201).json({
      message: "Employee session booked successfully!",
      appointment: newAppointment,
    });
  } catch (err) {
    console.error("Booking failed:", err);
    res.status(500).json({ error: "Failed to create appointment" });
  }
});

export default router;
import express from "express";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import twilio from "twilio";
import User from "../models/User.js";
import Appointment from "../models/Appointment.js";
import dotenv from "dotenv";
const router = express.Router();
dotenv.config();

// --------------------
// Auth middleware
// --------------------
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>
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

// --------------------
// Role-based middleware
// --------------------
const requireRole = (role) => (req, res, next) => {
  if (req.userRole !== role.toLowerCase()) {
    return res.status(403).json({ error: "Access denied: insufficient permissions" });
  }
  next();
};

// --------------------
// Email transporter
// --------------------
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Helper to send notifications
const sendNotifications = async (appointment, type) => {
  const studentName = appointment.student?.name || appointment.name || "Student";
  const studentEmail = appointment.student?.email || appointment.email;
  const studentPhone = appointment.student?.phone || appointment.phone;
  const date = new Date(appointment.slotStart).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const time = new Date(appointment.slotStart).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  let subject, text;

  if (type === "approved") {
    subject = "✅ Your session is approved";
    text = `Hi ${studentName},

Your session has been confirmed for ${date} at ${time}.

Thank you for booking with us. We look forward to seeing you.

Best regards,
The Team`;
  } else {
    subject = "❌ Your session is rejected";
    text = `Hi ${studentName},

We regret to inform you that your session scheduled for ${date} at ${time} has been rejected.

We apologize for any inconvenience this may cause. Please contact support for further assistance.

Best regards,
The Team`;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: studentEmail,
      subject,
      text,
    });
    console.log(`Email sent to ${studentEmail}`);
  } catch (err) {
    console.error("Failed to send email:", err);
  }
};

// --------------------
// Admin Stats Routes
// --------------------

router.get("/stats/doctors", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const doctorsCount = await User.countDocuments({ role: "doctor" });
    res.json({ count: doctorsCount });
  } catch (err) {
    console.error("Error fetching doctors count:", err);
    res.status(500).json({ error: "Failed to fetch doctors count" });
  }
});

router.get("/stats/sessions", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const sessionsCount = await Appointment.countDocuments({ status: "completed" });
    res.json({ count: sessionsCount });
  } catch (err) {
    console.error("Error fetching completed sessions count:", err);
    res.status(500).json({ error: "Failed to fetch sessions count" });
  }
});

// --------------------
// GET all appointments (admin)
// --------------------
router.get("/appointments", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .sort({ createdAt: -1 }) // Sort by booking/creation date descending
      .populate("student")
      .populate("doctor");

    const formatted = appointments.map((a) => ({
      _id: a._id,
      student: a.student || { name: a.name, email: a.email, phone: a.phone },
      doctor: a.doctor || { name: "N/A", specialization: "" },
      slotStart: a.slotStart,
      slotEnd: a.slotEnd,
      mode: a.mode,
      notes: a.notes,
      status: a.status || "pending",
      patientName: a.name,
      phone: a.phone,
    }));
    res.status(200).json({ data: formatted });
  } catch (err) {
    console.error("Error fetching appointments for admin:", err);
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

// --------------------
// Approve appointment
// --------------------
router.patch("/appointments/:id/status", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { status } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const appointment = await Appointment.findById(req.params.id).populate("student");
    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    appointment.status = status;
    await appointment.save();

    try {
      await sendNotifications(appointment, status);
    } catch (notifErr) {
      console.error("Notification sending failed:", notifErr);
    }

    res.json({
      message: `Appointment ${status} and notifications sent`,
      data: appointment,
    });
  } catch (err) {
    console.error("Failed to update appointment status:", err);
    res.status(500).json({ error: "Failed to update appointment status" });
  }
});

// --------------------
// Reject appointment (delete)
// --------------------
router.delete("/appointments/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id).populate("student");
    if (!appointment) return res.status(404).json({ error: "Appointment not found" });

    // Send rejection notifications before deleting
    await sendNotifications(appointment, "rejected");

    await Appointment.findByIdAndDelete(id);

    res.json({ message: "Appointment rejected and deleted successfully", deletedId: id });
  } catch (err) {
    console.error("Error rejecting appointment:", err);
    res.status(500).json({ error: "Failed to reject appointment" });
  }
});

// Get pending (booked) appointments
router.get("/appointments/pending", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const pendingAppointments = await Appointment.find({ status: "pending" })
      .sort({ createdAt: -1 })
      .populate("student")
      .populate("doctor");
    res.status(200).json({ data: pendingAppointments });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch pending appointments" });
  }
});

// --------------------
// Get approved appointments with updated doctor lookup
// --------------------
router.get("/appointments/approved", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { search } = req.query;
    const searchRegex = search ? new RegExp(`^${search}`, "i") : null;

    // Build aggregation pipeline
    const pipeline = [
      { $match: { status: "approved" } },
      {
        $lookup: {
          from: "users", // students
          localField: "student",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: { path: "$student", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "doctors", // doctors collection
          localField: "doctor",
          foreignField: "_id",
          as: "doctor",
        },
      },
      { $unwind: { path: "$doctor", preserveNullAndEmptyArrays: true } },
    ];

    if (searchRegex) {
      pipeline.push({
        $match: {
          $or: [
            { patientName: { $regex: searchRegex } },
            { "student.name": { $regex: searchRegex } },
            { "doctor.name": { $regex: searchRegex } },
          ],
        },
      });
    }

    pipeline.push({ $sort: { createdAt: -1 } });

    const results = await Appointment.aggregate(pipeline);

    res.status(200).json({ data: results });
  } catch (err) {
    console.error("Failed to fetch approved appointments:", err);
    res.status(500).json({ error: "Failed to fetch approved appointments" });
  }
});

// Get rejected appointments
router.get("/appointments/rejected", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const rejectedAppointments = await Appointment.find({ status: "rejected" })
      .sort({ createdAt: -1 })
      .populate("student")
      .populate("doctor");
    res.status(200).json({ data: rejectedAppointments });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch rejected appointments" });
  }
});

export default router;

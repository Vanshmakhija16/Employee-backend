import express from "express";
import mongoose from "mongoose";
import Session from "../models/Session.js";
import Doctor from "../models/Doctor.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
console.log("📦 sessionRoutes loaded");

const router = express.Router();
dotenv.config();

// --------------------
// Email transporter
// --------------------
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// --------------------
// Middleware to check JWT
// --------------------
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role;
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

// --------------------
// Helper: format time as "HH:MM" (24-hour)
// --------------------
const formatTime = (date) => {
  const d = new Date(date);
  // If invalid date, return null
  if (isNaN(d)) return null;
  return d.toISOString().substring(11, 16); // e.g. "09:00", "14:15"
};

// --------------------
// Helper: build ISO datetime from date + time
//  - date: "YYYY-MM-DD"
//  - time: "HH:mm"
// returns ISO string or null if invalid
// --------------------
const buildISOFromDateAndTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;
  // normalize time (ensure "HH:mm")
  const timeMatch = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(timeStr);
  if (!timeMatch) return null;
  // create ISO local datetime (no timezone shift) using `dateStr + 'T' + time + ':00'`
  const iso = new Date(`${dateStr}T${timeStr}:00`);
  if (isNaN(iso)) return null;
  return iso.toISOString();
};

// --------------------
// Helper: Send email notifications
// --------------------
const sendNotifications = async (session) => {
  try {
    const student = await User.findById(session.student);
    const doctor = await Doctor.findById(session.doctorId);
    const adminEmail =
      process.env.ADMIN_EMAIL || process.env.ADMINEMAIL || "admin@example.com";

    const studentName = student?.name || "Student";
    const doctorName = doctor?.name || "Doctor";

    const studentEmail = student?.email || null;
    const doctorEmail = doctor?.email || null;

    const date = new Date(session.slotStart).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const time = new Date(session.slotStart).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const subject = "✅ Your session is confirmed";
    const text = `Session Details:

Student: ${studentName}
Doctor: ${doctorName}
Date: ${date}
Time: ${time}
Mode: ${session.mode}
Notes: ${session.notes || "N/A"}

Thank you for booking with us.`;

    const recipients = [studentEmail, doctorEmail, adminEmail].filter(Boolean);

    for (const email of recipients) {
      await transporter.sendMail({
        from:
          process.env.SMTP_FROM ||
          process.env.SMTPFROM ||
          "no-reply@example.com",
        to: email,
        subject,
        text,
      });
    }
  } catch (err) {
    console.error("Failed to send email:", err);
    // not fatal for booking
  }
};


// Book a new session

router.post("/", authMiddleware, async (req, res) => {
  console.log("📩 Incoming body:", req.body);
   console.log(
    "📩 slotStart:",
    req.body.slotStart,
    "slotEnd:",
    req.body.slotEnd
  );

  try {
    console.log("📩 Incoming booking request body:", req.body);

    // only students allowed
    if (req.userRole !== "student") {
      return res.status(403).json({ error: "Access denied: students only" });
    }

    const {
      doctorId,
      slotStart: rawSlotStart,
      slotEnd: rawSlotEnd,
      date: providedDate, // optional (used when frontend sends HH:mm times)
      notes,
      mode,
    } = req.body;

    // Basic required fields
    if (!doctorId || !rawSlotStart || !rawSlotEnd || !mode) {
      return res.status(400).json({
        error: "Doctor ID, slotStart, slotEnd, and mode are required",
      });
    }

    // helpers
    const isTimeOnly = (s) =>
      typeof s === "string" && /^([01]?\d|2[0-3]):([0-5]\d)$/.test(s);
    const isISOish = (s) =>
      typeof s === "string" && (s.includes("T") || s.endsWith("Z"));

    const buildISOFromDateAndTime = (dateStr, timeStr) => {
      if (!dateStr || !timeStr) return null;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
      if (!/^([01]?\d|2[0-3]):([0-5]\d)$/.test(timeStr)) return null;
      const iso = new Date(`${dateStr}T${timeStr}:00`);
      if (isNaN(iso)) return null;
      return iso.toISOString();
    };

    // Try to derive final slotStart/slotEnd ISO strings in a robust way
    let finalSlotStartISO = null;
    let finalSlotEndISO = null;

    // Case A: both are "HH:mm" => require 'date' param
    if (isTimeOnly(rawSlotStart) && isTimeOnly(rawSlotEnd)) {
      if (!providedDate || !/^\d{4}-\d{2}-\d{2}$/.test(providedDate)) {
        return res.status(400).json({
          error:
            "When sending time-only slots (HH:mm), include date as YYYY-MM-DD in body field 'date'",
        });
      }
      finalSlotStartISO = buildISOFromDateAndTime(providedDate, rawSlotStart);
      finalSlotEndISO = buildISOFromDateAndTime(providedDate, rawSlotEnd);
      if (!finalSlotStartISO || !finalSlotEndISO) {
        return res.status(400).json({
          error: "Invalid date or time format (expected YYYY-MM-DD and HH:mm)",
        });
      }
    }
    // Case B: both look like ISO strings -> use as-is (but validate)
    else if (isISOish(rawSlotStart) && isISOish(rawSlotEnd)) {
      const sStart = new Date(rawSlotStart);
      const sEnd = new Date(rawSlotEnd);
      if (isNaN(sStart) || isNaN(sEnd)) {
        return res.status(400).json({ error: "Invalid ISO datetime provided" });
      }
      finalSlotStartISO = sStart.toISOString();
      finalSlotEndISO = sEnd.toISOString();
    } else {
      // Mixed or unsupported format — attempt to be helpful with mixed cases
      if (isTimeOnly(rawSlotStart) && isISOish(rawSlotEnd) && providedDate) {
        finalSlotStartISO = buildISOFromDateAndTime(providedDate, rawSlotStart);
        finalSlotEndISO = new Date(rawSlotEnd).toISOString();
      } else if (
        isISOish(rawSlotStart) &&
        isTimeOnly(rawSlotEnd) &&
        providedDate
      ) {
        finalSlotStartISO = new Date(rawSlotStart).toISOString();
        finalSlotEndISO = buildISOFromDateAndTime(providedDate, rawSlotEnd);
      } else {
        return res.status(400).json({
          error:
            "slotStart and slotEnd must be either both HH:mm (with 'date') or both full ISO datetimes",
        });
      }
      if (!finalSlotStartISO || !finalSlotEndISO) {
        return res
          .status(400)
          .json({ error: "Failed to parse slot datetimes" });
      }
    }

    // Parse into Date objects and validate
    const slotStartDate = new Date(finalSlotStartISO);
    const slotEndDate = new Date(finalSlotEndISO);
    console.log(
      "🔍 Parsed slotStartDate, slotEndDate:",
      slotStartDate,
      slotEndDate
    );
    if (isNaN(slotStartDate) || isNaN(slotEndDate)) {
      console.error("❌ Invalid constructed dates", {
        finalSlotStartISO,
        finalSlotEndISO,
      });
      return res
        .status(400)
        .json({ error: "Invalid slot start/end datetimes" });
    }

    // ----------------------------
    // Fetch student
    // ----------------------------
    const student = await User.findById(req.userId);
    if (!student) return res.status(404).json({ error: "Student not found" });

    // ----------------------------
    // (Optional) daily session limit check
    // If you DO NOT want the '2 sessions per day' check, remove this block
    // ----------------------------
    const startOfDay = new Date(slotStartDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(slotStartDate);
    endOfDay.setHours(23, 59, 59, 999);

    console.log("📌 Checking daily session limit for student:", req.userId);
    console.log("📅 Day range:", startOfDay, " -> ", endOfDay);

    const todaySessions = await Session.find({
      student: req.userId,
      slotStart: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ["cancelled", "rejected"] },
    });

    console.log("📌 Existing active sessions today:", todaySessions.length);

    // If you want to keep the limit, uncomment this:
    // if (todaySessions.length >= 2) {
    //   return res.status(400).json({
    //     error: "❌ You can book only 2 active sessions per day. Please try again tomorrow.",
    //   });
    // }

    // ----------------------------
    // Normalize mode
    // ----------------------------
    const modeValue =
      typeof mode === "string" && mode.length
        ? mode.charAt(0).toUpperCase() + mode.slice(1).toLowerCase()
        : null;
    if (!modeValue || !["Online", "Offline"].includes(modeValue)) {
      return res
        .status(400)
        .json({ error: "Invalid mode. Must be 'Online' or 'Offline'" });
    }

    // ----------------------------
    // Fetch doctor and check availability
    // ----------------------------
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });
    if (doctor.isAvailable !== "available") {
      return res
        .status(400)
        .json({ error: "Doctor is not available for booking" });
    }

    // ----------------------------
    // Check and create doctor dateSlots if needed
    // ----------------------------
    const bookingDate = slotStartDate.toISOString().split("T")[0]; // YYYY-MM-DD
    const toLocalTimeHHMM = (date) => {
      const localTime = new Date(date).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Kolkata", // or your actual local timezone
      });
      return localTime;
    };

    const bookingStartTime = toLocalTimeHHMM(slotStartDate);
    const bookingEndTime = toLocalTimeHHMM(slotEndDate);
    console.log("📅 bookingStartTime:", bookingStartTime);
    console.log("📅 bookingEndTime:", bookingEndTime);


    if (
      (doctor.dateSlots instanceof Map && !doctor.dateSlots.has(bookingDate)) ||
      (!(doctor.dateSlots instanceof Map) && !doctor.dateSlots?.[bookingDate])
    ) {
      const fallbackSlots = doctor.getAvailabilityForDate
        ? doctor.getAvailabilityForDate(bookingDate)
        : [];
      const normalizedFallback = (fallbackSlots || []).map((s) => ({ ...s }));
      if (doctor.dateSlots instanceof Map) {
        doctor.dateSlots.set(bookingDate, normalizedFallback);
      } else {
        doctor.dateSlots = doctor.dateSlots || {};
        doctor.dateSlots[bookingDate] = normalizedFallback;
      }
      doctor.markModified && doctor.markModified("dateSlots");
      await doctor.save();
    }

    const slots =
      doctor.dateSlots instanceof Map
        ? doctor.dateSlots.get(bookingDate)
        : doctor.dateSlots?.[bookingDate] || [];

    const slotIndex = slots.findIndex(
      (slot) =>
        slot.startTime === bookingStartTime &&
        slot.endTime === bookingEndTime &&
        slot.isAvailable !== false
    );
    
        console.log(
      "🎯 slots on doctor:",
      slots.map((s) => `${s.startTime}-${s.endTime} (${s.isAvailable})`)
    );

    if (slotIndex === -1) {
      return res
        .status(400)
        .json({ error: "Selected slot is already booked or not available" });
    }

    // Mark slot booked on doctor record
    slots[slotIndex].isAvailable = false;
    if (doctor.dateSlots instanceof Map) {
      doctor.dateSlots.set(bookingDate, slots);
    } else {
      doctor.dateSlots[bookingDate] = slots;
    }
    doctor.markModified && doctor.markModified("dateSlots");
    await doctor.save();

    // ----------------------------
    // Create session (pass Date objects, not the string "Invalid Date")
    // ----------------------------
    const session = new Session({
      student: req.userId,
      doctorId,
      patientName: student.name,
      mobile: student.mobile || "N/A",
      slotStart: slotStartDate, // Date object
      slotEnd: slotEndDate, // Date object
      notes,
      mode: modeValue,
      status: "booked",
    });

    await session.save();
    console.log("✅ Session saved:", session._id);

    // Optionally notify
    await sendNotifications(session);

    res.status(201).json({
      message: "✅ Session booked successfully",
      session,
    });
  } catch (error) {
    console.log("📩 Incoming booking request body:", req.body);
    console.error("❌ Error booking session:", error);
    res.status(500).json({ error: "Failed to book session" });
  }
});

// --------------------
// Update session status
// --------------------
router.put("/:id/status", authMiddleware, async (req, res) => {
  try {
    const allSessions = await Session.find({});
    console.log("All sessions in DB:", allSessions);

    const session = await Session.findById(req.params.id);
    console.log(session, req.params.id);

    if (!session) return res.status(404).json({ error: "Session not found" });

    const userId = req.userId;
    const isDoctorOrAdmin =
      req.userRole === "admin" ||
      (session.doctorId && session.doctorId.toString() === userId);

    if (!isDoctorOrAdmin) {
      return res
        .status(403)
        .json({ error: "Not authorized to change this session" });
    }

    const { status } = req.body;

    if (!["approved", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const prevStatus = session.status;
    session.status = status;
    session.completedAt = status === "completed" ? new Date() : null;
    await session.save();

    try {
      if (prevStatus !== "completed" && status === "completed") {
        await User.findByIdAndUpdate(session.student, {
          $inc: { attendedCount: 1 },
        });
      } else if (prevStatus === "completed" && status !== "completed") {
        await User.findByIdAndUpdate(session.student, {
          $inc: { attendedCount: -1 },
        });
      }
    } catch (err) {
      console.error("Failed updating user counter:", err);
    }

    res.json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Get all sessions of logged-in student
// --------------------
router.get("/", authMiddleware, async (req, res) => {
  try {
    const sessions = await Session.find({ student: req.userId })
      .populate("doctorId", "name specialization email")
      .sort({ slotStart: 1 });
    res.json(sessions);
  } catch (error) {
    console.error("Failed to fetch sessions:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

// --------------------
// Doctor dashboard: get sessions
// --------------------
router.get("/my-sessions", authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== "doctor") {
      return res.status(403).json({ error: "Access denied: doctors only" });
    }

    const { date, day, startTime, endTime } = req.query;
    let filter = { doctorId: req.userId };

    if (date) {
      const dateObj = new Date(date + "T00:00:00");
      if (isNaN(dateObj)) {
        return res.status(400).json({ error: "Invalid date parameter" });
      }

      filter.slotStart = {
        $gte: dateObj,
        $lte: new Date(date + "T23:59:59"),
      };
    }

    if (day) {
      const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const dayIndex = days.indexOf(day);
      if (dayIndex !== -1) {
        filter.slotStart = {
          ...filter.slotStart,
          $expr: { $eq: [{ $dayOfWeek: "$slotStart" }, dayIndex + 1] },
        };
      }
    }

    if (startTime || endTime) {
      const timeFilter = {};
      if (startTime) {
        const startTimeDate = new Date("1970-01-01T" + startTime + ":00Z");
        if (isNaN(startTimeDate)) {
          return res.status(400).json({ error: "Invalid startTime parameter" });
        }
        timeFilter.$gte = startTimeDate.toISOString();
      }
      if (endTime) {
        const endTimeDate = new Date("1970-01-01T" + endTime + ":00Z");
        if (isNaN(endTimeDate)) {
          return res.status(400).json({ error: "Invalid endTime parameter" });
        }
        timeFilter.$lte = endTimeDate.toISOString();
      }
      filter.slotStart = { ...filter.slotStart, ...timeFilter };
    }

    const allSessions = await Session.find(filter)
      .populate("student", "name email mobile")
      .populate("doctorId", "name specialization")
      .sort({ slotStart: 1 });

    const now = new Date();
    const upcoming = allSessions.filter((s) => new Date(s.slotStart) >= now);
    const history = allSessions.filter((s) => new Date(s.slotStart) < now);

    res.status(200).json({ upcoming, history });
  } catch (err) {
    console.error("Error fetching doctor sessions:", err);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

export default router;

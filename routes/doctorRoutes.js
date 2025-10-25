// routes/doctor.routes.js
import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Doctor from "../models/Doctor.js";
import User from "../models/User.js";
import upload from "../middlewares/upload.js"; 
import jwt from "jsonwebtoken";
import Session from "../models/Session.js";


const router = express.Router();

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id || decoded._id; // depends on how you sign token
    next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};
// --------------------- HELPERS ---------------------

// Format doctor for frontend response
const formatDoctorResponse = (doctor) => {
  // Call the method BEFORE converting to plain object
  const today = new Date().toISOString().slice(0, 10);
  const todaySlots = doctor.getAvailabilityForDate ? doctor.getAvailabilityForDate(today) : [];
  
  // Add debugging
  console.log(`Doctor ${doctor.name}:`);
  console.log(`- Today (${today}) slots:`, todaySlots);
  console.log(`- Has dateSlots:`, doctor.dateSlots ? 'Yes' : 'No');
  if (doctor.dateSlots) {
    console.log(`- DateSlots keys:`, Array.from(doctor.dateSlots.keys()));
  }
  
  // NOW convert to plain object
  const obj = doctor.toObject();
  
  obj.todaySchedule = {
    date: today,
    available: true, // Change this line - always show as available
    slots: todaySlots,
  };
  
  // Rest of existing code...
  obj.weeklySchedule = obj.weeklySchedule || [];
  
  if (obj.dateSlots && obj.dateSlots instanceof Map) {
    const dateSlotObj = {};
    for (const [key, value] of obj.dateSlots.entries()) {
      dateSlotObj[key] = value;
    }
    obj.slots = dateSlotObj;
    obj.dateSlots = dateSlotObj;
  }   else if (obj.dateSlots && typeof obj.dateSlots === 'object') {
    obj.slots = obj.dateSlots;
  }

  // ✅ Add profileImage fiaeld before returning
  obj.profileImage = doctor.imageUrl 
    ? `${process.env.BASE_URL}${doctor.imageUrl}` 
    : null;
  
  return obj;
};


// Validate MongoDB ObjectId
const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid doctor ID" });
  }
  next();
};

// Generate random password
const generatePassword = () => {
  return Math.random().toString(36).slice(-8);
};

// --------------------- ROUTES ---------------------

// Add new doctor
router.post("/", upload.single("profileImage"), async (req, res) => {
  try {
    const {
      name,
      specialization,
      email,
      phone,
      availabilityType,
      weeklySchedule,
      todaySchedule,
      universities,
    } = req.body;

    console.log("👉 Body received:", req.body);
    console.log("👉 File received:", req.file); 
    
    if (!name || !specialization || !email) {
      return res.status(400).json({
        success: false,
        message: "Name, specialization, and email are required",
      });
    }

    const existingDoctor = await Doctor.findOne({ email: email.toLowerCase() });
    if (existingDoctor) {
      return res.status(400).json({
        success: false,
        message: "Doctor with this email already exists",
      });
    }

    // Parse possible JSON fields
    const safeWeeklySchedule =
      weeklySchedule
        ? typeof weeklySchedule === "string"
          ? JSON.parse(weeklySchedule)
          : Array.isArray(weeklySchedule)
          ? weeklySchedule
          : []
        : [];

    const parsedTodaySchedule =
      todaySchedule
        ? typeof todaySchedule === "string"
          ? JSON.parse(todaySchedule)
          : todaySchedule
        : null;

    const safeTodaySchedule = parsedTodaySchedule
      ? {
          date: parsedTodaySchedule.date || new Date().toISOString().slice(0, 10),
          available: parsedTodaySchedule.available ?? false,
          slots: Array.isArray(parsedTodaySchedule.slots) ? parsedTodaySchedule.slots : [],
        }
      : { date: new Date().toISOString().slice(0, 10), available: false, slots: [] };

    const safeUniversities =
      universities
        ? typeof universities === "string"
          ? JSON.parse(universities)
          : Array.isArray(universities)
          ? universities
          : []
        : [];

    // Generate random password
    const rawPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const doctor = new Doctor({
      name,
      specialization,
      email: email.toLowerCase(),
      phone: phone || "",
      password: hashedPassword,
      role: "doctor",
      availabilityType: availabilityType || "both",
      weeklySchedule: safeWeeklySchedule,
      todaySchedule: safeTodaySchedule,
      universities: safeUniversities,
      dateSlots: new Map(), // Initialize empty dateSlots
      profileImage: req.file ? `${BASE_URL}/uploads/doctors/${req.file.filename}` : "",

    });

    await doctor.save();

    res.status(201).json({
      success: true,
      data: formatDoctorResponse(doctor),
      generatedPassword: rawPassword,
    });
  } catch (err) {
    console.error("Error creating doctor:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all doctors (admin)
router.get("/", async (req, res) => {
  try {
    const { specialization, availabilityType, search } = req.query;
    
    let filter = {};
    
    if (specialization) {
      filter.specialization = { $regex: specialization, $options: "i" };
    }
    
    if (availabilityType) {
      filter.availabilityType = availabilityType;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { specialization: { $regex: search, $options: "i" } }
      ];
    }

    const doctors = await Doctor.find(filter)
      .select('-password')
      .populate('universities', 'name')
      .sort({ createdAt: -1 });
    
    res.status(200).json({ 
      success: true, 
      data: doctors.map(formatDoctorResponse) 
    });
  } catch (err) {
    console.error("Error fetching doctors:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get doctors for student's university
router.get("/my-university",  authMiddleware, async (req, res) => {
  try {

    const student = await User.findById(req.userId).select("university");
            console.log(req.userId)

    if (!student || !student.university) {
      return res.status(404).json({ success: false, message: "Student's university not found" });
    }
    const doctors = await Doctor.find({ universities: student.university })
      .select('-password')
      .populate('universities', 'name');
    
    // Use Promise.all since formatDoctorResponse is now async
    const formattedDoctors = await Promise.all(doctors.map(formatDoctorResponse));
    
    res.status(200).json({ 
      success: true, 
      data: formattedDoctors
    });
  } catch (err) {
    console.error("Failed to fetch university doctors:", err);
    res.status(500).json({ success: false, message: "Failed to fetch university doctors" });
  }
});

// Get doctor by ID
router.get("/:id", validateObjectId, upload.single("profileImage"), async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .select('-password')
      .populate('universities', 'name');
    
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }
    
    res.status(200).json({ 
      success: true, 
      data: formatDoctorResponse(doctor) 
    });
  } catch (err) {
    console.error("Error fetching doctor:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update full doctor info

router.put("/:id", validateObjectId, upload.single("profileImage"), async (req, res) => {
  try {
    // req.body values will be strings if FormData is used, so be safe
    const {
      name,
      specialization,
      email,
      phone,
      availabilityType,
      weeklySchedule,
      todaySchedule,
      universities,
    } = req.body;

    // Validate required fields
    if (!name || !specialization || !email) {
      return res.status(400).json({
        success: false,
        message: "Name, specialization, and email are required",
      });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Check for email conflicts if email is changed
    if (email.toLowerCase() !== doctor.email) {
      const existingDoctor = await Doctor.findOne({ email: email.toLowerCase() });
      if (existingDoctor) {
        return res.status(400).json({
          success: false,
          message: "Doctor with this email already exists",
        });
      }
    }

    // ✅ Update fields safely
    doctor.name = name || doctor.name;
    doctor.specialization = specialization || doctor.specialization;
    doctor.email = email ? email.toLowerCase() : doctor.email;
    doctor.phone = phone || doctor.phone;
    doctor.availabilityType = availabilityType || doctor.availabilityType;

    // Parse weeklySchedule/universities if they come as JSON string from FormData
    if (weeklySchedule) {
      doctor.weeklySchedule =
        typeof weeklySchedule === "string"
          ? JSON.parse(weeklySchedule)
          : Array.isArray(weeklySchedule)
          ? weeklySchedule
          : doctor.weeklySchedule;
    }

    if (universities) {
      doctor.universities =
        typeof universities === "string"
          ? JSON.parse(universities)
          : Array.isArray(universities)
          ? universities
          : doctor.universities;
    }

    if (todaySchedule) {
      const parsedToday =
        typeof todaySchedule === "string"
          ? JSON.parse(todaySchedule)
          : todaySchedule;

      doctor.todaySchedule = {
        date: parsedToday.date || new Date().toISOString().slice(0, 10),
        available: parsedToday.available ?? false,
        slots: Array.isArray(parsedToday.slots) ? parsedToday.slots : [],
      };
    }

    // ✅ Handle new image if uploaded
    if (req.file) {
      doctor.imageUrl = `/uploads/doctors/${req.file.filename}`;
    }

    await doctor.save();

    res.status(200).json({
      success: true,
      data: formatDoctorResponse(doctor),
    });
  } catch (err) {
    console.error("Error updating doctor:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ NEW: Get all date slots for a doctor
router.get("/:id/all-slots", validateObjectId, async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    const allSlots = doctor.getAllDateSlots();
    res.json({ success: true, data: allSlots });
  } catch (error) {
    console.error("Error fetching all slots:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ✅ NEW: Update multiple date slots for a doctor
// ✅ Update multiple date slots for a doctor with availability check
router.patch("/:id/all-slots", validateObjectId, async (req, res) => {
  try {
    const { dateSlots, isAvailable } = req.body; // Accept isAvailable from frontend

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    if (isAvailable === "not_available") {
      // Clear all slots if doctor is marked as not available
      await doctor.updateMultipleDateSlots({});
      doctor.isAvailable = "not_available";
      await doctor.save();

      return res.json({ 
        success: true, 
        message: "Doctor marked as not available. All slots cleared.", 
        data: {}
      });
    }

    // Normal update when doctor is available
    if (!dateSlots || typeof dateSlots !== "object") {
      return res.status(400).json({ success: false, message: "Valid dateSlots object is required" });
    }

    await doctor.updateMultipleDateSlots(dateSlots);
    doctor.isAvailable = "available"; // Ensure status is updated
    await doctor.save();

    res.json({
      success: true,
      message: "Date slots updated successfully",
      data: doctor.getAllDateSlots()
    });

  } catch (error) {
    console.error("Error updating date slots:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});


// ✅ UPDATED: Get slots for a specific date (supports both old and new methods)
router.get("/:id/slots", validateObjectId, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, message: "date query parameter is required" });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    // Use the new method that checks dateSlots first, then falls back to old methods
    const slots = doctor.getAvailabilityForDate(date);

    res.status(200).json({ 
      success: true, 
      data: { date, slots } 
    });
  } catch (err) {
    console.error("Error fetching slots:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ UPDATED: Update slots for a specific date (supports new dateSlots method)
router.patch("/:id/slots", validateObjectId, async (req, res) => {
  try {
    const { date, slots } = req.body;
    
    if (!date) {
      return res.status(400).json({ success: false, message: "date is required" });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    // Use the new method to set slots for specific date
    await doctor.setSlotsForDate(date, slots || []);
    
    res.json({ 
      success: true, 
      message: "Slots updated successfully",
      data: { date, slots: doctor.getAvailabilityForDate(date) }
    });
  } catch (error) {
    console.error("Error updating slots:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ NEW: Clear slots for a specific date
router.delete("/:id/slots/:date", validateObjectId, async (req, res) => {
  try {
    const { date } = req.params;
    
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    await doctor.clearSlotsForDate(date);
    
    res.json({ 
      success: true, 
      message: "Slots cleared successfully"
    });
  } catch (error) {
    console.error("Error clearing slots:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ NEW: Get Doctor's availability for a specific date
router.get("/:id/availability/:date", validateObjectId, async (req, res) => {
  try {
    const { date } = req.params;
    const doctor = await Doctor.findById(req.params.id);
    
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    const availability = doctor.getAvailabilityForDate(date);
    
    res.json({
      success: true,
      data: {
        doctorId: doctor._id,
        doctorName: doctor.name,
        date: date,
        slots: availability
      }
    });
  } catch (error) {
    console.error("Error fetching availability for date:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ NEW: Get Doctor's availability for today
router.get("/:id/availability", validateObjectId, async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    const availability = doctor.getTodaysAvailability();
    
    res.json({
      success: true,
      data: {
        doctorId: doctor._id,
        doctorName: doctor.name,
        date: new Date().toISOString().split("T")[0],
        slots: availability
      }
    });
  } catch (error) {
    console.error("Error fetching availability:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ NEW: Get upcoming availability for next N days
router.get("/:id/upcoming-availability", validateObjectId, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const doctor = await Doctor.findById(req.params.id);
    
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    const upcomingAvailability = doctor.getUpcomingAvailability(parseInt(days));
    
    res.json({
      success: true,
      data: {
        doctorId: doctor._id,
        doctorName: doctor.name,
        upcomingSlots: upcomingAvailability
      }
    });
  } catch (error) {
    console.error("Error fetching upcoming availability:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ NEW: Book a specific slot
router.patch("/:id/book-slot", validateObjectId, async (req, res) => {
  try {
    const { date, startTime, endTime } = req.body;
    
    if (!date || !startTime || !endTime) {
      return res.status(400).json({ 
        success: false, 
        message: "date, startTime, and endTime are required" 
      });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    const booked = await doctor.bookSlot(date, startTime, endTime);
    
    if (booked) {
      res.json({ 
        success: true, 
        message: "Slot booked successfully" 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: "Slot not available or not found" 
      });
    }
  } catch (error) {
    console.error("Error booking slot:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ NEW: Unbook a specific slot
router.patch("/:id/unbook-slot", validateObjectId, async (req, res) => {
  try {
    const { date, startTime, endTime } = req.body;
    
    if (!date || !startTime || !endTime) {
      return res.status(400).json({ 
        success: false, 
        message: "date, startTime, and endTime are required" 
      });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    const unbooked = await doctor.unbookSlot(date, startTime, endTime);
    
    if (unbooked) {
      res.json({ 
        success: true, 
        message: "Slot unbooked successfully" 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: "Slot was not booked or not found" 
      });
    }
  } catch (error) {
    console.error("Error unbooking slot:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update today's availability only (backward compatibility)
router.patch("/:id/today", validateObjectId, async (req, res) => {
  try {
    const { available, slots } = req.body;
    if (available === undefined) {
      return res.status(400).json({ success: false, message: "available is required" });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    doctor.todaySchedule = {
      date: new Date().toISOString().slice(0, 10),
      available,
      slots: available && Array.isArray(slots) ? slots : [],
    };

    await doctor.save();
    res.status(200).json({ 
      success: true, 
      data: formatDoctorResponse(doctor) 
    });
  } catch (err) {
    console.error("Error updating today's schedule:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete doctor
router.delete("/:id", validateObjectId, async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndDelete(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }
    res.status(200).json({ success: true, message: "Doctor deleted successfully" });
  } catch (err) {
    console.error("Error deleting doctor:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/doctors/:id/available-dates?days=14
// router.get("/:id/available-dates", validateObjectId, async (req, res) => {
//   try {
//     const days = parseInt(req.query.days, 10) || 14;
//     const doctor = await Doctor.findById(req.params.id).select("-password");
//     if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });

//     // Use the new helper (or existing one you already have)
//     const grouped = doctor.getAvailableDates ? doctor.getAvailableDates(days) : doctor.getAllDateSlots ? doctor.getAllDateSlots() : (doctor.dateSlots || doctor.slots || {});
//     // Ensure sorted ascending by date
//     const sortedDates = Object.keys(grouped).sort((a,b) => new Date(a) - new Date(b));
//     const availableDates = sortedDates.map(date => ({ date, slots: grouped[date] || [] }));

//     res.json({ success: true, data: availableDates });
//   } catch (err) {
//     console.error("Error fetching available dates:", err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// });


router.get("/:id/available-dates", validateObjectId, async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 14;
    const doctor = await Doctor.findById(req.params.id).select("-password");

    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    // ✅ Get booked sessions for this doctor
    const bookedSessions = await Session.find({
      doctorId: doctor._id,
      status: { $ne: "cancelled" },
    }).lean();

    // ✅ Logged-in user (Vansh's ID, for example)
    const userId = req.userId;

    // --- START: LOGIC FOR GLOBAL 2-SESSION LIMIT PER USER ---
    let userTotalActiveSessions = 0;
    let earliestActiveSessionDate = null;

    if (userId) {
      // **CRITICAL: This filter ensures only the CURRENT USER'S sessions are counted.**
      const userActiveSessions = bookedSessions.filter(
        (s) => String(s.userId) === String(userId)
      );

      userTotalActiveSessions = userActiveSessions.length;

      // Find the earliest future session date for the current user
      for (const s of userActiveSessions) {
        const sessionDate = new Date(s.slotStart);
        sessionDate.setHours(0, 0, 0, 0);

        if (!earliestActiveSessionDate || sessionDate < earliestActiveSessionDate) {
          earliestActiveSessionDate = sessionDate;
        }
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ✅ Implement the global block rule:
    let blockedUntilDate = null;

    if (
      userId &&
      userTotalActiveSessions >= 2 &&
      earliestActiveSessionDate &&
      today <= earliestActiveSessionDate
    ) {
      blockedUntilDate = earliestActiveSessionDate;

      // Global block response: no available slots at all
      return res.json({
        success: true,
        data: [], // no available slots at all
        blockedUntil: blockedUntilDate.toISOString().split("T")[0],
        message: `You already have ${userTotalActiveSessions} sessions booked. You can book again starting the day after your earliest session on ${blockedUntilDate.toISOString().split("T")[0]}.`,
      });
    }

    // --- END: LOGIC FOR GLOBAL 2-SESSION LIMIT PER USER ---

    // ✅ Build lookup for booked slots (for all users, to block the doctor's slots)
    const bookedMap = new Set(
      bookedSessions.map((s) => {
        const dt = new Date(s.slotStart);
        dt.setSeconds(0, 0);
        return dt.toISOString();
      })
    );

    // ✅ Get doctor’s slots
    const grouped =
      doctor.getAvailableDates?.(days) ??
      doctor.getAllDateSlots?.() ??
      doctor.dateSlots ??
      doctor.slots ??
      {};

    const sortedDates = Object.keys(grouped).sort(
      (a, b) => new Date(a) - new Date(b)
    );

    // ✅ Otherwise, show normal available slots
    const availableDates = sortedDates
      .filter((date) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);

        // 🚫 Past dates
        if (d < today) return false;

        return true;
      })
      .map((date) => {
        const slots = grouped[date] || [];

        const freeSlots = slots.filter((slot) => {
          const startTime =
            slot.startTime || slot.start || slot.slotStart || slot.time;
          if (!startTime) return false;

          const slotDateTime = new Date(`${date}T${startTime}:00`);
          if (isNaN(slotDateTime)) return false;

          slotDateTime.setSeconds(0, 0);
          const slotISO = slotDateTime.toISOString();

          // This blocks slots booked by ANY user
          return !bookedMap.has(slotISO) && slot.isAvailable !== false;
        });

        return { date, slots: freeSlots };
      })
      .filter((entry) => entry.slots.length > 0);

    // ✅ Response
    res.json({
      success: true,
      data: availableDates,
      blockedUntil: null,
    });
  } catch (err) {
    console.error("Error fetching available dates:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// routes/doctors.js
router.get("/:id/available-dates/employee", async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 14;
    const doctor = await Doctor.findById(req.params.id).select("-password");
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });

    // 🩺 Get all booked sessions (excluding cancelled)
    const bookedSessions = await Session.find({
      doctorId: doctor._id,
      status: { $ne: "cancelled" },
    }).lean();

    // Create a Set of all booked slot start times (ISO)
    const bookedMap = new Set(
      bookedSessions.map((s) => new Date(s.slotStart).toISOString())
    );

    // 🗓️ Get doctor’s defined slots (assuming doctor.slots or doctor.getAvailableDates())
    const grouped =
      doctor.getAvailableDates?.(days) ??
      doctor.dateSlots ??
      doctor.slots ??
      {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sortedDates = Object.keys(grouped).sort(
      (a, b) => new Date(a) - new Date(b)
    );

    // 🧮 Filter out booked slots and past dates
    const availableDates = sortedDates
      .filter((date) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d >= today;
      })
      .map((date) => {
        const slots = grouped[date] || [];
        const freeSlots = slots.filter((slot) => {
          const startTime =
            slot.startTime || slot.start || slot.slotStart || slot.time;
          if (!startTime) return false;

          const slotDateTime = new Date(`${date}T${startTime}:00`);
          if (isNaN(slotDateTime)) return false;

          return !bookedMap.has(slotDateTime.toISOString());
        });

        return { date, slots: freeSlots };
      })
      .filter((entry) => entry.slots.length > 0);

    res.json({ success: true, data: availableDates });
  } catch (err) {
    console.error("Error fetching available dates:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
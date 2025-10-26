import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import jwt from "jsonwebtoken";

import employeeQuestionnaireRoutes from "./routes/employeeQuestionnaireRoutes.js";
import authRoutes from "./routes/auth.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import doctorRoutes from "./routes/doctorRoutes.js";
import User from "./models/User.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import assessmentsRoute from "./routes/assessments.js";
import reportRoutes from "./routes/reportRoutes.js";
import CompanyRoute from "./routes/CompanyRoute.js";
import employeeAuthRoutes from "./routes/employeeAuthRoutes.js";


import path from "path";
import { fileURLToPath } from "url";

// ✅ for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(express.json());
// app.use(cors({
//   origin: process.env.CLIENT_URL || "*",
//   credentials: true
// }));
 app.use(cors())
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// --------------------
// Auth Middleware
// --------------------
export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>
  if (!token) return res.status(401).json({ success: false, message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id || decoded._id;
    req.userRole = (decoded.role || "").toLowerCase();
    next();
  } catch (err) {
    
    return res.status(403).json({ success: false, message: "Invalid or expired token" });
  }
};

// Middleware factory to restrict access by role
// This middleware can check for multiple roles.
export const requireRole = (roles) => (req, res, next) => {
  // Ensure roles is always an array and convert them to lowercase for consistency
  const allowedRoles = Array.isArray(roles) ? roles.map(r => r.toLowerCase()) : [roles.toLowerCase()];

  // Check if the user's role is in the list of allowed roles
  if (!allowedRoles.includes(req.userRole)) {
    return res.status(403).json({ success: false, message: "Access denied: insufficient permissions" });
  }
  next();
};

// --------------------
// Routes
// --------------------
app.use("/api/auth", authRoutes);
app.use("/api/sessions", authMiddleware, sessionRoutes);
app.use("/api/doctors",doctorRoutes); // auth handled inside doctor.routes if needed
app.use("/api/appointments", authMiddleware, appointmentRoutes);
app.use("/api/admin", authMiddleware, adminRoutes);
app.use("/api/assessments", assessmentsRoute);
app.use("/api/reports", reportRoutes);
app.use("/api/companies", CompanyRoute);
app.use("/api/employee", employeeAuthRoutes);
app.use("/api/employee-questionnaire", employeeQuestionnaireRoutes);




// Get logged-in user info
app.get("/api/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("name email role university");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/check",async(req,res)=> {
      res.status(500).json({ success: true, message: "Backend is running" });

})
// --------------------
// MongoDB Connection & Server Start
// --------------------
const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.listen(PORT,"0.0.0.0", () => console.log(`Server running on port ${PORT}`));

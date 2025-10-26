import express from "express";
import EmployeeQuestionnaire from "../models/EmployeeQuestionnaire.js";
import jwt from "jsonwebtoken";

// Auth middleware
export const authMiddleware = (req, res, next) => {
  // Get token from headers (Authorization: Bearer <token>)
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_secret_key");
    req.userId = decoded.id; // attach user ID to request
    req.userRole = decoded.role || "employee"; // optional role
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: "Invalid or expired token" });
  }
};

const router = express.Router();

// Save questionnaire
router.post("/", async (req, res) => {
  try {
    const data = req.body;
    const questionnaire = new EmployeeQuestionnaire({
      userId: req.userId,
      ...data,
    });
    await questionnaire.save();
    res.json({ success: true, message: "Questionnaire saved!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

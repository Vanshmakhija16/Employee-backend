import express from "express";
import mongoose from "mongoose";

const router = express.Router();

// Mongoose model for storing user assessment responses (create this model)
const UserAssessment = mongoose.model(
  "UserAssessment",
  new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assessmentSlug: { type: String, required: true },
    statusCategory: { type: String, enum: ["lowRisk", "moderateRisk", "highRisk"], required: true },
    createdAt: { type: Date, default: Date.now },
  })
);

// GET /api/reports/summary
router.get("/summary", async (req, res) => {
  try {
    // Aggregate counts of statusCategory by assessmentSlug
    const results = await UserAssessment.aggregate([
      {
        $group: {
          _id: { assessmentSlug: "$assessmentSlug", category: "$statusCategory" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Reshape data as array of objects per assessment
    const summary = {};

    results.forEach(({ _id, count }) => {
      const { assessmentSlug, category } = _id;
      if (!summary[assessmentSlug]) summary[assessmentSlug] = { assessment: assessmentSlug, lowRisk: 0, moderateRisk: 0, highRisk: 0 };
      summary[assessmentSlug][category] = count;
    });

    // Return as array
    const response = Object.values(summary);

    res.json(response);
  } catch (err) {
    console.error("Error fetching report summary:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    assessmentSlug: { type: String, required: true }, // to identify which assessment
    assessmentTitle: { type: String },                // e.g. "Stress Assessment"
    name: { type: String, default: "Guest User" },    // optional - user name
    score: { type: Number, required: true },          // total score
    maxScore: { type: Number, required: true },       // maximum possible score
    percentage: { type: Number, required: true },     // derived percentage
    status: { type: String },                         // e.g. "High Stress", "Low Anxiety"
    message: { type: String },                        // custom feedback text
  },
  { timestamps: true } // will automatically add createdAt, updatedAt
);

export default mongoose.model("Report", reportSchema);

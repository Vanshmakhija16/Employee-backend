import mongoose from "mongoose";

const universitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    domainPatterns: {
      type: [String], // Official email domains associated with the university
      default: [],
    }
    // No need to store doctors here; handled in Doctor.universities
  },
  { timestamps: true }
);

const University = mongoose.model("University", universitySchema);
export default University;

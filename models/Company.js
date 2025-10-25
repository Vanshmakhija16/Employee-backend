import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    domainPatterns: {
      type: [String],
      default: [],
    },
    doctors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Doctor", // <-- must match your Doctor model name
      },
    ],
  },
  { timestamps: true }
);

const Company = mongoose.model("Company", companySchema);
export default Company;

import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    slotStart: {
      type: Date,
      required: true,
    },
    slotEnd: {
      type: Date,
      required: true,
    },
    mode: {
      type: String,
      enum: ["Online", "Offline"],
      required: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["booked", "completed", "cancelled"], // simplified
      default: "booked",
    },
    allottedDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Virtual field
sessionSchema.virtual("isBooked").get(function () {
  return this.status === "booked";
});

// Prevent OverwriteModelError
const Session = mongoose.models.Session || mongoose.model("Session", sessionSchema);
export default Session;

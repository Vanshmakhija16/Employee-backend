import mongoose from "mongoose";

const EmployeeAppointmentSchema = new mongoose.Schema(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    slotStart: { type: Date, required: true },
    slotEnd: { type: Date, required: true },
    notes: { type: String },
    mode: { type: String, enum: ["online", "offline"], default: "online" },
  },
  { timestamps: true }
);

export default mongoose.model("EmployeeAppointment", EmployeeAppointmentSchema);

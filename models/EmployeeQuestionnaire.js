import mongoose from "mongoose";


const questionnaireSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },

  fullName: String,
  nickname: String,
  dob: Date,
  gender: String,
  pronouns: String,
  pronounsCustom: String,

  email: String,
  phone: String,
  country: String,
  city: String,

  education: String,
  occupation: String,
  industry: String,
  employmentStatus: String,

  languages: String,
  maritalStatus: String,
  children: String,
  interests: String,

  purpose: [String],
  heardFrom: String,
}, { timestamps: true });

export default mongoose.model("EmployeeQuestionnaire", questionnaireSchema);

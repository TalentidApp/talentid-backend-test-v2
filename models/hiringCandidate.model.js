import mongoose from "mongoose";
import { hiringCandidateStatus } from "../utils/data.js";

const hiringCandidateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String },
  phoneNo: {
    type: String,
    validate: {
      validator: function (v) {
        return /^\+?[1-9]\d{1,14}$/.test(v); 
      },
      message: props => `${props.value} is not a valid phone number!`
    }
  },
  links: [{ name: String, url: String }],
  address: { type: String },
  status: {
    type: String,
    enum: Object.values(hiringCandidateStatus),
    default: hiringCandidateStatus.pending
  },
  skills: [{ type: String }],
  experience: { type: String },
  educationCollege: { type: String },
  educationDegree: { type: String },
  resumeLink: { type: String },
  role: {
    type: String,
    default: "Candidate",
  },
  offers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Offer" }],
  otp: { type: String },
  otpExpires: { type: Date },
  resetPasswordToken: { type: String },
  resetPasswordTokenExpires: { type: Date }
}, { timestamps: true });

const HiringCandidate = mongoose.model("HiringCandidate", hiringCandidateSchema);

export default HiringCandidate;
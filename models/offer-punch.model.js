import mongoose from "mongoose";


const offerPunchSchema = new mongoose.Schema(
  {
    jobTitle: { type: String, required: true },
    candidateName: { type: String, required: true },
    candidateEmail: { type: String, required: true },
    candidatePhoneNo: { type: String },
    companyName: { type: String, required: true },
    joiningDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    offerLetter: { type: String, required: true }, 
    candidateResume: { type: String, required: true },
    offerLetterStatus: {
      type: String,
      enum: ["Offer letter released", "Candidate verbal commitment"],
      required: true,
    },
    hr: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Rejected", "Retracted"],
      default: "Pending",
    },
    showOffer: { type: Boolean, default: true }, 
  },
  { timestamps: true }
);

const OfferPunch = mongoose.model("OfferPunch", offerPunchSchema);

export default OfferPunch;
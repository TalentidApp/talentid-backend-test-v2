import mongoose from "mongoose";
import { signing_status } from "../utils/data.js";

const offerSchema = new mongoose.Schema(
  {
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: "HiringCandidate", required: true },
    hr: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    jobTitle: { type: String, required: true },
    salary: { type: Number },
    benefits: { type: String },
    offerDate: { type: Date, default: Date.now },
    expirationDate: { type: Date },
    additionalNotes: { type: String },
    offerLetterLink: { type: String },
    unsignedOfferLetterLink: { type: String },
    signedOfferLetterLink: { type: String },
    isEngagementStart: { type: Boolean, default: false },
    companyName : { type : String , required : false},
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Declined", "OnBoarding", "Ghosted", "Expired", "Retracted"],
      default: "Pending",
    },
    joiningDate: { type: Date },
        currentCTC: { type: Number, default: 0 },
    offerLetterStatus: {
      type: String,
      enum: ["Offer letter released", "Candidate verbal commitment", "Talentid"],
      default: "Talentid",
    },
    acceptedLetter: { type: String },
    digioDocumentId: { type: String },
    signingPartyEmail: { type: String },

    signingStatus: {
      type: String,
      enum: Object.values(signing_status),
      default: "requested",
    },
    authenticationUrl: { type: String },
    signingRequestedOn: { type: Date },
    signingExpiresOn: { type: Date },
    showOffer: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Offer = mongoose.model("Offer", offerSchema);

export default Offer;
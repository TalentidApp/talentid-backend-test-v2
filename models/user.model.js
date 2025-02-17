
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullname: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    company: { type: String, required: true },
    role: {
      type: String,
      enum: ["Admin", "User", "Corporate HR", "HR Agency", "Others"],
      required: true,
    },
    password: { type: String, minLength: 8, required: true },
    additionalDetails: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdditionalDetails",
    },
    isEmailVerified: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    credits: { type: Number, default: 100 },
    userImage: { type: String },
    token: {
      type: String,
      expires: {
        type: Date,
        default: () => new Date(Date.now() + 5 * 60 * 60 * 1000), // 5 hours expiry
      },
    },
    resetPasswordToken: { type: String },
    resetPasswordTokenExpires: {
      type: Date,
      default: () => new Date(Date.now() + 5 * 60 * 1000), // 5 minutes expiry
    },
    searchHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Candidate" }],
    // HiringCandidate: [{ type: mongoose.Schema.Types.ObjectId, ref: "HiringCandidate" }],
    OfferReleases: { type: Number, default: 0 },

    // New Fields
    companySize: { type: String, enum: ["Startup", "Small", "Medium", "Large"], default: "Small" },
    industry: { type: String, },
    designation: { type: String,  },

    offerLettersSent: { type: Number, default: 0 },

    subscriptionPlan: { type: String, enum: ["Free", "Basic", "Pro", "Enterprise"], default: "Free" },
    subscriptionExpiry: { type: Date },

    activityLogs: [{ action: String, timestamp: { type: Date, default: Date.now } }]
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;

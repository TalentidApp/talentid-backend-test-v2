import mongoose from "mongoose";

import { company_size_value, user_role } from "../utils/data.js";
import { subscriptionPlan_values } from "../utils/data.js";

const userSchema = new mongoose.Schema(
  {
    fullname: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    company: { type: String, required: true },
    role: {
      type: String,
      enum: Object.values(user_role),
      required: true,
    },
    password: { type: String, minLength: 8, required: true },

    // Fields that should not exist for Admin
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
    offerLettersSent: { type: Number, default: 0 },
    OfferReleases: { type: Number, default: 0 },

    companySize: { type: String, enum: Object.values(company_size_value), default: company_size_value.Small },
    industry: { type: String },
    designation: { type: String },

    subscriptionPlan: { type: String, enum: Object.values(subscriptionPlan_values), default: "Free" },
    subscriptionExpiry: { type: Date },

    activityLogs: [{ action: String, timestamp: { type: Date, default: Date.now } }]
  },
  { timestamps: true }
);

// Middleware to remove extra fields for Admin
userSchema.pre("save", function (next) {
  if ([user_role.Sub_Admin, user_role.Super_Admin].includes(this.role)) {
    this.additionalDetails = undefined;
    this.isEmailVerified = undefined;
    this.isVerified = undefined;
    this.credits = undefined;
    this.userImage = undefined;
    this.token = undefined;
    this.resetPasswordToken = undefined;
    this.resetPasswordTokenExpires = undefined;
    this.searchHistory = undefined;
    this.offerLettersSent = undefined;
    this.OfferReleases = undefined;
    this.companySize = undefined;
    this.industry = undefined;
    this.designation = undefined;
    this.subscriptionPlan = undefined;
    this.subscriptionExpiry = undefined;
    this.activityLogs = undefined;
  }
  next();
});

const User = mongoose.model("User", userSchema);

export default User;

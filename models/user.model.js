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
    documents: { type: String },
    verifiedDocuments: {
      type: Boolean,
      default: false,
    },
    additionalDetails: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdditionalDetails",
    },
    isEmailVerified: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    credits: { type: Number, default: 100 },
    userImage: { type: String },
    otp: {
      type: String,
      default: "",
    },
    otpExpires: {
      type: Date,
      default: null,
    },
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
    offerPunches: [{ type: mongoose.Schema.Types.ObjectId, ref: "OfferPunch" }],
    ghostingCount: { type: Number, default: 0 },
    companySize: {
      type: String,
      enum: Object.keys(company_size_value),
      default: "Small",
    },
    industry: { type: String },
    designation: { type: String },
    subscriptionPlan: {
      type: String,
      enum: Object.values(subscriptionPlan_values),
      default: "Free",
    },
    subscriptionExpiry: { type: Date },
    teams: [{ type: mongoose.Schema.Types.ObjectId, ref: "Team" }],
    notificationPreferences: {
      masterToggle: { type: Boolean, default: true },
      specificNotifications: [
        {
          type: { type: String },
          emailEnabled: { type: Boolean, default: true },
        },
      ],
    },
    inviteLinks: [
      {
        email: { type: String },
        type: {
          type: String,
          enum: ["invite", "view"],
          required: true,
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    activityLogs: [{ action: String, timestamp: { type: Date, default: Date.now } }],
  },
  { timestamps: true }
);

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
    this.offerPunches = undefined;
    this.ghostingCount = undefined;
    this.companySize = undefined;
    this.industry = undefined;
    this.designation = undefined;
    this.subscriptionPlan = undefined;
    this.subscriptionExpiry = undefined;
    this.activityLogs = undefined;
    this.notificationPreferences = undefined;
    this.teams = undefined;
    this.inviteLinks = undefined;
    this.documents = undefined;
    this.verifiedDocuments = undefined;
  }
  next();
});

const User = mongoose.model("User", userSchema);

export default User;
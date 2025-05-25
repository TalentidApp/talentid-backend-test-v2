import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "reviewerModel",
    },
    reviewerModel: {
      type: String,
      required: true,
      enum: ["User", "HiringCandidate", "Company"],
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "recipientModel",
    },
    recipientModel: {
      type: String,
      required: true,
      enum: ["HiringCandidate", "Company"],
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false, // Optional, included when reviewer is User
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Feedback", feedbackSchema);
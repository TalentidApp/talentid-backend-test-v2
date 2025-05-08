import Feedback from "../models/feedback.model.js";
import User from "../models/user.model.js";
import HiringCandidate from "../models/hiringCandidate.model.js";

export const submitFeedback = async (req, res) => {
  try {
    const { reviewerId, reviewerModel, recipientId, recipientModel, rating, comment } = req.body;

    if (!["User", "HiringCandidate"].includes(reviewerModel) || !["User", "HiringCandidate"].includes(recipientModel)) {
      return res.status(400).json({ message: "Invalid reviewer or recipient model" });
    }

    if (reviewerId === recipientId && reviewerModel === recipientModel) {
      return res.status(400).json({ message: "Cannot submit feedback to self" });
    }

    const reviewer = await (reviewerModel === "User" ? User : HiringCandidate).findById(reviewerId);
    if (!reviewer) {
      return res.status(404).json({ message: `${reviewerModel} not found` });
    }

    const recipient = await (recipientModel === "User" ? User : HiringCandidate).findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: `${recipientModel} not found` });
    }

    const feedback = new Feedback({
      reviewer: reviewerId,
      reviewerModel,
      recipient: recipientId,
      recipientModel,
      rating,
      comment: comment || "",
    });

    await feedback.save();

    await (recipientModel === "User" ? User : HiringCandidate).findByIdAndUpdate(
      recipientId,
      { $push: { feedbackReceived: feedback._id } },
      { new: true }
    );

    await (reviewerModel === "User" ? User : HiringCandidate).findByIdAndUpdate(
      reviewerId,
      { $push: { feedbackGiven: feedback._id } },
      { new: true }
    );

    res.status(201).json({ message: "Feedback submitted successfully", feedback });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getFeedback = async (req, res) => {
  try {
    const { recipientId, recipientModel } = req.params;

    if (!["User", "HiringCandidate"].includes(recipientModel)) {
      return res.status(400).json({ message: "Invalid recipient model" });
    }

    const feedback = await Feedback.find({ recipient: recipientId, recipientModel })
      .populate("reviewer", "fullname name email")
      .lean();

    res.status(200).json({ feedback });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
import Feedback from "../models/feedback.model.js";
import HiringCandidate from "../models/hiringCandidate.model.js";
import Company from "../models/company.model.js";
import User from  "../models/user.model.js";

export const submitFeedback = async (req, res) => {
  try {
    const { reviewerId, reviewerModel, recipientId, recipientModel, companyId, rating, comment } = req.body;

    if (!reviewerId || !reviewerModel || !recipientId || !recipientModel || !rating) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (reviewerId === recipientId && reviewerModel === recipientModel) {
      return res.status(400).json({ message: "Cannot submit feedback to self" });
    }

    const feedback = new Feedback({
      reviewerId,
      reviewerModel,
      recipientId,
      recipientModel,
      companyId: companyId || null,
      rating,
      comment,
    });

    await feedback.save();

    // Update recipient's feedbackReceived
    const recipientModelRef = recipientModel === "HiringCandidate" ? HiringCandidate : Company;
    await recipientModelRef.findByIdAndUpdate(recipientId, {
      $push: { feedbackReceived: feedback._id },
    });

    // Update reviewer's feedbackGiven
    const reviewerModelRef = reviewerModel === "User" ? User: reviewerModel === "HiringCandidate" ? HiringCandidate : Company;
    await reviewerModelRef.findByIdAndUpdate(reviewerId, {
      $push: { feedbackGiven: feedback._id },
    });

    res.status(201).json({ message: "Feedback submitted successfully", feedback });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getFeedback = async (req, res) => {
  try {
    const { recipientModel, recipientId } = req.params;

    if (!["HiringCandidate", "Company"].includes(recipientModel)) {
      return res.status(400).json({ message: "Invalid recipient model" });
    }

    const feedback = await Feedback.find({ recipientId, recipientModel })
      .populate("reviewerId", "name email companyName")
      .lean();

    res.status(200).json({ feedback });
  } catch (error) {
    console.error("Error fetching feedback:", error);
    res.status(500).json({ message: "Server error" });
  }
};
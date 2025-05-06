import express from "express";
import OfferPunch from "../models/offer-punch.model.js";
import User from "../models/user.model.js";
import UploadImageToCloudinary from "../utils/uploadImageToCloudinary.js";
import mongoose from "mongoose";


const createOfferPunch = async (req, res) => {
    try {
      const {
        jobTitle,
        candidateName,
        candidateEmail,
        candidatePhoneNo,
        companyName,
        joiningDate,
        expiryDate,
        offerLetter, // Base64 string
        candidateResume, // Base64 string
        offerLetterStatus,
        status, // Add status to req.body (optional, defaults to "Pending")
      } = req.body;
  
      const hrId = req.user.id;
  
      if (!hrId || !jobTitle || !joiningDate || !expiryDate || !candidateEmail || !offerLetterStatus) {
        return res.status(400).json({ message: "Missing required fields" });
      }
  
      if (!offerLetter || !candidateResume) {
        return res.status(400).json({ message: "Offer letter and resume are required" });
      }
  
      const offerLetterBuffer = Buffer.from(offerLetter.split(",")[1], "base64");
      const candidateResumeBuffer = Buffer.from(candidateResume.split(",")[1], "base64");
  
      const offerLetterResult = await UploadImageToCloudinary(offerLetterBuffer, "offer_letters");
      const candidateResumeResult = await UploadImageToCloudinary(candidateResumeBuffer, "resumes");
  
      const offerPunch = new OfferPunch({
        jobTitle,
        candidateName,
        candidateEmail,
        candidatePhoneNo,
        companyName,
        joiningDate,
        expiryDate,
        offerLetter: offerLetterResult.secure_url,
        candidateResume: candidateResumeResult.secure_url,
        offerLetterStatus,
        hr: hrId,
        status: status || "Pending", // Default to "Pending" if not provided
      });
  
      await offerPunch.save();
  
      // Update User: increment offerLettersSent, push offerPunch, and increment ghostingCount if "Ghosted"
      const updateFields = {
        $inc: { offerLettersSent: 1 },
        $push: { offerPunches: offerPunch._id },
      };
      if (status === "Ghosted") {
        updateFields.$inc.ghostingCount = 1;
      }
      await User.findByIdAndUpdate(hrId, updateFields, { new: true });
  
      res.status(201).json({ message: "Offer punch created successfully", offerPunch });
    } catch (error) {
      console.error("Error creating offer punch:", error.message);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  };

  const getOfferPunches = async (req, res) => {
    try {
      const hrId = req.user.id;
      const offerPunches = await OfferPunch.find({ hr: hrId });
      res.status(200).json(offerPunches);
    } catch (error) {
      console.error("Error fetching offer punches:", error.message);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  };


export { createOfferPunch , getOfferPunches};
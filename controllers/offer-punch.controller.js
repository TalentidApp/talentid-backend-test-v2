import Offer from "../models/offer.model.js";
import HiringCandidate from "../models/hiringCandidate.model.js";
import upload from "../utils/upload.js";
import { sendMail } from "../utils/mail.js";

import cloudinary from '../config/cloudinary.js';

import mongoose from "mongoose";

const createOffer = async (req, res) => {

    const session = await mongoose.startSession(); // Start a transaction session
    session.startTransaction(); // Begin transaction

    try {
        const {
            jobTitle,
            joiningDate,
            expiryDate,
            candidateEmail,
            candidateName,
            candidatePhoneNo,
            companyName,
            offerLetterStatus
        } = req.body;

        const hrId = req.user.id;

        // Ensure required fields are present

        if (!hrId || !jobTitle || !joiningDate || !expiryDate || !candidateEmail || !offerLetterStatus) {
            throw new Error("Missing required fields");
        }

        // Check if files were uploaded

        if (!req.files || !req.files.offerLetter || !req.files.candidateResume) {
            throw new Error("Offer letter and candidate resume are required");
        }

        // Extract file URLs from Cloudinary
        const offerLetterLink = req.files.offerLetter[0].path;
        const candidateResumeLink = req.files.candidateResume[0].path;

        console.log("Uploaded Offer Letter:", offerLetterLink);
        console.log("Uploaded Candidate Resume:", candidateResumeLink);

        // Check if candidate exists
        let candidate = await HiringCandidate.findOne({ email: candidateEmail }).session(session);

        if (!candidate) {
            candidate = new HiringCandidate({
                name: candidateName || "Unknown",
                email: candidateEmail,
                phoneNo: candidatePhoneNo || "",
                resumeLink: candidateResumeLink,
                offers: [],
            });

            await candidate.save({ session });

        } else {
            if (!candidate.resumeLink) {
                candidate.resumeLink = candidateResumeLink;
            }
        }

        // Create Offer
        const newOffer = new Offer({
            hr: hrId,
            candidate: candidate._id,
            jobTitle,
            offerLetterLink,
            joiningDate,
            offerLetterStatus,
            expirationDate: expiryDate,
        });

        await newOffer.save({ session });

        // Update candidate with offer reference
        candidate.offers.push(newOffer._id);
        await candidate.save({ session });

        const populatedOffer = await Offer.findById(newOffer._id)
            .populate('candidate')  // Populates the 'candidate' field
            .exec();

        // Commit the transaction (if everything is successful)
        await session.commitTransaction();
        session.endSession();

        res.status(201).json({ message: "Offer created successfully", offer: populatedOffer });

    } catch (error) {
        // Rollback any changes if an error occurs
        await session.abortTransaction();
        session.endSession();

        console.error("Error in createOffer:", error);
        res.status(500).json({ error: error.message });
    }
};


export default createOffer;
import Offer from "../models/offer.model.js";
import HiringCandidate from "../models/hiringCandidate.model.js";
import upload from "../utils/upload.js";
import { sendMail } from "../utils/mail.js";

import cloudinary from '../config/cloudinary.js';

import mongoose from "mongoose";

import axios from "axios";

import User from "../models/user.model.js";

import { downloadPDF } from "../utils/downloadPdf.js";

import UploadImageToCloudinary from "../utils/uploadImageToCloudinary.js";

import FormData from "form-data";
import fs from "fs";


async function fetchSkillsFromExternalApi(resumeFile) {
    try {
        if (!fs.existsSync(resumeFile.tempFilePath)) {
            throw new Error("Temp file does not exist.");
        }

        const fileBuffer = fs.readFileSync(resumeFile.tempFilePath);
        if (!fileBuffer || fileBuffer.length === 0) {
            throw new Error("Temp file is empty.");
        }

        const formData = new FormData();
        formData.append("resume", fileBuffer, {
            filename: resumeFile.name,
            contentType: resumeFile.mimetype,
        });

        // Calculate Content-Length
        const contentLength = await new Promise((resolve, reject) => {
            formData.getLength((err, length) => {
                if (err) reject(err);
                else resolve(length);
            });
        });

        const response = await axios.post("http://localhost:3001/upload", formData, {
            headers: {
                ...formData.getHeaders(),
                "Content-Length": contentLength,
            },
            maxBodyLength: Infinity, // Allow large files
        });

        console.log("Response data:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error fetching skills from external API:", error.response?.data || error.message);
        return [];
    }
}







const createOffer = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const {
            jobTitle,
            salary,
            joiningDate,
            expiryDate,
            emailSubject,
            emailMessage,
            candidateEmail,
            candidateName,
            candidatePhoneNo,
            companyName,
        } = req.body;

        const hrId = req.user?.id;
        if (!hrId) {
            return res.status(401).json({ error: "HR ID is missing. Unauthorized access." });
        }

        // Validate required fields
        if (!jobTitle || !joiningDate || !expiryDate || !emailSubject || !emailMessage || !candidateEmail) {
            return res.status(400).json({ error: "Missing required fields." });
        }

        // Validate file uploads
        if (!req.files?.offerLetter || !req.files?.candidateResume) {
            return res.status(400).json({ error: "Offer letter and candidate resume are required." });
        }

        console.log("Offer letter files:", req.files.offerLetter);
        console.log("Candidate resume files:", req.files.candidateResume);

        let offerLetterLink, candidateResumeLink;
        let extractedSkills = [];

        // Upload offer letter
        try {
            const offerLetterUpload = await UploadImageToCloudinary(req.files.offerLetter, "Candidate_Offer_Letter");
            offerLetterLink = offerLetterUpload.url;
            console.log("Offer letter link:", offerLetterLink);
        } catch (error) {
            console.error("Error uploading offer letter:", error.message);
            throw new Error("Failed to upload offer letter.");
        }

        // Fetch skills from external API
        try {
            extractedSkills = await fetchSkillsFromExternalApi(req.files.candidateResume);
            console.log("Extracted Skills:", extractedSkills);

            if (!extractedSkills || !extractedSkills.response) {
                throw new Error("Invalid response from skills extraction API.");
            }

            candidateResumeLink = extractedSkills.response.Uploaded_File_URL;
            extractedSkills = extractedSkills.response.Skills || [];
        } catch (error) {
            console.error("Error extracting skills:", error.message);
            return res.status(400).json({
                message: "Error occurred while extracting skills",
                error: error.message,
            });
        }

        // Check if the candidate exists
        let candidate = await HiringCandidate.findOne({ email: candidateEmail }).session(session);

        if (!candidate) {
            candidate = new HiringCandidate({
                name: candidateName || "Unknown",
                email: candidateEmail,
                phoneNo: candidatePhoneNo || "",
                resumeLink: candidateResumeLink,
                skills: extractedSkills || [],
                offers: [],
            });
            await candidate.save({ session });
        } else {
            // Update candidate's resume link if not present
            if (!candidate.resumeLink) {
                candidate.resumeLink = candidateResumeLink;
            }
            // Merge new skills if extracted successfully
            if (extractedSkills?.length) {
                candidate.skills = [...new Set([...candidate.skills, ...extractedSkills])]; // Avoid duplicates
            }
        }

        // Create new offer
        const newOffer = new Offer({
            hr: hrId,
            candidate: candidate._id,
            jobTitle,
            salary,
            offerLetterLink,
            joiningDate,
            expirationDate: expiryDate,
        });

        await newOffer.save({ session });

        // Update candidate's offer list
        candidate.offers.push(newOffer._id);
        await candidate.save({ session });

        // Increment offer letter count for HR
        await User.findByIdAndUpdate(hrId, { $inc: { offerLettersSent: 1 } }, { new: true });

        // Commit transaction
        await session.commitTransaction();
        session.endSession();

        // Send email
        try {
            await sendMail(
                candidate.email,
                null,
                emailSubject,
                "offer-release",
                candidateName,
                null,
                candidateName,
                companyName,
                jobTitle,
                offerLetterLink,
                joiningDate,
                expiryDate
            );
        } catch (error) {
            console.error("Error sending email:", error.message);
            return res.status(500).json({ error: "Offer created but failed to send email." });
        }

        return res.status(201).json({ message: "Offer created successfully", offer: newOffer });

    } catch (error) {
        // Rollback changes in case of an error
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        session.endSession();

        console.error("Error in createOffer:", error.message);
        return res.status(500).json({ error: error.message || "Internal Server Error" });
    }
};









const getAllOffers = async (req, res) => {

    try {

        const userId = req.user.id;

        const offers = await Offer.find({ hr: userId }).populate("candidate");

        if (offers.length === 0) {

            return res.status(404).json({ message: "No offers found for this HR" });

        }
        else {

            return res.status(200).json(offers);

        }

    } catch (error) {


        res.status(500).json({ error: error.message });


    }
}







const getOffersByStatus = async (req, res) => {

    try {

        const status = req.params.status;

        const userId = req.user.id;

        const offers = await Offer.find({ hr: userId, status }).populate("candidate");

        if (offers.length === 0) {

            return res.status(404).json({ message: "No offers found for this HR" });

        }
        else {

            return res.status(200).json(offers);

        }

    } catch (error) {

        res.status(500).json({ error: error.message });

    }
}


export {

    createOffer,
    getAllOffers,
    getOffersByStatus
}
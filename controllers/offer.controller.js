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
import { CONNREFUSED } from "dns";
import { signing_status } from "../utils/data.js";



const DIGIO_BASE_URL = "https://ext.digio.in:444/v2/client/document/uploadpdf";
const BASE64_AUTH = Buffer.from(`${process.env.VITE_DIGIO_CLIENT_ID}:${process.env.VITE_DIGIO_CLIENT_SECRET}`).toString("base64");

console.log(process.env.VITE_DIGIO_CLIENT_ID)

/**
 * Uploads a document to Digio API.
 * @param {Object} reqBody - Digio request body.
 * @returns {Promise<Object>} Digio response data.
 */
const uploadDocumentToDigio = async (reqBody) => {
    try {
        const response = await axios.post(DIGIO_BASE_URL, reqBody, {
            headers: {
                Authorization: `Basic ${BASE64_AUTH}`,
                "Content-Type": "application/json",
            },
        });

        console.log("response: " + response.data);
        return response.data;
    } catch (error) {
        console.error("❌ Digio API Error:", error?.response?.data || error.message);
        throw new Error("Digio API Error");
    }
};

/**
 * Extracts skills from a resume using an external API.
 * @param {Object} resumeFile - Uploaded resume file object.
 * @returns {Promise<{ skills: string[], resumeLink: string }>}
 */
const fetchSkillsFromExternalApi = async (resumeFile) => {
    try {
        const formData = new FormData();
        formData.append("resume", fs.readFileSync(resumeFile.tempFilePath), {
            filename: resumeFile.name,
            contentType: resumeFile.mimetype,
        });

        const contentLength = await new Promise((resolve, reject) => {
            formData.getLength((err, length) => (err ? reject(err) : resolve(length)));
        });

        const response = await axios.post("http://localhost:3001/upload", formData, {
            headers: { ...formData.getHeaders(), "Content-Length": contentLength },
            maxBodyLength: Infinity,
        });

        return {
            skills: response.data?.response?.Skills || [],
            resumeLink: response.data?.response?.Uploaded_File_URL || "",
        };
    } catch (error) {
        console.error("❌ Error extracting skills:", error?.response?.data || error.message);
        return { skills: [], resumeLink: "" };
    }
};

/**
 * Finds authentication URL for a specific email from Digio response.
 * @param {Array} signingParties - List of signing parties.
 * @param {string} candidateEmail - Candidate's email.
 * @returns {string} Authentication URL or error message.
 */
const findAuthUrlByEmail = (signingParties, candidateEmail) => {
    return signingParties.find(
        (party) => party.identifier.trim().toLowerCase() === candidateEmail.trim().toLowerCase()
    )?.authentication_url || "Candidate Email Not Found";
};



function getDaysDifference(targetDate) {
    const currentDate = new Date();
    const givenDate = new Date(targetDate);

    // Calculate the difference in milliseconds
    const diffInMs = givenDate - currentDate;

    // Convert milliseconds to days
    return Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
}


/**
 * Creates an offer for a candidate.
 */

const createOffer = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const {
            jobTitle, salary, joiningDate, expiryDate, emailSubject, emailMessage,
            candidateEmail, candidateName, candidatePhoneNo, companyName, digioReqBody
        } = req.body;

        console.log(digioReqBody);

        if (!req.user?.id) return res.status(401).json({ error: "Unauthorized access." });
        if (!jobTitle || !joiningDate || !expiryDate || !emailSubject || !emailMessage || !candidateEmail) {
            return res.status(400).json({ error: "Missing required fields." });
        }
        if (!req.files?.offerLetter || !req.files?.candidateResume) {
            return res.status(400).json({ error: "Offer letter and resume are required." });
        }

        const hrId = req.user.id;
        const { offerLetter, candidateResume } = req.files;

        // Upload offer letter
        const offerLetterUpload = await UploadImageToCloudinary(offerLetter, "Candidate_Offer_Letter");
        if (!offerLetterUpload?.url) throw new Error("Failed to upload offer letter.");

        const offerLetterLink = offerLetterUpload.url;

        // Extract skills & upload resume
        const { skills, resumeLink } = await fetchSkillsFromExternalApi(candidateResume);
        if (!resumeLink) throw new Error("Failed to extract skills or upload resume.");

        // Check if candidate exists, otherwise create one
        let candidate = await HiringCandidate.findOne({ email: candidateEmail }).session(session);
        if (!candidate) {
            candidate = new HiringCandidate({
                name: candidateName || "Unknown",
                email: candidateEmail,
                phoneNo: candidatePhoneNo || "",
                resumeLink,
                skills,
                offers: [],
            });
            await candidate.save({ session });
        } else {
            if (!candidate.resumeLink) candidate.resumeLink = resumeLink;
            if (skills.length) candidate.skills = [...new Set([...candidate.skills, ...skills])];
        }

        // Upload document to Digio
        const digioData = await uploadDocumentToDigio(JSON.parse(digioReqBody));

        console.log("digio data ", digioData);

        const authUrl = findAuthUrlByEmail(digioData.signing_parties, candidateEmail);

        console.log("auth url ", authUrl);

        // Create and save the offer

        const newOffer = new Offer({
            hr: hrId,
            candidate: candidate._id,
            jobTitle,
            offerLetterLink,
            joiningDate,
            expirationDate: expiryDate,
            authenticationUrl: authUrl,
            digioDocumentId: digioData.id,
            signingPartyEmail: candidateEmail,
            signingStatus: signing_status.requested,
            signingRequestedOn: new Date(),
            signingExpiresOn: new Date(Date.now() + getDaysDifference(expiryDate) * 24 * 60 * 60 * 1000), 
        });

        await newOffer.save({ session });
        candidate.offers.push(newOffer._id);
        await candidate.save({ session });

        await User.findByIdAndUpdate(hrId, { $inc: { offerLettersSent: 1 } }, { new: true });

        await session.commitTransaction();
        session.endSession();

        // Send offer email
        await sendMail(
            candidate.email, null, emailSubject, "offer-release",
            candidateName, null, candidateName, companyName,
            jobTitle, offerLetterLink, joiningDate, expiryDate
        );

        return res.status(201).json({ message: "Offer created successfully", offer: newOffer });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("❌ Error in createOffer:", error.message);
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



const getAllOffersOfIndividualCandidate = async(req,res)=>{


    try{

        const userId = req.body.userId;

        console.log("user id is ",userId);

        const allOffers = await Offer.find({ candidate: userId })
        .populate("hr").sort({ createdAt: -1 }); // Populates the HR who made the offer

        console.log("all offers at the backend side ",allOffers);

        if(allOffers.length === 0){

            return res.status(404).json({ message: "No offers found for this candidate" });

        }

        return res.status(200).json(allOffers);

    }catch(error){

        console.error("�� Error in getAllOffersOfCandidateEmail:", error.message);

        return res.status(500).json({ error: error.message || "Internal Server Error" });
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



async function updateOfferStatus(req, res){

    console.log("update offer letter status ke andar ");


  try {
    const { digio_doc_id, status, error_code } = req.body;

    console.log("📩 Received Digio Webhook:", req.body);

    if (!digio_doc_id || !status) {
      return res.status(400).json({ error: "Invalid webhook data" });
    }

    // Find the corresponding offer by digio_doc_id
    const offer = await Offer.findOne({ digioDocumentId: digio_doc_id });

    if (!offer) {
      return res.status(404).json({ error: "Offer not found" });
    }

    // Update offer status based on Digio response
    offer.signingStatus = status; // Example: "SIGNED", "PENDING", "FAILED"

    if (status === "FAILED" && error_code) {
      offer.signingError = error_code; // Store error code for debugging
    }

    await offer.save();

    console.log("✅ Offer signing status updated:", status);

    res.status(200).json({ message: "Webhook processed successfully" });
  } catch (error) {
    console.error("❌ Error processing Digio Webhook:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
}


export {

    createOffer,
    getAllOffers,
    getOffersByStatus,
    getAllOffersOfIndividualCandidate,
    updateOfferStatus

}


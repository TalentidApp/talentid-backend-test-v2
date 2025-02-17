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

        const hrId = req.user.id;

        // Ensure required fields are present
        if (!hrId || !jobTitle || !joiningDate || !expiryDate || !emailSubject || !emailMessage || !candidateEmail) {
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
            salary,
            offerLetterLink,
            joiningDate,
            expirationDate: expiryDate,
        });

        await newOffer.save({ session });

        // Update candidate with offer reference
        candidate.offers.push(newOffer._id);
        await candidate.save({ session });


        // update the offer letter released count 

        const updatedCandidate = await User.findByIdAndUpdate(
            hrId,
            {
              $inc: {
                offerLettersSent: 1, // Directly increment the number field
              },
            },
            { new: true }
          );
          

        // Commit the transaction (if everything is successful)
        await session.commitTransaction();
        session.endSession();

        // Send email with offer letter attachment
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

        res.status(201).json({ message: "Offer created successfully", offer: newOffer });

    } catch (error) {
        // Rollback any changes if an error occurs
        await session.abortTransaction();
        session.endSession();

        console.error("Error in createOffer:", error);
        res.status(500).json({ error: error.message });
    }
};








const getAllOffers  = async(req,res)=>{

    try{

        const userId = req.user.id;
        
        const offers = await Offer.find({ hr: userId }).populate("candidate");


        if(offers.length === 0){

            return res.status(404).json({ message: "No offers found for this HR" });

        }
        else{

            return res.status(200).json(offers);

        }

    }catch(error){


        res.status(500).json({error:error.message});


    }
}


const getOffersByStatus = async(req,res)=>{

    try{

        const status = req.params.status;

        const userId = req.user.id;

        const offers = await Offer.find({ hr: userId, status }).populate("candidate");

        if(offers.length === 0){

            return res.status(404).json({ message: "No offers found for this HR" });

        }
        else{

            return res.status(200).json(offers);

        }

    }catch(error){

        res.status(500).json({error:error.message});

    }
}


export {

    createOffer,
    getAllOffers,
    getOffersByStatus
}
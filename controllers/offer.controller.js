import Offer from "../models/offer.model";
import HiringCandidate from "../models/hiringCandidate.model";
import { uploadFile } from "../utils/uploadService"; // Function to upload files to storage
import sendEmail from "../utils/emailService"; // Function to send emails

import upload from "../utils/upload";

const createOffer = async (req, res) => {
    try {
        const {
            hrId, 
            jobTitle, 
            salary, 
            joiningDate, 
            expiryDate, 
            emailSubject, 
            emailMessage,
            candidateEmail, 
            candidateName, 
            candidatePhoneNo ,
            companyName,
        } = req.body;

        const { offerLetter, candidateResume } = req.files; // Assuming files are sent via FormData

        // Ensure required fields are present
        if (!hrId || !jobTitle || !joiningDate || !expiryDate || !emailSubject || !emailMessage || !candidateEmail) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (!offerLetter || !candidateResume) {
            return res.status(400).json({ error: "Offer letter and candidate resume are required" });
        }

        // Upload files and get their URLs
        const offerLetterLink = await upload(offerLetter);
        const candidateResumeLink = await upload(candidateResume);

        console.log("Uploaded candidate resume",candidateResumeLink)
        console.log("Uploaded offer letter", offerLetterLink)

        let candidate = await HiringCandidate.findOne({ email: candidateEmail });

        // If candidate doesn't exist, create a new one
        if (!candidate) {
            candidate = new HiringCandidate({
                name: candidateName || "Unknown",
                email: candidateEmail,
                phoneNo: candidatePhoneNo || "",
                resumeLink: candidateResumeLink,
                status: "OnBoarding",  // Updated status based on hiring flow
                offers: []  // Initialize empty array
            });

            await candidate.save();
        } else {
            // Update candidate resume link if it's missing
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
            status: "OnBoarding"
        });

        await newOffer.save();

        // Update candidate with offer reference
        candidate.offers.push(newOffer._id);
        await candidate.save();

        // Send offer email
        await sendEmail({
            to: candidate.email,
            subject: emailSubject,
            text: emailMessage,
            attachments: [{ filename: "OfferLetter.pdf", path: offerLetterLink }]
        });

        res.status(201).json({ message: "Offer created successfully", offer: newOffer });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export default createOffer;


// get all offers available


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



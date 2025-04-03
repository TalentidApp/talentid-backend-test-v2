import Offer from "../models/offer.model.js";
import HiringCandidate from "../models/hiringCandidate.model.js";
import { sendMail } from "../utils/mail.js";
import mongoose from "mongoose";
import axios from "axios";
import User from "../models/user.model.js";
import UploadImageToCloudinary from "../utils/uploadImageToCloudinary.js";
import FormData from "form-data";
import fs from "fs";
import { signing_status } from "../utils/data.js";

const DIGIO_BASE_URL = "https://api-sandbox.digio.in/v2/client/document/upload"; 
const BASE64_AUTH = Buffer.from(`${process.env.DIGIO_CLIENT_ID}:${process.env.DIGIO_CLIENT_SECRET}`).toString("base64");

const uploadDocumentToDigio = async (reqBody) => {
  try {
    const response = await axios.post(DIGIO_BASE_URL, reqBody, {
      headers: {
        Authorization: `Basic ${BASE64_AUTH}`,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    console.error("❌ Digio API Error:", error?.response?.data || error.message);
    throw new Error("Digio API Error");
  }
};

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

const findAuthUrlByEmail = (signingParties, candidateEmail) => {
  return (
    signingParties.find(
      (party) => party.identifier.trim().toLowerCase() === candidateEmail.trim().toLowerCase()
    )?.authentication_url || "Candidate Email Not Found"
  );
};

const getDaysDifference = (targetDate) => {
  const currentDate = new Date();
  const givenDate = new Date(targetDate);
  return Math.ceil((givenDate - currentDate) / (1000 * 60 * 60 * 24));
};

const createOffer = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      jobTitle, salary, joiningDate, expiryDate, emailSubject, emailMessage,
      candidateEmail, candidateName, candidatePhoneNo, companyName, digioReqBody,
    } = req.body;

    if (!req.user?.id) return res.status(401).json({ error: "Unauthorized access." });
    if (!jobTitle || !joiningDate || !expiryDate || !emailSubject || !emailMessage || !candidateEmail) {
      return res.status(400).json({ error: "Missing required fields." });
    }
    if (!req.files?.offerLetter || !req.files?.candidateResume) {
      return res.status(400).json({ error: "Offer letter and resume are required." });
    }

    const hrId = req.user.id;
    const { offerLetter, candidateResume } = req.files;

    const offerLetterUpload = await UploadImageToCloudinary(offerLetter, "Candidate_Offer_Letter");
    if (!offerLetterUpload?.url) throw new Error("Failed to upload offer letter.");
    const offerLetterLink = offerLetterUpload.url;

    const link = await UploadImageToCloudinary(candidateResume,'resume');
    const resumeLink = link.secure_url;
    console.log(resumeLink)
    const skills = ['java','python']
    if (!resumeLink) throw new Error("Failed to extract skills or upload resume.");

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

    // const digioData = await uploadDocumentToDigio(JSON.parse(digioReqBody));
    // const authUrl = findAuthUrlByEmail(digioData.signing_parties, candidateEmail);

    const newOffer = new Offer({
      hr: hrId,
      candidate: candidate._id,
      jobTitle,
      offerLetterLink,
      joiningDate,
      expirationDate: expiryDate,
      // authenticationUrl: authUrl,
      // digioDocumentId: digioData.id,
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
    return res.status(200).json(offers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAllOffersOfIndividualCandidate = async (req, res) => {
  try {
    const { userId } = req.body;
    const allOffers = await Offer.find({ candidate: userId })
      .populate("hr")
      .sort({ createdAt: -1 });

    if (allOffers.length === 0) {
      return res.status(404).json({ message: "No offers found for this candidate" });
    }
    return res.status(200).json(allOffers);
  } catch (error) {
    console.error("❌ Error in getAllOffersOfCandidateEmail:", error.message);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};

const getCandidateOffers = async (req, res) => {
  try {
    const email = req.user.email;
    const candidate = await HiringCandidate.findOne({ email }).populate({
      path:'offers',
      options:{sort : {createdAt : -1}}
    });
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }
    res.status(200).json({
      message: "Offers fetched successfully",
      data: candidate.offers || [],
    });
  } catch (error) {
    console.error("Error fetching candidate offers:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

const getOffersByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const userId = req.user.id;
    const offers = await Offer.find({ hr: userId, status }).populate("candidate");
    if (offers.length === 0) {
      return res.status(404).json({ message: "No offers found for this HR" });
    }
    return res.status(200).json(offers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const handleDigioWebhook = async (req, res) => {
  try {
    const { digio_doc_id, status, error_code, signed_file_url } = req.body;
    console.log("📩 Received Digio Webhook:", req.body);

    if (!digio_doc_id || !status) {
      return res.status(400).json({ error: "Invalid webhook data" });
    }

    const offer = await Offer.findOne({ digioDocumentId: digio_doc_id });
    if (!offer) {
      return res.status(404).json({ error: "Offer not found" });
    }

    offer.signingStatus = status;
    if (status === "signed" && signed_file_url) {
      offer.signedOfferLetterLink = signed_file_url;
      offer.status = "Accepted";
    } else if (status === "FAILED" && error_code) {
      offer.signingError = error_code;
    }

    await offer.save();
    console.log("✅ Offer updated:", offer);

    res.status(200).json({ message: "Webhook processed successfully" });
  } catch (error) {
    console.error("❌ Webhook error:", error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

const updateOffer = async (req, res) => {
  try {
    const { offerId, status } = req.body;

    console.log("Offer ID:", offerId);

    if (!mongoose.Types.ObjectId.isValid(offerId)) {
      return res.status(400).json({ success: false, message: "Invalid offer ID" });
    }

    if (!["Pending", "Accepted", "Declined", "OnBoarding", "Ghosted", "Expired", "Retracted"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }

    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    console.log("Offer:", offer);

    offer.status = status;

    if (status === "Accepted") {
      offer.isEngagementStart = true;
      offer.offerLetterStatus = "Candidate verbal commitment";
    } else if (status === "Declined") {
      offer.isEngagementStart = false;

      if (!offer.hr) {
        throw new Error("HR data not found in offer");
      }

      const admin = await User.findById(offer.hr);
      if (!admin) throw new Error("HR admin not found");

      await sendMail(
        offer.signingPartyEmail,
        null,
        "Offer Rejection Confirmation",
        "offer-rejected-candidate",
        offer.signingPartyEmail.split("@")[0],
        null,
        offer.signingPartyEmail.split("@")[0],
        admin.company || "Talentid.app",
        offer.jobTitle,
        null,
        null,
        null,
        null,
        {}
      );

      await sendMail(
        admin.email,
        admin._id,
        "Offer Rejected by Candidate",
        "offer-rejected-admin",
        admin.fullname,
        null,
        null,
        admin.company || "Talentid.app",
        offer.jobTitle,
        null,
        null,
        null,
        null,
        {
          candidateEmail: offer.signingPartyEmail,
          offerId: offer._id,
        }
      );
    } else if (status === "Retracted") {
      offer.isEngagementStart = false;
      
      if (!offer.hr) {
        throw new Error("HR data not found in offer");
      }

      const admin = await User.findById(offer.hr);
      if (!admin) throw new Error("HR admin not found");

      await sendMail(
        offer.signingPartyEmail,
        null,
        "Offer Retracted",
        "offer-retracted-candidate",
        offer.signingPartyEmail.split("@")[0],
        null,
        offer.signingPartyEmail.split("@")[0],
        admin.company || "Talentid.app",
        offer.jobTitle,
        null,
        null,
        null,
        null,
        {}
      );

      await sendMail(
        admin.email,
        admin._id,
        "Offer Retracted Notification",
        "offer-retracted-admin",
        admin.fullname,
        null,
        null,
        admin.company || "Talentid.app",
        offer.jobTitle,
        null,
        null,
        null,
        null,
        {
          candidateEmail: offer.signingPartyEmail,
          offerId: offer._id,
        }
      );
    }

    await offer.save();

    res.status(200).json({
      success: true,
      message: "Offer status updated successfully",
      data: {
        offerId: offer._id,
        newStatus: offer.status,
        updatedAt: offer.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating offer status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
// In your offer controller file (e.g., offerController.js)
export const updateShowStatus = async (req, res) => {
  try {
    const { offerId, showOffer } = req.body;

    // Validate input
    if (!offerId || showOffer === undefined) {
      return res.status(400).json({ 
        message: "Offer ID and showOffer status are required" 
      });
    }

    const updateData = { showOffer };

    const offer = await Offer.findByIdAndUpdate(
      offerId,
      updateData,
      { new: true } // Return the updated document
    );

    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    res.status(200).json({ 
      message: "Offer visibility updated successfully", 
      offer 
    });
  } catch (error) {
    console.error("Error updating offer show status:", error);
    res.status(500).json({ 
      message: "Error updating offer visibility", 
      error: error.message 
    });
  }
};

const getOfferById = async (req, res) => {
  try {
    const { id } = req.params;
    const candidateEmail = req.user.email;

    const offer = await Offer.findOne({ _id: id })
      .populate("hr", "company");
    if (!offer) {
      return res.status(404).json({ message: "Offer not found or unauthorized" });
    }

    res.status(200).json({
      message: "Offer fetched successfully",
      data: offer,
    });
  } catch (error) {
    console.error("Error fetching offer:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const getDigioToken = async (req, res) => {
  try {
    const response = await axios.post(
      "https://api-sandbox.digio.in/v2/client/authenticate",
      {
        client_id: process.env.DIGIO_CLIENT_ID,
        client_secret: process.env.DIGIO_CLIENT_SECRET,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    res.status(200).json({ access_token: response.data.access_token });
  } catch (error) {
    console.error("❌ Error fetching Digio token:", error?.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch Digio token" });
  }
};

const sendOfferRemainder = async(req,res) => {
  try {
    const { offerId } = req.params;

    const offer = await Offer.findById(offerId).populate("candidate hr");
    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    const admin = await User.findById(offer.hr._id);
    if (!admin) {
      return res.status(404).json({ success: false, message: "HR not found" });
    }

    await sendMail(
      offer.signingPartyEmail, // Candidate email
      null, // No userId needed
      "Offer Reminder",
      "offer-reminder", 
      offer.candidate?.name || "Candidate", // Fullname (candidate name)
      null, // Credits (not applicable)
      offer.candidate?.name || "Candidate", // Candidate name
      admin.company || "Talentid.app", // Company name
      offer.jobTitle, // Job title
      offer.offerLetterLink, // Offer letter link
      offer.joiningDate ? offer.joiningDate.toISOString().split("T")[0] : null, // Joining date
      offer.expirationDate ? offer.expirationDate.toISOString().split("T")[0] : null, // Expiry date
      null, 
      {} 
    );

    res.status(200).json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("Error sending offer email:", error);
    res.status(500).json({ success: false, message: "Failed to send email", error: error.message });
  }
}


export {
  createOffer,
  getAllOffers,
  getOffersByStatus,
  getAllOffersOfIndividualCandidate,
  getCandidateOffers,
  updateOffer,
  getOfferById,
  handleDigioWebhook,
  getDigioToken,
  sendOfferRemainder
};
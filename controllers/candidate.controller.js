
import HiringCandidate from "../models/hiringCandidate.model.js";
import { fileURLToPath } from 'url';
import Offer from "../models/offer.model.js";
import path from 'path';

// fetch specific candidate details by their id 

const fetchCandidateDetails = async (req, res) => {

    try {

        const id = req.user.id;

        if (!id) {

            return res.status(401).json({ message: "Unauthorized" });

        }

        const candidateDetails = await HiringCandidate.findById(id).populate("offers");

        if (!candidateDetails) {

            return res.status(404).json({ message: "Candidate not found" });

        }

        return res.status(200).json({ message: "Candidate details fetched successfully", data: candidateDetails, error: null });

    } catch (error) {

        console.error(error);
        return res.status(500).json({ message: "Server Error", error: error.message });

    }
}



// fetch all the specific candidates thats comes under the specific HR 

async function fetchAllCandidate(req, res) {

    console.log("enter into fetchAllCandidate");

    try {

        const id = req.user.id;

        console.log("user id at fetch all candidate ", id);

        const fetchedCandidates = await Offer.find({ hr: id })
            .populate("candidate")
            .sort({ createdAt: -1 }); // Sorting in descending order by createdAt (or any other field)

        if (fetchedCandidates.length <= 0) {

            return res.status(404).json({ message: "No candidates found" });

        }

        return res.status(200).json({ message: "Candidates fetched successfully", data: fetchedCandidates, error: null });

    } catch (error) {

        console.error(error);
        return res.status(500).json({ message: "Server Error", error: error.message });

    }
}


async function fetchAllOfferLetterOfSpecificCandidate() {

    try {

        const id = req.params.id;

        if (!id) {

            return res.status(400).json({ message: "No candidate ID provided" });
        }

        const OfferLetterOfCandidate = await Offer.find({

            candidate: id,

        }).populate("hr");

        if (OfferLetterOfCandidate.length <= 0) {

            return res.status(404).json({ message: "No Offer Letter found for this candidate" });

        }

        return res.status(200).json({ message: "Offer Letter fetched successfully", data: OfferLetterOfCandidate, error: null });

    } catch (error) {


        console.error(error);
        return res.status(500).json({ message: "Server Error", error: error.message });
    }
}




import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import UploadImageToCloudinary from "../utils/uploadImageToCloudinary.js";

const DIGIO_CLIENT_ID = process.env.DIGIO_CLIENT_ID || 'ACK250225174345947U4PW1M941YUH7A';
const DIGIO_CLIENT_SECRET = process.env.DIGIO_CLIENT_SECRET|| 'TV9NUKZLWT45BCQM5QYGPDYPS67EI2HN';
const DIGIO_UPLOAD_URL = "https://ext.digio.in:444/v2/client/document/upload";

const authHeader = {
    Authorization: `Basic ${Buffer.from(`${DIGIO_CLIENT_ID}:${DIGIO_CLIENT_SECRET}`).toString("base64")}`,
};


async function getSigningUrl(documentId) {
  try {
    const response = await axios.get(
      `https://api.digio.in/v2/client/document/${documentId}/sign/url`,
      {
        headers: {
          ...authHeader,
          Accept: 'application/json',
        },
      }
    );
    console.log('Signing URL Response:', response.data);
    return response.data.signing_url || null;
  } catch (error) {
    console.error('Error fetching signing URL:', error.response?.data || error.message);
    return null;
  }
}
async function E_SignDocument(req, res) {
  try {
    console.log('📌 Starting eSign request...');

    const { pdfUrl } = req.body; // Expect pdfUrl in request body
    if (!pdfUrl) {
      return res.status(400).json({ error: 'No PDF URL provided' });
    }

    // Fetch PDF from Cloudinary
    const pdfResponse = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
    const pdfBuffer = Buffer.from(pdfResponse.data);

    // Validate PDF
    const isValidPDF = pdfBuffer.slice(0, 4).toString() === '%PDF';
    if (!isValidPDF) {
      return res.status(400).json({ error: 'Invalid PDF file' });
    }

    console.log('📄 PDF fetched from Cloudinary:', pdfUrl);
    console.log('PDF Buffer:', pdfBuffer.slice(0, 20));

    // Prepare FormData for Digio
    const formData = new FormData();
    formData.append('file', pdfBuffer, {
      filename: 'Offer_Letter.pdf',
      contentType: 'application/pdf',
    });

    const requestPayload = {
      file_name: 'Offer_Letter.pdf',
      will_self_sign: false,
      signers: [
        {
          identifier: 'chavarahul7@gmail.com', // Replace with dynamic signer email if needed
          name: 'Chava Rahul',
          sign_type: 'electronic',
          reason: 'Offer Letter Signing',
        },
      ],
      send_sign_link: false, // No email
      expire_in_days: 7,
      display_on_page: 'all',
      notify_signers: false, // No notifications
      generate_access_token: true
    };

    formData.append('request', JSON.stringify(requestPayload));

    // Upload to Digio
    const response = await axios.post(DIGIO_UPLOAD_URL, formData, {
      headers: {
        ...authHeader,
        ...formData.getHeaders(),
      },
    });

    if (!response.data.id) {
      console.error('❌ Error: Unable to upload PDF file:', response.data);
      return res.status(500).json({ error: 'Error processing eSign request' });
    }

    console.log('✅ Success:', response.data);
    res.json({ documentId: response.data.id,authId: response.data.access_token.id }); // Return document ID

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error processing eSign request' });
  }
}

async function DownloadUpdate(req, res) {
  const { offerId, documentId } = req.body;

  if (!offerId || !documentId) {
    return res.status(400).json({ message: 'offerId and documentId are required' });
  }

  try {
    // Step 1: Construct the Digio download URL
    const downloadUrl = `https://ext.digio.in:444/v2/client/document/download?document_id=${documentId}`; // Removed :444 port, confirm with Digio docs

    // Step 2: Define the authHeader (ensure this is correct)

    // Step 3: Download the signed document with retry mechanism
    const response = await axios.get(downloadUrl, {
      responseType: 'arraybuffer', // Since it's a PDF file
      timeout: 30000, // Increase timeout to 30 seconds
      headers: {
        ...authHeader,
      },
    });

    console.log('Downloaded document buffer:', response.data);
    const uploadResult = await UploadImageToCloudinary(
      Buffer.from(response.data), // Pass the buffer directly
      'signed_offer_letters', // Folder in Cloudinary
      undefined, // Height (not needed for PDFs)
      undefined // Quality (not needed for PDFs)
    );

    const cloudinaryUrl = uploadResult.secure_url; // The Cloudinary URL of the uploaded signed document
    console.log('Signed document uploaded to Cloudinary:', cloudinaryUrl);

    // Step 5: Update the Offer model in MongoDB
    const updatedOffer = await Offer.findByIdAndUpdate(
      offerId,
      {
        acceptedLetter: cloudinaryUrl, // Update the accepted letter link
        status: 'Accepted', // Update the signing status
        updatedAt: Date.now(),
      },
      { new: true } // Return the updated document
    );

    if (!updatedOffer) {
      throw new Error('Offer not found');
    }

    console.log('Updated offer:', updatedOffer);

    res.status(200).json({
      message: 'Signed document processed successfully',
      offer: updatedOffer,
    });
  } catch (error) {
    console.error('Error handling signed document:', error.message);
    res.status(500).json({ message: 'Failed to process signed document', error: error.message });
  }
}

export { fetchAllCandidate, fetchCandidateDetails, E_SignDocument,DownloadUpdate };

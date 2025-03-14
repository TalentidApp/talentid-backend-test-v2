
import HiringCandidate from "../models/hiringCandidate.model.js";

import Offer from "../models/offer.model.js";


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

const DIGIO_CLIENT_ID = process.env.DIGIO_CLIENT_ID;
const DIGIO_CLIENT_SECRET = process.env.DIGIO_CLIENT_SECRET;
const DIGIO_UPLOAD_URL = "https://ext.digio.in:444/v2/client/document/upload";

const authHeader = {
    Authorization: `Basic ${Buffer.from(`${DIGIO_CLIENT_ID}:${DIGIO_CLIENT_SECRET}`).toString("base64")}`,
};



async function getSigningUrl(documentId) {
    try {
      const response = await axios.get(`POST https://api.digio.in/v2/client/document/DID250302073333174LB2QI98GBHW94S/sign/url`, {
        headers: {
          ...authHeader, // Your Digio API Key/Auth
          Accept: "application/json", // Ensures JSON response
        },
      });
  
      console.log("Response Data:", response.data);
      return response.data.signing_url; // Extract signing URL
    } catch (error) {
      console.error("Error fetching signing URL:", error.response?.data || error.message);
      return null;
    }
  }
  



async function E_SignDocument(req, res) {
    try {
        console.log("📌 Starting eSign request...");

        if (!req.files || !req.files.offer_letter) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const offerLetter = req.files.offer_letter; // Uploaded file
        if (offerLetter.mimetype !== "application/pdf") {
            return res.status(400).json({ error: "Only PDF files are supported" });
        }

        console.log("📄 PDF detected: Uploading as binary file...");
        console.log("Offer Letter Details:", {
            name: offerLetter.name,
            size: offerLetter.size,
            mimetype: offerLetter.mimetype,
            encoding: offerLetter.encoding,
            tempFilePath: offerLetter.tempFilePath,
        });

        // Read the file directly from the temporary file path
        const pdfBuffer = fs.readFileSync(offerLetter.tempFilePath);
        console.log("PDF Buffer:", pdfBuffer.slice(0, 20)); // Log the first 20 bytes for debugging

        const isValidPDF = Buffer.isBuffer(pdfBuffer) && pdfBuffer.slice(0, 4).toString() === '%PDF';
        if (!isValidPDF) {
            return res.status(400).json({ error: "Invalid PDF file" });
        }

        // Constructing form data
        const formData = new FormData();
        formData.append("file", pdfBuffer, {
            filename: offerLetter.name || "Offer_Letter.pdf",
            contentType: "application/pdf",
        });

        // Ensure JSON is correctly appended as a string
        const requestPayload = {
            file_name: "Offer_Letter.pdf",
            will_self_sign: false,
            signers: [
                {
                    identifier: "adarshjain3011@gmail.com",
                    name: "Adarsh Jain",
                    sign_type: "electronic",
                    reason: "Offer Letter Signing",
                },
            ],
            send_sign_link: true,
            expire_in_days: 7,
            display_on_page: "all",
            notify_signers: true,
        };

        formData.append("request", JSON.stringify(requestPayload)); // Append JSON as string

        // Uploading document
        const response = await axios.post(DIGIO_UPLOAD_URL, formData, {
            headers: {
                ...authHeader,
                ...formData.getHeaders(),
            },
        });

        if (!response.data.id) {

            console.error("�� Error: Unable to upload PDF file:", response.data);
            return res.status(500).json({ error: "Error processing eSign request" });

        }

        
        console.log("✅ Success:", response.data);
        res.json({ signing_url: response.data.signing_url });

        const rep = await getSigningUrl(response.data.id);

        console.log(rep);

    } catch (error) {
        if (error.response) {
            console.error("❌ Error Response Data:", error.response.data);
            console.error("❌ Error Response Status:", error.response.status);
        } else {
            console.error("❌ Error Message:", error.message);
        }
        res.status(500).json({ error: "Error processing eSign request" });
    }
}




export { fetchAllCandidate, fetchCandidateDetails, E_SignDocument };

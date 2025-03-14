import mongoose from "mongoose";

import { signing_status } from "../utils/data.js";

const offerSchema = new mongoose.Schema(
  {
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: "HiringCandidate", required: true },
    hr: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // The HR who made the offer
    jobTitle: { type: String, required: true },
    salary: { type: Number },
    benefits: { type: String },
    offerDate: { type: Date, default: Date.now },
    expirationDate: { type: Date },
    additionalNotes: { type: String },

    // Offer Letter Links
    offerLetterLink: { type: String },
    unsignedOfferLetterLink: { type: String },
    signedOfferLetterLink: { type: String },

    isEngagementStart: { type: Boolean, default: false },

    // Status Tracking
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Declined", "OnBoarding", "Ghosted", "Expired"],
      default: "Pending",
    },
    joiningDate: { type: Date },

    offerLetterStatus: {
      type: String,
      enum: ["Offer letter released", "Candidate verbal commitment", "Talentid"],
      default: "Talentid",
    },

    // Digio Document Signing Fields
    digioDocumentId: { type: String }, // Unique ID from Digio for tracking
    signingPartyEmail: { type: String }, // Email of the person signing
    signingStatus: {
      type: String,
      enum: Object.values(signing_status),
      default: "requested",
    },
    authenticationUrl: { type: String }, // URL where the signer can sign the document
    signingRequestedOn: { type: Date }, // Timestamp when signing was requested
    signingExpiresOn: { type: Date }, // Expiration date for the signing request
  },
  { timestamps: true }
);

const Offer = mongoose.model("Offer", offerSchema);

export default Offer;




// {
//     "_id": "65fdba789xyz",
//     "candidate": "65fdba123abc",
//     "hr": "65fdba456def",
//     "jobTitle": "Software Engineer",
//     "salary": 80000,
//     "benefits": "Health Insurance, Stock Options",
//     "offerDate": "2025-03-08T12:00:00.000Z",
//     "expirationDate": "2025-03-15T12:00:00.000Z",
//     "additionalNotes": "Remote work allowed",
    
//     "offerLetterLink": "https://cloudstorage.com/offer_65fdba789xyz.pdf",
//     "unsignedOfferLetterLink": "https://cloudstorage.com/offer_unsigned_65fdba789xyz.pdf",
//     "signedOfferLetterLink": "https://cloudstorage.com/offer_signed_65fdba789xyz.pdf",
  
//     "isEngagementStart": false,
//     "status": "Pending",
//     "joiningDate": "2025-04-01T12:00:00.000Z",
//     "offerLetterStatus": "Offer letter released",
  
//     "digioDocumentId": "DID250308173741567Z1EJPUGTJHYEFH",
//     "signingPartyEmail": "adarshjain3011@gmail.com",
//     "signingStatus": "requested",
//     "authenticationUrl": "https://ext.digio.in/#s/DGO250308173742456HQ",
//     "signingRequestedOn": "2025-03-08T17:37:42.000Z",
//     "signingExpiresOn": "2025-03-19T00:00:00.000Z",
  
//     "createdAt": "2025-03-08T12:00:00.000Z",
//     "updatedAt": "2025-03-08T12:00:00.000Z"
//   }
  
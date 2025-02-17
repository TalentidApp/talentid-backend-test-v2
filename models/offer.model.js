
import mongoose from "mongoose";

const offerSchema = new mongoose.Schema({
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: "HiringCandidate", required: true },
    hr: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // The HR who made the offer
    jobTitle: { type: String, required: true },
    salary: { type: Number, },
    benefits: { type: String },
    offerDate: { type: Date, default: Date.now },
    expirationDate: { type: Date },
    additionalNotes: { type: String },
    offerLetterLink:{

        type: String,
        required: false

    },
    singnedOfferLetterLink:{

        type: String,

    },
    // Status Enum
    status: {
        type: String,
        enum: ["Pending", "Accepted", "Declined", "OnBoarding", "Ghosted", "Expired"],
        default: "Pending"
    },

    offerLetterStatus:{

        type: String,
        enum: [ "Offer letter released","Candidate verbal commitment"],
        default: "Talentid",
    }


}, { timestamps: true });

const Offer = mongoose.model("Offer", offerSchema);

export default Offer;

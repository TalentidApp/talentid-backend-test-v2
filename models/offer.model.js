
import mongoose from "mongoose";

const offerSchema = new mongoose.Schema({
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: "HiringCandidate", required: true },
    hr: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // The HR who made the offer
    jobTitle: { type: String, required: true },
    salary: { type: Number, required: true },
    benefits: { type: String },
    offerDate: { type: Date, default: Date.now },
    expirationDate: { type: Date },
    additionalNotes: { type: String },

    // Status Enum
    status: {
        type: String,
        enum: ["Pending", "Accepted", "Declined", "OnBoarding", "Ghosted", "Expired"],
        default: "Pending"
    }
}, { timestamps: true });

const Offer = mongoose.model("Offer", offerSchema);

export default Offer;

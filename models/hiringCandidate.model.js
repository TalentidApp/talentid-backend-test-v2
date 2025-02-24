import mongoose from "mongoose";
import { hiringCandidateStatus } from "../utils/data.js";

const hiringCandidateSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password:{

        type:String,
        
    },
    phoneNo: { 
        type: String, 
        validate: {
            validator: function(v) {
                return /^\+?[1-9]\d{1,14}$/.test(v); // E.164 phone number format
            },
            message: props => `${props.value} is not a valid phone number!`
        }
    },
    links: [{ name: String, url: String }],  // Structured links
    address: { type: String },
    status: { 
        type: String, 
        enum: Object.values(hiringCandidateStatus), 
        default: hiringCandidateStatus.pending 
    },
    // joiningDate: { type: Date },
    skills: [{ type: String }],
    experience: { type: String },
    educationCollege: { type: String },
    educationDegree: { type: String },
    resumeLink: { type: String },
    role:{

        type: String,
        default:"Candidate",
    },
    
    // Linking to Offer Schema
    offers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Offer" }]
}, { timestamps: true });

const HiringCandidate = mongoose.model("HiringCandidate", hiringCandidateSchema);

export default HiringCandidate;

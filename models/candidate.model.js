import mongoose from "mongoose";

const roundSchema = new mongoose.Schema({
  roundName: { type: String, required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ["Completed", "Pending","Selected"], required: true },
  feedback: { type: String, default: "" } // Optional feedback field
});

const appliedCompanySchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  applicantName:{type: String, required: true},
  appliedAt: { type: Date, default: Date.now },
  jobTitle: { type: String, required: true },
  applicationStatus: { type: String, enum: ["Pending", "Selected", "Rejected"], default: "Pending" },
  rounds: [roundSchema], // Array of interview rounds
  currentRound: { type: String}, // The round the candidate is currently in
  currentStatus: { type: String, enum: ["Pending", "Selected", "Rejected"], default: "Pending" } // Overall application status
});

const candidateSchema = new mongoose.Schema(
  {
    email: { type: String, required: true},
    appliedCompanies: [appliedCompanySchema] // Array of companies the candidate applied to
  },
  { timestamps: true } // To automatically track creation and modification timestamps
);

const Candidate = mongoose.model("Candidate", candidateSchema);

export default Candidate;





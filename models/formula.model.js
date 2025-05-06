import mongoose from "mongoose";

const candidateFormulaSchema = new mongoose.Schema({
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "HiringCandidate",
    required: true,
    unique: true,
  },
  locationPreferences: {
    type: [String],
    required: true,
    validate: {
      validator: v => v.length === 4 && v.every(pref => pref),
      message: "Exactly 4 location preferences are required",
    },
  },
  expectedCTC: {
    type: Number,
    required: true,
    min: [0, "Expected CTC must be positive"],
  },
  companySizePreferences: {
    type: [String],
    required: true,
    validate: {
      validator: v => v.length === 4 && v.every(pref => pref),
      message: "Exactly 4 company size preferences are required",
    },
  },
  rolePreferences: {
    type: [String],
    required: true,
    validate: {
      validator: v => v.length === 4 && v.every(pref => pref),
      message: "Exactly 4 role preferences are required",
    },
  },
}, { timestamps: true });

const CandidateFormula = mongoose.model("CandidateFormula", candidateFormulaSchema);

export default CandidateFormula;
import mongoose from "mongoose";

const candidateAnswerSchema = new mongoose.Schema({
  questionIndex: { type: Number, required: true },
  selectedOption: { type: String, default: null }, // A, B, C, D, or null
});

const resultsSchema = new mongoose.Schema({
  correct: { type: Number, default: 0 },
  wrong: { type: Number, default: 0 },
  noAttempt: { type: Number, default: 0 },
});

const testSchema = new mongoose.Schema({
  testId: { type: String, required: true, unique: true },
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'HiringCandidate', required: true },
  jobTitle: { type: String, required: true },
  questions: [{
    question: { type: String, required: true },
    options: {
      A: { type: String, required: true },
      B: { type: String, required: true },
      C: { type: String, required: true },
      D: { type: String, required: true },
    },
    correct: { type: String, required: true }, // A, B, C, D
    explanation: { type: String, required: true },
  }],
  status: { type: String, enum: ['Pending', 'InProgress', 'Completed', 'Expired'], default: 'Pending' },
  results: { type: resultsSchema, default: () => ({}) },
  candidateAnswers: [candidateAnswerSchema],
  scheduledDate: { type: Date, required: true },
  duration: { type: Number, required: true }, // in minutes
  completedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

const Test = mongoose.model('Test', testSchema);

export default Test;
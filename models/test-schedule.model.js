import mongoose from "mongoose";

const testScheduleSchema = new mongoose.Schema({
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'HiringCandidate', required: true },
  jobTitle: { type: String, required: true },
  skills: [{ type: String }],
  questionCount: { type: Number, required: true },
  frequency: { type: Number, required: true },
  joiningDate: { type: Date, required: true },
  testDates: [{ type: Date, required: true }],
  testIds: [{ type: String, required: true }],
  status: { type: String, enum: ['Pending', 'InProgress', 'Completed'], default: 'Pending' },
  createdAt: { type: Date, default: Date.now },
});

const TestSchedule = mongoose.model("TestSchedule", testScheduleSchema);

export default TestSchedule;
import CandidateFormula from "../models/formula.model.js";
import HiringCandidate from "../models/hiringCandidate.model.js";
import Test from "../models/test.model.js";


export const saveFormulaData = async (req, res) => {
  try {
    const { candidateId, locationPreferences, expectedCTC, companySizePreferences, rolePreferences } = req.body;

    const candidate = await HiringCandidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const existingFormula = await CandidateFormula.findOne({ candidateId });
    if (existingFormula) {
      return res.status(400).json({ message: "Formula data already submitted" });
    }

    const formulaData = new CandidateFormula({
      candidateId,
      locationPreferences,
      expectedCTC,
      companySizePreferences,
      rolePreferences,
    });

    await formulaData.save();
    res.status(201).json({ message: "Formula data saved successfully" });
  } catch (error) {
    console.error("Error saving formula data:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

export const checkFormulaStatus = async (req, res) => {
  try {
    const { candidateId } = req.params;
    console.log(candidateId)
    const candidate = await HiringCandidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const tests = await Test.find({ candidate: candidateId, status: "Completed" })
      .sort({ completedAt: -1 })
      .limit(5);

    let assessmentScore = 0;
    let hasSubmitted = false;

    if (tests.length) {
      hasSubmitted = true;
      let assessment = 0;
      const maxAssessmentScore = 200;

      for (const test of tests) {
        const { correct, wrong, noAttempt } = test.results;
        const testScore = (correct * 4) + (wrong * -2) + (noAttempt * 0);
        assessment += testScore;
      }

      assessmentScore = Math.max(0, Math.min(100, (assessment / maxAssessmentScore) * 100));
    }

    const formula = await CandidateFormula.findOne({ candidateId });

    res.status(200).json({
      hasSubmitted,
      assessmentScore,
      formulaData: formula
        ? {
          locationPreferences: formula.locationPreferences,
          expectedCTC: formula.expectedCTC,
          companySizePreferences: formula.companySizePreferences,
          rolePreferences: formula.rolePreferences,
        }
        : null,
      candidateId,
    });
  } catch (error) {
    console.error("Error checking test submission status:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

export const updateFormulaData = async (req, res) => {
  try {
    const { locationPreferences, expectedCTC, companySizePreferences, rolePreferences } = req.body;
    const candidateId = req.user.id;

    const formulaData = await CandidateFormula.findOne({ candidateId });
    if (!formulaData) {
      return res.status(404).json({ message: "Formula data not found" });
    }

    formulaData.locationPreferences = locationPreferences;
    formulaData.expectedCTC = expectedCTC;
    formulaData.companySizePreferences = companySizePreferences;
    formulaData.rolePreferences = rolePreferences;

    await formulaData.save();
    res.status(200).json({ message: "Formula data updated successfully" });
  } catch (error) {
    console.error("Error updating formula data:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};
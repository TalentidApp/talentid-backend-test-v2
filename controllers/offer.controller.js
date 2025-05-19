import Offer from "../models/offer.model.js";
import HiringCandidate from "../models/hiringCandidate.model.js";
import TestSchedule from "../models/test-schedule.model.js";
import Test from '../models/test.model.js'
import { sendMail } from "../utils/mail.js";
import mongoose from "mongoose";
import axios from "axios";
import User from "../models/user.model.js";
import UploadImageToCloudinary from "../utils/uploadImageToCloudinary.js";
import FormData from "form-data";
import fs from "fs";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

const DIGIO_BASE_URL = "https://api-sandbox.digio.in/v2/client/document/upload";
const BASE64_AUTH = Buffer.from(`${process.env.DIGIO_CLIENT_ID}:${process.env.DIGIO_CLIENT_SECRET}`).toString("base64");
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const uploadDocumentToDigio = async (reqBody) => {
  try {
    const response = await axios.post(DIGIO_BASE_URL, reqBody, {
      headers: {
        Authorization: `Basic ${BASE64_AUTH}`,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    console.error(" Digio API Error:", error?.response?.data || error.message);
    throw new Error("Digio API Error");
  }
};

const fetchSkillsFromExternalApi = async (resumeFile) => {
  try {
    const formData = new FormData();
    formData.append("resume", fs.readFileSync(resumeFile.tempFilePath), {
      filename: resumeFile.name,
      contentType: resumeFile.mimetype,
    });

    const contentLength = await new Promise((resolve, reject) => {
      formData.getLength((err, length) => (err ? reject(err) : resolve(length)));
    });

    const response = await axios.post("http://localhost:3001/upload", formData, {
      headers: { ...formData.getHeaders(), "Content-Length": contentLength },
      maxBodyLength: Infinity,
    });

    return {
      skills: response.data?.response?.Skills || [],
      resumeLink: response.data?.response?.Uploaded_File_URL || "",
    };
  } catch (error) {
    console.error(" Error extracting skills:", error?.response?.data || error.message);
    return { skills: [], resumeLink: "" };
  }
};

const findAuthUrlByEmail = (signingParties, candidateEmail) => {
  return (
    signingParties.find(
      (party) => party.identifier.trim().toLowerCase() === candidateEmail.trim().toLowerCase()
    )?.authentication_url || "Candidate Email Not Found"
  );
};

const getDaysDifference = (targetDate) => {
  const currentDate = new Date();
  const givenDate = new Date(targetDate);
  return Math.ceil((givenDate - currentDate) / (1000 * 60 * 60 * 24));
};

export const generateRandomPassword = (length) => {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
};

const createOffer = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      jobTitle, salary, joiningDate, expiryDate, emailSubject, emailMessage,
      candidateEmail, candidateName, candidatePhoneNo, companyName, digioReqBody,
      status, resumeData, currentCTC
    } = req.body;

    if (!req.user?.id) return res.status(401).json({ error: "Unauthorized access." });
    if (!jobTitle || !joiningDate || !expiryDate || !emailSubject || !emailMessage || !candidateEmail) {
      return res.status(400).json({ error: "Missing required fields." });
    }
    if (!req.files?.offerLetter || !req.files?.candidateResume) {
      return res.status(400).json({ error: "Offer letter and resume are required." });
    }

    const hrId = req.user.id;
    const { offerLetter, candidateResume } = req.files;

    const offerLetterUpload = await UploadImageToCloudinary(offerLetter, "Candidate_Offer_Letter");
    if (!offerLetterUpload?.url) throw new Error("Failed to upload offer letter.");
    const offerLetterLink = offerLetterUpload.url;

    const link = await UploadImageToCloudinary(candidateResume, "resume");
    const resumeLink = link.secure_url;
    if (!resumeLink) throw new Error("Failed to extract skills or upload resume.");

    let candidate = await HiringCandidate.findOne({ email: candidateEmail }).session(session);
    const skills = resumeData ? JSON.parse(resumeData).skills : [];
    let generatedPassword = null;

    if (!candidate) {
      generatedPassword = generateRandomPassword(12);
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);

      candidate = new HiringCandidate({
        name: candidateName || "Unknown",
        email: candidateEmail,
        phoneNo: candidatePhoneNo || "",
        resumeLink,
        skills,
        offers: [],
        password: hashedPassword,
      });
      await candidate.save({ session });
    } else {
      candidate.resumeLink = resumeLink;
      if (skills.length) candidate.skills = [...new Set([...candidate.skills, ...skills])];
    }

    const newOffer = new Offer({
      hr: hrId,
      candidate: candidate._id,
      jobTitle,
      salary,
      offerLetterLink,
      joiningDate,
      expirationDate: expiryDate,
      signingPartyEmail: candidateEmail,
      signingStatus: "requested",
      signingRequestedOn: new Date(),
      signingExpiresOn: new Date(Date.now() + getDaysDifference(expiryDate) * 24 * 60 * 60 * 1000),
      status: status || "Pending",
      currentCTC: currentCTC ? parseFloat(currentCTC) : 0,
    });

    await newOffer.save({ session });
    candidate.offers.push(newOffer._id);
    await candidate.save({ session });

    const updateFields = { $inc: { offerLettersSent: 1 } };
    if (status === "Ghosted") {
      updateFields.$inc.ghostingCount = 1;
    }
    await User.findByIdAndUpdate(hrId, updateFields, { new: true, session });

    await session.commitTransaction();
    session.endSession();

    await sendMail(
      candidate.email,
      null,
      emailSubject,
      "offer-release",
      candidateName,
      null,
      candidateName,
      companyName,
      jobTitle,
      offerLetterLink,
      joiningDate,
      expiryDate,
      null,
      {},
      generatedPassword
    );

    return res.status(201).json({ message: "Offer created successfully", offer: newOffer });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(" Error in createOffer:", error.message);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};

const getRandomHour = () => {
  return Math.floor(Math.random() * 13) + 8; 
};

const formatDateToIST = (date) => {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    console.error("Invalid date provided to formatDateToIST:", date);
    return "Invalid Date";
  }
  return date.toLocaleString("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
};

// Simulate scheduling an email to be sent at a specific time
const scheduleEmailAtTime = (emailData, scheduledDate) => {
  if (!(scheduledDate instanceof Date) || isNaN(scheduledDate.getTime())) {
    console.error("Invalid scheduledDate for email scheduling:", scheduledDate);
    return;
  }

  const now = new Date();
  const delay = scheduledDate.getTime() - now.getTime();

  if (delay <= 0) {
    console.log(`⏰ Email scheduled for ${formatDateToIST(scheduledDate)} is in the past, sending immediately`);
    sendMail(
      emailData.to,
      emailData.cc,
      emailData.subject,
      emailData.template,
      emailData.name,
      emailData.email,
      emailData.candidateName,
      emailData.companyName,
      emailData.jobTitle,
      emailData.offerLetterLink,
      emailData.joiningDate,
      emailData.expiryDate,
      emailData.generatedPassword,
      emailData.additionalData
    ).catch(error => {
      console.error(` Failed to send scheduled email for ${formatDateToIST(scheduledDate)}:`, error.message);
    });
    return;
  }

  console.log(`⏰ Scheduling email for ${formatDateToIST(scheduledDate)}, delay: ${delay / 1000} seconds`);
  setTimeout(() => {
    console.log(`📧 Sending scheduled email for ${formatDateToIST(scheduledDate)}`);
    sendMail(
      emailData.to,
      emailData.cc,
      emailData.subject,
      emailData.template,
      emailData.name,
      emailData.email,
      emailData.candidateName,
      emailData.companyName,
      emailData.jobTitle,
      emailData.offerLetterLink,
      emailData.joiningDate,
      emailData.expiryDate,
      emailData.generatedPassword,
      emailData.additionalData
    ).catch(error => {
      console.error(` Failed to send scheduled email for ${formatDateToIST(scheduledDate)}:`, error.message);
    });
  }, delay);
};

const generateTest = async (req, res, { skipEmail = false } = {}) => {
  console.log("🚀 Starting generateTest with request body:", JSON.stringify(req.body, null, 2));

  try {
    const { candidateEmail, candidateName, jobTitle, skills, questionCount, scheduledDate } = req.body;

    // Validate required fields
    if (!candidateEmail || !candidateName || !jobTitle || !questionCount || !scheduledDate) {
      console.log(" Validation failed: Missing required fields");
      return res.status(400).json({ error: "Missing required fields: candidateEmail, candidateName, jobTitle, questionCount, and scheduledDate are required." });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(candidateEmail)) {
      console.log(" Invalid email format");
      return res.status(400).json({ error: "Invalid email format." });
    }

    // Validate questionCount
    if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 50) {
      console.log(" Invalid question count");
      return res.status(400).json({ error: "Question count must be an integer between 1 and 50." });
    }

    // Validate scheduledDate
    const scheduled = new Date(scheduledDate);
    const now = new Date(Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate(),
      new Date().getUTCHours(),
      new Date().getUTCMinutes(),
      new Date().getUTCSeconds()
    ));
    if (isNaN(scheduled.getTime()) || scheduled <= now) {
      console.log(" Invalid or past scheduled date");
      return res.status(400).json({ error: "Scheduled date must be a valid future date." });
    }

    // Validate skills
    if (skills && (!Array.isArray(skills) || skills.some(skill => typeof skill !== 'string' || skill.trim() === ''))) {
      console.log(" Invalid skills format");
      return res.status(400).json({ error: "Skills must be an array of non-empty strings." });
    }

    console.log(" Validation passed");

    // Check candidate existence
    console.log("🔍 Searching for candidate with email:", candidateEmail);
    let candidate = await HiringCandidate.findOne({ email: candidateEmail });
    if (!candidate) {
      console.log("📝 Creating new candidate");
      candidate = new HiringCandidate({
        name: candidateName,
        email: candidateEmail,
        skills: skills || [],
      });
      await candidate.save();
      console.log(" Candidate created:", candidate._id);
    } else {
      console.log(" Candidate found:", candidate._id);
    }

    // Prepare Anthropic API prompt
    const prompt = `
      You are an expert in technical assessments. Generate exactly ${questionCount} multiple-choice questions for a ${jobTitle} role, focusing on the technical skills: ${skills?.join(", ") || "general programming"}. Each question must include:
      - A clear question text
      - Four answer options labeled A, B, C, D
      - One correct answer (e.g., "A")
      - A brief explanation of why the correct answer is right

      Return the response as a valid JSON array and nothing else. The structure must be:
      [
        {
          "question": "Question text",
          "options": {
            "A": "Option A",
            "B": "Option B",
            "C": "Option C",
            "D": "Option D"
          },
          "correct": "A",
          "explanation": "Explanation text"
        },
        ...
      ]

      Ensure:
      - The response contains exactly ${questionCount} questions.
      - The JSON is properly formatted with double quotes, no trailing commas, and no extra text.
      - Do not wrap the array in an object or include code blocks (e.g., \`\`\`json).
      - Do not include any text, comments, or explanations outside the JSON array.
    `;
    console.log("📝 Anthropic API prompt:", prompt);

    // Call Anthropic API
    console.log("🌐 Sending request to Anthropic API...");
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
      }
    ).catch(error => {
      console.error(" Anthropic API error:", error.response?.data || error.message);
      throw new Error(`Failed to generate questions from Anthropic API: ${error.response?.data?.error?.message || error.message}`);
    });
    console.log(" Anthropic API response received");

    // Log raw response for debugging
    const rawResponse = response.data.content[0].text;
    console.log("📄 Raw Anthropic response:", rawResponse);

    // Clean the response to handle common malformed JSON
    let cleanedResponse = rawResponse.trim();
    if (cleanedResponse.startsWith('{') && cleanedResponse.includes('[') && cleanedResponse.endsWith('}')) {
      const arrayStart = cleanedResponse.indexOf('[');
      const arrayEnd = cleanedResponse.lastIndexOf(']');
      if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
        cleanedResponse = cleanedResponse.slice(arrayStart, arrayEnd + 1);
        console.log("🧹 Cleaned response (removed outer object):", cleanedResponse);
      }
    }
    if (cleanedResponse.startsWith('```json') && cleanedResponse.endsWith('```')) {
      cleanedResponse = cleanedResponse.slice(7, -3).trim();
      console.log("🧹 Cleaned response (removed code fences):", cleanedResponse);
    }

    // Parse questions
    let parsedQuestions;
    try {
      parsedQuestions = JSON.parse(cleanedResponse);
      if (!Array.isArray(parsedQuestions) || parsedQuestions.length !== questionCount) {
        throw new Error(`Invalid question format or count. Expected ${questionCount} questions, got ${parsedQuestions.length}`);
      }
      for (const q of parsedQuestions) {
        if (!q.question || !q.options || !q.correct || !q.explanation ||
          !['A', 'B', 'C', 'D'].includes(q.correct) ||
          !q.options.A || !q.options.B || !q.options.C || !q.options.D) {
          throw new Error("Invalid question structure: Missing required fields or incorrect format");
        }
      }
      console.log(" Parsed questions:", parsedQuestions);
    } catch (error) {
      console.error(" Error parsing Anthropic response:", error.message);
      return res.status(500).json({
        error: "Failed to parse test questions.",
        details: error.message,
        rawResponse: rawResponse.substring(0, 500),
        cleanedResponse: cleanedResponse.substring(0, 500)
      });
    }

    const testId = uuidv4();
    const testLink = `https://offers.talentid.app/test/${testId}`;
    console.log("🔗 Generated test link:", testLink);

    console.log("💾 Saving test to MongoDB...");
    const test = new Test({
      testId,
      candidate: candidate._id,
      jobTitle,
      questions: parsedQuestions,
      status: "Pending",
      results: {
        correct: 0,
        wrong: 0,
        noAttempt: parsedQuestions.length,
      },
      candidateAnswers: parsedQuestions.map((_, index) => ({
        questionIndex: index,
        selectedOption: null,
      })),
      scheduledDate: scheduled,
      duration: 60,
    });

    await test.save();
    console.log(" Test saved to MongoDB with ID:", test._id);

    if (!skipEmail) {
      const scheduledIST = formatDateToIST(scheduled);
      if (scheduledIST === "Invalid Date") {
        console.error("Invalid scheduled date for email:", scheduled);
        throw new Error("Invalid scheduled date for test invitation email.");
      }
      console.log("📧 Scheduling test invitation email to candidate:", candidateEmail);
      scheduleEmailAtTime(
        {
          to: candidateEmail,
          cc: null,
          subject: `Technical Assessment for ${jobTitle}`,
          template: "test-invitation",
          name: candidateName,
          email: null,
          candidateName,
          companyName: "Talentid.app",
          jobTitle,
          offerLetterLink: null,
          joiningDate: null,
          expiryDate: null,
          generatedPassword: null,
          additionalData: {
            scheduledDate: scheduledIST,
            questionCount,
            duration: 60,
            skills: skills || [],
            testLink,
            timezoneNote: "All times are in IST (Asia/Kolkata). Please ensure your device's timezone is set correctly."
          }
        },
        scheduled
      );
      console.log(" Test invitation email scheduled for:", scheduledIST);
    } else {
      console.log("📧 Skipping test invitation email scheduling");
    }

    return res.status(200).json({ message: "Test generated successfully", testLink, testId, scheduledDate: scheduled.toISOString() });
  } catch (error) {
    console.error(" Error in generateTest:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
      status: error.response?.status,
    });
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};

const scheduleTests = async (req, res) => {
  console.log("🚀 Starting scheduleTests with request body:", JSON.stringify(req.body, null, 2));

  try {
    const { candidateEmail, candidateName, jobTitle, skills, questionCount, frequency, joiningDate } = req.body;

    if (!candidateEmail || !candidateName || !jobTitle || !questionCount || !frequency || !joiningDate) {
      console.log(" Validation failed: Missing required fields");
      return res.status(400).json({ error: "Missing required fields: candidateEmail, candidateName, jobTitle, questionCount, frequency, and joiningDate are required." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(candidateEmail)) {
      console.log("Invalid email format");
      return res.status(400).json({ error: "Invalid email format." });
    }

    if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 50) {
      console.log(" Invalid question count");
      return res.status(400).json({ error: "Question count must be an integer between 1 and 50." });
    }
    if (!Number.isInteger(frequency) || frequency < 1 || frequency > 6) {
      console.log(" Invalid frequency");
      return res.status(400).json({ error: "Frequency must be an integer between 1 and 6." });
    }

    if (skills && (!Array.isArray(skills) || skills.length === 0 || skills.some(skill => typeof skill !== 'string' || skill.trim() === ''))) {
      console.log(" Invalid skills format");
      return res.status(400).json({ error: "Skills must be a non-empty array of non-empty strings." });
    }

    const joining = new Date(joiningDate);
    const today = new Date(Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate()
    ));
    if (isNaN(joining.getTime()) || joining <= today) {
      console.log(" Invalid joining date");
      return res.status(400).json({ error: "Joining date must be a valid future date." });
    }

    console.log("🔍 Searching for candidate with email:", candidateEmail);
    let candidate = await HiringCandidate.findOne({ email: candidateEmail });
    if (!candidate) {
      console.log("📝 Creating new candidate");
      candidate = new HiringCandidate({
        name: candidateName,
        email: candidateEmail,
        skills: skills || [],
      });
      await candidate.save();
      console.log(" Candidate created:", candidate._id);
    } else {
      console.log(" Candidate found:", candidate._id);
    }

    const existingSchedule = await TestSchedule.findOne({
      candidate: candidate._id,
      jobTitle,
      status: 'Pending',
    });
    if (existingSchedule) {
      console.log(" Existing pending schedule found for candidate");
      return res.status(400).json({ error: "A pending test schedule already exists for this candidate and job title." });
    }

    const diffDays = Math.ceil((joining - today) / (1000 * 60 * 60 * 24));
    if (diffDays < frequency) {
      console.log(" Insufficient time for test frequency");
      return res.status(400).json({ error: "Joining date is too soon for the requested test frequency." });
    }
    const interval = Math.floor(diffDays / (frequency + 1));
    const testDates = [];
    for (let i = 1; i <= frequency; i++) {
      const testDate = new Date(today.getTime() + interval * i * 24 * 60 * 60 * 1000);
      const hour = getRandomHour();
      testDate.setUTCHours(hour, 0, 0, 0); 
      testDates.push(testDate);
    }
    console.log("📅 Calculated test dates (UTC):", testDates);

    const now = new Date(Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate(),
      new Date().getUTCHours(),
      new Date().getUTCMinutes(),
      new Date().getUTCSeconds()
    ));
    for (const testDate of testDates) {
      if (testDate <= now) {
        console.log(" Test date is in the past or too soon:", testDate);
        return res.status(400).json({ error: "Test dates must be in the future." });
      }
    }

    const testLinks = [];
    const testIds = [];
    const failedTests = [];
    for (const [index, testDate] of testDates.entries()) {
      console.log(`💾 Generating test ${index + 1} for ${testDate}`);
      const testReq = {
        body: {
          candidateEmail,
          candidateName,
          jobTitle,
          skills,
          questionCount,
          scheduledDate: testDate.toISOString(),
        },
      };
      let testData = null;
      const testRes = {
        status: (code) => ({
          json: (data) => {
            testData = data;
            console.log(`Test ${index + 1} Response:`, data);
          },
        }),
      };

      try {
        await generateTest(testReq, testRes, { skipEmail: true });
        if (testData?.testId && testData?.testLink) {
          testIds.push(testData.testId);
          testLinks.push(testData.testLink);
          console.log(` Test ${index + 1} generated with ID: ${testData.testId}`);
        } else {
          throw new Error("Invalid test generation response");
        }
      } catch (error) {
        console.error(` Failed to generate test ${index + 1}:`, error.message);
        failedTests.push({ testNumber: index + 1, date: testDate, error: error.message });
      }
    }

    if (testIds.length === 0) {
      console.log(" No tests generated successfully");
      return res.status(500).json({
        error: "Failed to generate any tests.",
        details: failedTests,
      });
    }

    console.log("💾 Saving test schedule to MongoDB...");
    const testSchedule = new TestSchedule({
      candidate: candidate._id,
      jobTitle,
      skills,
      questionCount,
      frequency,
      joiningDate: joining,
      testDates: testDates.slice(0, testIds.length),
      testIds,
      status: "Pending",
    });

    await testSchedule.save().catch(error => {
      console.error(" Error saving test schedule:", error.message);
      throw new Error(`Failed to save test schedule: ${error.message}`);
    });
    console.log(" Test schedule saved:", testSchedule._id);

    const nowLocal = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const nowLocalDate = new Date(nowLocal);
    const formattedTestDates = testDates.slice(0, testIds.length).map((date, index) => {
      const formattedDate = formatDateToIST(date);
      if (formattedDate === "Invalid Date") {
        console.error("Invalid test date at index", index, ":", date);
        throw new Error("Invalid test date encountered while formatting for email.");
      }
      const testDate = new Date(date);
      const isPast = testDate <= nowLocalDate;
      return {
        date: formattedDate,
        link: testLinks[index] || "Link unavailable",
        number: index + 1,
        isPast: isPast,
      };
    });

    console.log("📧 Sending test schedule notification email to candidate:", candidateEmail);
    await sendMail(
      candidateEmail,
      null,
      `Technical Assessments Scheduled for ${jobTitle}`,
      "test-schedule-notification",
      candidateName,
      null,
      candidateName,
      "Talentid.app",
      null,
      null,
      null,
      null,
      null,
      {
        testDates: formattedTestDates,
        skills: skills || [],
        role: jobTitle,
        questionCount,
        duration: 60,
        timezoneNote: "All times are in IST (Asia/Kolkata). Please ensure your device's timezone is set correctly."
      }
    ).catch(error => {
      console.error(" Failed to send test schedule email:", error.message);
      throw new Error(`Failed to send test schedule email: ${error.message}`);
    });
    console.log(" Test schedule notification email sent successfully");

    const response = {
      message: `Scheduled ${testIds.length} of ${frequency} tests successfully`,
      testDates: testDates.slice(0, testIds.length).map(date => date.toISOString()),
      testLinks,
      scheduleId: testSchedule._id,
    };

    if (failedTests.length > 0) {
      response.partialSuccess = true;
      response.failedTests = failedTests;
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error(" Error in scheduleTests:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    });
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};

const getTest = async (req, res) => {
  console.log("🚀 Starting getTest with testId:", req.params.testId);

  try {
    const { testId } = req.params;

    if (!testId) {
      console.log(" Missing testId");
      return res.status(400).json({ error: "Test ID is required." });
    }

    console.log("🔍 Searching for test with testId:", testId);
    const test = await Test.findOne({ testId }).populate("candidate");

    if (!test) {
      console.log(" Test not found");
      return res.status(404).json({ error: "Test not found." });
    }
    console.log(" Test found:", test._id);

    const testSchedule = await TestSchedule.findOne({ testIds: testId });
    const maintest = await Test.findOne({ testId }).populate("candidate");
    if (maintest.status === 'Completed') {
      console.log(" Test no longer available");
      return res.status(403).json({
        error: "Test is no longer available.",
        endTime: formatDateToIST(new Date(maintest.scheduledDate.getTime() + 60 * 60 * 1000)),
        message: `The test was completed.`,
      });
    }

    if (!testSchedule || !testSchedule.testDates || testSchedule.testDates.length === 0) {
      console.log(" Test schedule not found or invalid");
      return res.status(404).json({ error: "Test schedule not found or has no scheduled dates." });
    }
    console.log(" Test schedule found:", testSchedule._id);

    const testIndex = testSchedule.testIds.indexOf(testId);
    if (testIndex === -1) {
      console.log(" Test ID not found in schedule");
      return res.status(404).json({ error: "Test ID not found in schedule." });
    }
    const scheduled = new Date(testSchedule.testDates[testIndex]);
    if (isNaN(scheduled.getTime())) {
      console.log(" Invalid scheduled date in test schedule");
      return res.status(500).json({ error: "Invalid scheduled date in test schedule." });
    }

    const startTime = new Date(scheduled);
    const startTimeIST = formatDateToIST(startTime);
    if (startTimeIST === "Invalid Date") {
      console.error("Invalid start time:", startTime);
      return res.status(500).json({ error: "Invalid test start time." });
    }

    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + 1);
    const endTimeIST = formatDateToIST(endTime);
    if (endTimeIST === "Invalid Date") {
      console.error("Invalid end time:", endTime);
      return res.status(500).json({ error: "Invalid test end time." });
    }

    const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const nowLocal = new Date(now);

    console.log("🕒 Time Details:");
    console.log("   ▶️ Current Local Time (Asia/Kolkata):", nowLocal.toString());
    console.log("   🕓 Test Start Time (Asia/Kolkata):", startTimeIST);
    console.log("   🕔 Test End Time (Asia/Kolkata):", endTimeIST);
    console.log("   ⏳ Time Remaining to Start (sec):", Math.floor((startTime - nowLocal) / 1000));
    console.log("   ⏳ Time Remaining to End (sec):", Math.floor((endTime - nowLocal) / 1000));

    if (nowLocal < startTime) {
      console.log(" Test not yet available");
      return res.status(403).json({
        error: "Test is not yet available.",
        startTime: startTimeIST,
        timeRemaining: Math.floor((startTime - nowLocal) / 1000),
        message: `The test will be available at ${startTimeIST} in your local time (Asia/Kolkata).`,
      });
    }

    if (nowLocal >= endTime) {
      console.log(" Test no longer available");
      return res.status(403).json({
        error: "Test is no longer available.",
        endTime: endTimeIST,
        message: `The test was available until ${endTimeIST} in your local time (Asia/Kolkata).`,
      });
    }

    console.log(" Test is accessible");

    return res.status(200).json({
      message: "Test is accessible",
      test: {
        testId: test.testId,
        jobTitle: test.jobTitle,
        questions: test.questions,
        duration: test.duration,
        startTime: startTimeIST,
        endTime: endTimeIST,
        candidate: {
          name: test.candidate.name,
          email: test.candidate.email,
        },
      },
    });

  } catch (error) {
    console.error(" Error in getTest:", {
      message: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};

const submitTest = async (req, res) => {
  console.log("🚀 Starting submitTest with request body:", JSON.stringify(req.body, null, 2));

  try {
    const { testId, answers } = req.body;

    // Validate input
    if (!testId || !Array.isArray(answers)) {
      console.log(" Invalid test ID or answers");
      return res.status(400).json({ error: "Invalid test ID or answers. Test ID must be a string and answers must be an array." });
    }

    const test = await Test.findOne({ testId }).populate("candidate");
    if (!test) {
      console.log(" Test not found");
      return res.status(404).json({ error: "Test not found." });
    }

    if (test.status === "Completed" || test.status === "Expired") {
      console.log(` Test is already ${test.status.toLowerCase()}`);
      return res.status(400).json({ error: `Test is already ${test.status.toLowerCase()}.` });
    }

    if (answers.length > test.questions.length) {
      console.log(" Too many answers provided");
      return res.status(400).json({ error: "Too many answers provided." });
    }
    for (const answer of answers) {
      if (!Number.isInteger(answer.questionIndex) || answer.questionIndex < 0 || answer.questionIndex >= test.questions.length) {
        console.log(" Invalid question index in answers");
        return res.status(400).json({ error: "Invalid question index in answers." });
      }
      if (answer.selectedOption && !['A', 'B', 'C', 'D'].includes(answer.selectedOption)) {
        console.log(" Invalid selected option in answers");
        return res.status(400).json({ error: "Selected option must be A, B, C, or D." });
      }
    }

    let correct = 0;
    let wrong = 0;
    let noAttempt = 0;

    const updatedAnswers = test.questions.map((question, index) => {
      const answer = answers.find((ans) => ans.questionIndex === index);
      const selectedOption = answer?.selectedOption || null;

      if (!selectedOption) {
        noAttempt++;
      } else if (selectedOption === question.correct) {
        correct++;
      } else {
        wrong++;
      }

      return {
        questionIndex: index,
        selectedOption,
      };
    });

    test.candidateAnswers = updatedAnswers;
    test.results = { correct, wrong, noAttempt };
    test.status = "Completed";
    test.completedAt = new Date(Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate(),
      new Date().getUTCHours(),
      new Date().getUTCMinutes(),
      new Date().getUTCSeconds()
    ));

    await test.save();
    console.log(" Test submitted and saved:", test._id);

    return res.status(200).json({
      message: "Test submitted successfully",
      results: { correct, wrong, noAttempt, total: test.questions.length },
    });
  } catch (error) {
    console.error(" Error in submitTest:", {
      message: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};

const getAllOffers = async (req, res) => {
  try {
    const userId = req.user.id;
    const offers = await Offer.find({ hr: userId }).populate("candidate");
    if (offers.length === 0) {
      return res.status(404).json({ message: "No offers found for this HR" });
    }
    return res.status(200).json(offers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAllOffersOfIndividualCandidate = async (req, res) => {
  try {
    const { userId } = req.body;
    const allOffers = await Offer.find({ candidate: userId })
      .populate("hr")
      .sort({ createdAt: -1 });

    if (allOffers.length === 0) {
      return res.status(404).json({ message: "No offers found for this candidate" });
    }
    return res.status(200).json(allOffers);
  } catch (error) {
    console.error(" Error in getAllOffersOfCandidateEmail:", error.message);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};

const getCandidateOffers = async (req, res) => {
  try {
    const email = req.user.email;
    const candidate = await HiringCandidate.findOne({ email }).populate({
      path: 'offers',
      options: { sort: { createdAt: -1 } }
    });
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }
    res.status(200).json({
      message: "Offers fetched successfully",
      data: candidate.offers || [],
    });
  } catch (error) {
    console.error("Error fetching candidate offers:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

const getOffersByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const userId = req.user.id;
    const offers = await Offer.find({ hr: userId, status }).populate("candidate");
    if (offers.length === 0) {
      return res.status(404).json({ message: "No offers found for this HR" });
    }
    return res.status(200).json(offers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const handleDigioWebhook = async (req, res) => {
  try {
    const { digio_doc_id, status, error_code, signed_file_url } = req.body;
    console.log("📩 Received Digio Webhook:", req.body);

    if (!digio_doc_id || !status) {
      return res.status(400).json({ error: "Invalid webhook data" });
    }

    const offer = await Offer.findOne({ digioDocumentId: digio_doc_id });
    if (!offer) {
      return res.status(404).json({ error: "Offer not found" });
    }

    offer.signingStatus = status;
    if (status === "signed" && signed_file_url) {
      offer.signedOfferLetterLink = signed_file_url;
      offer.status = "Accepted";
    } else if (status === "FAILED" && error_code) {
      offer.signingError = error_code;
    }

    await offer.save();
    console.log(" Offer updated:", offer);

    res.status(200).json({ message: "Webhook processed successfully" });
  } catch (error) {
    console.error(" Webhook error:", error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

const updateOffer = async (req, res) => {
  try {
    const { offerId, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(offerId)) {
      return res.status(400).json({ success: false, message: "Invalid offer ID" });
    }

    if (!["Pending", "Accepted", "Declined", "OnBoarding", "Ghosted", "Expired", "Retracted"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }

    const offer = await Offer.findById(offerId).populate("candidate hr");
    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    if (status === "Accepted") {
      const otherOffers = await Offer.find({
        candidate: offer.candidate._id,
        _id: { $ne: offerId },
        status: "Accepted"
      });

      if (otherOffers.length > 0) {
        offer.status = "Ghosted";
        offer.isEngagementStart = false;

        const admin = await User.findById(offer.hr._id);
        if (!admin) throw new Error("HR admin not found");

        await sendMail(
          admin.email,
          admin._id,
          "Candidate Accepted Another Offer",
          "offer-ghosted-admin",
          admin.fullname,
          null,
          null,
          admin.company || "Talentid.app",
          offer.jobTitle,
          null,
          null,
          null,
          null,
          {
            candidateEmail: offer.candidate.email,
            offerId: offer._id,
          }
        );
      } else {
        offer.status = "Accepted";
        offer.isEngagementStart = true;

        const admin = await User.findById(offer.hr._id);
        if (!admin) throw new Error("HR admin not found");

        await sendMail(
          admin.email,
          admin._id,
          "Offer Accepted by Candidate",
          "offer-accepted-admin",
          admin.fullname,
          null,
          null,
          admin.company || "Talentid.app",
          offer.jobTitle,
          null,
          null,
          null,
          null,
          {
            candidateEmail: offer.candidate.email,
            offerId: offer._id,
          }
        );
      }
    } else if (status === "Ghosted") {
      offer.status = "Ghosted";
      offer.isEngagementStart = false;
    } else if (status === "Declined") {
      offer.status = status;
      offer.isEngagementStart = false;

      const admin = await User.findById(offer.hr._id);
      if (!admin) throw new Error("HR admin not found");

      await sendMail(
        offer.signingPartyEmail,
        null,
        "Offer Rejection Confirmation",
        "offer-rejected-candidate",
        offer.signingPartyEmail.split("@")[0],
        null,
        offer.signingPartyEmail.split("@")[0],
        admin.company || "Talentid.app",
        offer.jobTitle,
        null,
        null,
        null,
        null,
        {}
      );

      await sendMail(
        admin.email,
        admin._id,
        "Offer Rejected by Candidate",
        "offer-rejected-admin",
        admin.fullname,
        null,
        null,
        admin.company || "Talentid.app",
        offer.jobTitle,
        null,
        null,
        null,
        null,
        {
          candidateEmail: offer.signingPartyEmail,
          offerId: offer._id,
        }
      );
    } else if (status === "Retracted") {
      offer.status = status;
      offer.isEngagementStart = false;

      const admin = await User.findById(offer.hr._id);
      if (!admin) throw new Error("HR admin not found");

      await sendMail(
        offer.signingPartyEmail,
        null,
        "Offer Retracted",
        "offer-retracted-candidate",
        offer.signingPartyEmail.split("@")[0],
        null,
        offer.signingPartyEmail.split("@")[0],
        admin.company || "Talentid.app",
        offer.jobTitle,
        null,
        null,
        null,
        null,
        {}
      );

      await sendMail(
        admin.email,
        admin._id,
        "Offer Retracted Notification",
        "offer-retracted-admin",
        admin.fullname,
        null,
        null,
        admin.company || "Talentid.app",
        offer.jobTitle,
        null,
        null,
        null,
        null,
        {
          candidateEmail: offer.signingPartyEmail,
          offerId: offer._id,
        }
      );
    } else {
      offer.status = status;
    }

    await offer.save();

    res.status(200).json({
      success: true,
      message: "Offer status updated successfully",
      data: {
        offerId: offer._id,
        newStatus: offer.status,
        updatedAt: offer.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating offer status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const updateShowStatus = async (req, res) => {
  try {
    const { offerId, showOffer } = req.body;

    if (!offerId || showOffer === undefined) {
      return res.status(400).json({
        message: "Offer ID and showOffer status are required"
      });
    }

    const updateData = { showOffer };

    const offer = await Offer.findByIdAndUpdate(
      offerId,
      updateData,
      { new: true }
    );

    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    res.status(200).json({
      message: "Offer visibility updated successfully",
      offer
    });
  } catch (error) {
    console.error("Error updating offer show status:", error);
    res.status(500).json({
      message: "Error updating offer visibility",
      error: error.message
    });
  }
};

const getOfferById = async (req, res) => {
  try {
    const { id } = req.params;
    const candidateEmail = req.user.email;

    const offer = await Offer.findOne({ _id: id })
      .populate("hr", "company");
    if (!offer) {
      return res.status(404).json({ message: "Offer not found or unauthorized" });
    }

    res.status(200).json({
      message: ".localhost:3001/offer fetched successfully",
      data: offer,
    });
  } catch (error) {
    console.error("Error fetching offer:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const getDigioToken = async (req, res) => {
  try {
    const response = await axios.post(
      "https://api-sandbox.digio.in/v2/client/authenticate",
      {
        client_id: process.env.DIGIO_CLIENT_ID,
        client_secret: process.env.DIGIO_CLIENT_SECRET,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    res.status(200).json({ access_token: response.data.access_token });
  } catch (error) {
    console.error(" Error fetching Digio token:", error?.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch Digio token" });
  }
};

const sendOfferRemainder = async (req, res) => {
  try {
    const { offerId } = req.params;

    const offer = await Offer.findById(offerId).populate("candidate hr");
    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    const admin = await User.findById(offer.hr._id);
    if (!admin) {
      return res.status(404).json({ success: false, message: "HR not found" });
    }

    await sendMail(
      offer.signingPartyEmail,
      null,
      "Offer Reminder",
      "offer-reminder",
      offer.candidate?.name || "Candidate",
      null,
      offer.candidate?.name || "Candidate",
      admin.company || "Talentid.app",
      offer.jobTitle,
      offer.offerLetterLink,
      offer.joiningDate ? offer.joiningDate.toISOString().split("T")[0] : null,
      offer.expirationDate ? offer.expirationDate.toISOString().split("T")[0] : null,
      null,
      {}
    );

    res.status(200).json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("Error sending offer email:", error);
    res.status(500).json({ success: false, message: "Failed to send email", error: error.message });
  }
};

const getCandidateTests = async (req, res) => {
  console.log("🚀 Starting GET /api/tests for candidate");

  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const candidateId = req.user.id; 

    console.log(`🔍 Fetching tests for candidate ${candidateId} (page: ${page}, limit: ${limit})...`);

    const tests = await Test.find({ candidate: candidateId })
      .populate('candidate', 'name email')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    if (!tests.length) {
      console.log("❌ No tests found for candidate");
      return res.status(404).json({ message: "No tests found for this candidate." });
    }

    console.log(`✅ Found ${tests.length} tests`);

    const testIds = tests.map(test => test.testId);
    const testSchedules = await TestSchedule.find({ testIds: { $in: testIds } })
      .select('jobTitle joiningDate status testIds')
      .lean();

    // Log any testSchedules with invalid testIds for debugging
    testSchedules.forEach((schedule, index) => {
      if (!Array.isArray(schedule.testIds)) {
        console.warn(`⚠️ Invalid testIds in TestSchedule at index ${index}:`, schedule);
      }
    });

    const formattedTests = tests.map(test => {
      const scheduledDate = test.scheduledDate ? new Date(test.scheduledDate) : null;
      const scheduledDateIST = scheduledDate
        ? scheduledDate.toLocaleString("en-US", {
            timeZone: "Asia/Kolkata",
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
            hour12: true,
          })
        : "N/A";

      // Find related test schedule, ensuring testIds is an array
      const relatedSchedule = testSchedules.find(
        schedule => Array.isArray(schedule.testIds) && schedule.testIds.includes(test.testId)
      );

      return {
        testId: test.testId,
        candidate: {
          name: test.candidate?.name || "Unknown Candidate",
          email: test.candidate?.email || "N/A",
        },
        jobTitle: test.jobTitle,
        scheduledDate: scheduledDateIST,
        duration: test.duration,
        status: test.status,
        results: {
          correct: test.results.correct,
          wrong: test.results.wrong,
          noAttempt: test.results.noAttempt,
          total: test.questions.length,
        },
        testLink: `${process.env.APP_BASE_URL}/test/${test.testId}`,
        joiningDate: relatedSchedule?.joiningDate
          ? new Date(relatedSchedule.joiningDate).toLocaleDateString("en-US", {
              timeZone: "Asia/Kolkata",
            })
          : "N/A",
      };
    });

    console.log("✅ Tests formatted successfully");

    return res.status(200).json({
      message: "Tests retrieved successfully",
      tests: formattedTests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: await Test.countDocuments({ candidate: candidateId }),
      },
    });
  } catch (error) {
    console.error("❌ Error in GET /api/tests:", {
      message: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};


export {
  createOffer,
  getAllOffers,
  getOffersByStatus,
  getAllOffersOfIndividualCandidate,
  getCandidateOffers,
  updateOffer,
  getOfferById,
  handleDigioWebhook,
  getDigioToken,
  sendOfferRemainder,
  generateTest,
  submitTest,
  getTest,
  updateShowStatus,
  scheduleTests,
  getCandidateTests
};
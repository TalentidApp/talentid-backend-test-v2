import User from "../models/user.model.js";
import HiringCandidate from "../models/hiringCandidate.model.js";
import AdditionalDetails from "../models/additionalDetails.model.js";
import Counter from "../models/count.model.js";
import Candidate from "../models/candidate.model.js";
import Offer from "../models/offer.model.js";
import { sendMail } from "../utils/mail.js";
import { randomStringGenerator, generateResetPasswordToken, getDateDifference, user_role } from "../utils/data.js";
import axios from "axios";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const fetchAppliedCompaniesFromScreenit = async (email, token) => {
  try {
    const response = await axios.post(
      `${process.env.base_company_url}/user_data`,
      {
        user_email: process.env.secretEmail,
        candidate_email: email,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!response.data.success || !response.data.profile?.length) return [];
    return response.data.profile.map((data) => ({
      companyName: data?.orgname,
      applicantName: data?.candidate_name || "",
      appliedAt: data?.date,
      jobTitle: data?.jobtitle,
      applicationStatus: data?.applicationstatus === "Hire" ? "Selected" : "Rejected",
      currentStatus: data?.applicationstatus === "Incomplete" ? "Pending" : "Selected",
      currentRound: data?.roundname,
      rounds: [{
        roundName: data?.roundname,
        date: data?.date,
        status: data?.applicationstatus === "Incomplete" ? "Pending" : "Selected",
      }],
    }));
  } catch (error) {
    return [];
  }
};

const fetchAppliedCompaniesFromDummyBackend = async (email) => {
  try {
    const response = await axios.get(`${process.env.dummyBackendCompanyUrl}/${email}`);
    return response?.data?.data?.appliedCompanies || [];
  } catch (error) {
    return [];
  }
};

const fetchSignedOfferLetter = async (email) => {
  try {
    const offers = await Offer.find({}).populate('candidate').populate('hr');
    return offers.filter((data) => data.candidate.email === email);
  } catch (error) {
    return [];
  }
};

const fetchUserDataFromCompanies = async (email, token) => {
  try {
    const [screenitData, dummyData] = await Promise.all([
      fetchAppliedCompaniesFromScreenit(email, token),
      fetchAppliedCompaniesFromDummyBackend(email),
    ]);
    return [...screenitData, ...dummyData];
  } catch (error) {
    throw new Error("Failed to fetch user data");
  }
};

const filterCandidateData = (companiesData) =>
  companiesData.filter((company) => getDateDifference(company.appliedAt));

const searchUserInfo = async (req, res) => {
  try {
    const { email } = req.body;
    const userId = req.user.id;
    if (!email) return res.status(400).json({ message: "Email is required" });
    const user = await User.findById(userId);
    const targetUser = await User.findOne({ email });
    if (!targetUser) return res.status(404).json({ message: "user not found" });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.isVerified) return res.status(401).json({ message: "User is not verified" });
    if (user.credits <= 0) return res.status(403).json({ message: "Insufficient credits" });
    const authenticatedUser = await User.findOne({ email: process.env.secretEmail });
    if (!authenticatedUser) return res.status(404).json({ message: "Authenticated user not found" });
    const [allAppliedCompaniesData, signedOfferData, candidateData, hiringCandidateData] = await Promise.all([
      fetchUserDataFromCompanies(email, authenticatedUser.token),
      fetchSignedOfferLetter(email),
      Candidate.findOne({ email }).populate("appliedCompanies"),
      HiringCandidate.findOne({ email })
    ]);
    let offersData = [];
    if (hiringCandidateData) offersData = await Offer.find({ email });
    user.credits -= 1;
    await user.save();
    user.inviteLinks.push({ email, type: 'view' });
    await user.save();
    const filteredAppliedCompanies = filterCandidateData(allAppliedCompaniesData);
    if (!candidateData && !hiringCandidateData && allAppliedCompaniesData.length === 0 && signedOfferData.length === 0) {
      return res.status(404).json({ message: "No data found for this email.Invite them" });
    }
    const recordToAdd = candidateData || hiringCandidateData;
    if (recordToAdd) {
      user.searchHistory.push({ _id: recordToAdd._id });
      await user.save();
    }
    res.status(200).json({
      message: "User data fetched successfully",
      data: {
        filteredAppliedCompanies,
        signedOfferData,
        candidateData,
        hiringCandidateData: hiringCandidateData ? {
          ...hiringCandidateData.toObject(),
          allOfferData: offersData
        } : null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

const updateUserData = async (req, res) => {
  try {
    const {
      adminUserId,
      userId,
      fullname = null,
      email = null,
      phone = null,
      company = null,
      companySize = null,
      industry = null,
      designation = null,
      role = null,
      verifiedDocuments = null,
      isEmailVerified = null,
      isVerified = null,
      credits = null,
      subscriptionPlan = null,
      address = null,
      gender = null,
      dateOfBirth = null,
      nationality = null,
      maritalStatus = null,
      bio = null,
    } = req.body;
    if (!userId) return res.status(400).json({ message: "User ID is required", error: null, data: null });
    if (!adminUserId) return res.status(400).json({ message: "Admin User ID is required", error: null, data: null });
    if (email !== null) return res.status(400).json({ message: "Invalid email format", error: null, data: null });
    const adminUser = await User.findById(adminUserId);
    const clientUser = await User.findById(userId).populate("additionalDetails");
    if (!adminUser) return res.status(404).json({ message: "Admin user not found", error: null, data: null });
    if (!clientUser) return res.status(404).json({ message: "Client user not found", error: null, data: null });
    const updateFields = {};
    const additionalDetailsUpdates = {};
    if (fullname !== null) {
      if (!fullname.trim()) return res.status(400).json({ message: "Full name cannot be empty", error: null, data: null });
      updateFields.fullname = fullname.trim();
    }
    if (phone !== null) {
      if (phone && !/^\d{10}$/.test(phone)) return res.status(400).json({ message: "Phone must be a 10-digit number", error: null, data: null });
      updateFields.phone = phone;
    }
    if (address !== null) additionalDetailsUpdates.address = address;
    if (gender !== null) additionalDetailsUpdates.gender = gender;
    if (dateOfBirth !== null) additionalDetailsUpdates.dateOfBirth = dateOfBirth;
    if (nationality !== null) additionalDetailsUpdates.nationality = nationality;
    if (maritalStatus !== null) additionalDetailsUpdates.maritalStatus = maritalStatus;
    if (bio !== null) additionalDetailsUpdates.bio = bio;
    if (["Admin", "Super_Admin"].includes(adminUser.role)) {
      if (email !== null) updateFields.email = email;
      if (company !== null) updateFields.company = company;
      if (companySize !== null) updateFields.companySize = companySize;
      if (industry !== null) updateFields.industry = industry;
      if (designation !== null) updateFields.designation = designation;
      if (role !== null) updateFields.role = role;
      if (verifiedDocuments !== null) updateFields.verifiedDocuments = verifiedDocuments;
      if (isEmailVerified !== null) updateFields.isEmailVerified = isEmailVerified;
      if (isVerified !== null) {
        updateFields.isVerified = isVerified;
        await sendMail(clientUser.email, null, "User Verification", "verify", clientUser.fullname, null);
      }
      if (credits !== null) {
        const creditsNum = Number(credits);
        if (isNaN(creditsNum) || creditsNum < 0) return res.status(400).json({ message: "Credits must be a non-negative number", error: null, data: null });
        updateFields.credits = creditsNum;
        await sendMail(clientUser.email, null, "Credits added to your account", "credits", clientUser.fullname, creditsNum);
      }
      if (subscriptionPlan !== null) updateFields.subscriptionPlan = subscriptionPlan;
    } else {
      if (email !== null || company !== null || companySize !== null || industry !== null || designation !== null || role !== null || verifiedDocuments !== null || isEmailVerified !== null || isVerified !== null || credits !== null || subscriptionPlan !== null) {
        return res.status(403).json({ message: "Unauthorized to update admin-only fields", error: null, data: null });
      }
    }
    if (Object.keys(additionalDetailsUpdates).length > 0) {
      if (!clientUser.additionalDetails) {
        clientUser.additionalDetails = await AdditionalDetails.create(additionalDetailsUpdates);
      } else {
        await clientUser.additionalDetails.updateOne(additionalDetailsUpdates);
      }
    }
    const updatedUser = await User.findByIdAndUpdate(userId, { $set: updateFields }, { new: true, runValidators: true }).populate("additionalDetails");
    if (!updatedUser) return res.status(404).json({ message: "Failed to update user", error: null, data: null });
    return res.status(200).json({ message: "User updated successfully", error: null, data: updatedUser });
  } catch (error) {
    return res.status(500).json({ message: "Error updating user", data: null, error: error.message });
  }
};

const getAllApiCountValue = async (req, res) => {
  try {
    const apiCounts = await Counter.find({});
    return res.status(200).json({ message: "all api counts fetch successfully ", data: apiCounts, success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error in getting API count value", error: error.message });
  }
};

const getUserHistoryData = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) return res.status(400).json({ data: null, message: "User ID is required", error: null });
    const userData = await User.findById(userId).populate("searchHistory");
    if (!userData.searchHistory || userData.searchHistory.length === 0) return res.status(404).json({ data: null, message: "No history found for this user", error: null });
    userData.searchHistory.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.status(200).json({ data: userData.searchHistory, message: "User history fetched successfully", error: null });
  } catch (error) {
    return res.status(500).json({ data: null, message: "Some error occurred while fetching user history", error: error.message });
  }
};

const getUserCredits = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) return res.status(400).json({ message: "all field are required ", error: null, data: null });
    const userCredits = await User.findById(userId).select('credits');
    return res.status(200).json({ message: "user credits get success", data: userCredits, success: true });
  } catch (error) {
    return res.status(500).json({ message: "get error while update the credits " });
  }
};

const fetchAllusers = async (req, res) => {
  try {
    const users = await User.find({}).select('-token -password -searchHistory');
    return res.status(200).json({ message: "users fetched successfully", data: users, error: null });
  } catch (error) {
    return res.status(500).json({ message: "some error occurred while fetching users", data: null, error: error.message });
  }
};

const deleteUserAccount = async (req, res) => {
  try {
    const id = req.user.id;
    if (!id) return res.status(400).json({ success: false, message: 'User ID is required to delete the account.' });
    const userDetails = await User.findById(id);
    if (!userDetails) return res.status(404).json({ success: false, message: 'User not found.' });
    await User.findByIdAndDelete(id);
    await AdditionalDetails.findByIdAndDelete(userDetails.additionalDetails);
    return res.status(200).json({ success: true, message: 'User account deleted successfully.', data: userDetails });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error. Could not delete user account.', error: error.message });
  }
};

const searchCompanies = async (req, res) => {
  try {
    const users = await User.find({}).select('company');
    const companyNames = [...new Set(users.map(user => user.company).filter(Boolean))];
    if (!companyNames.length) return res.status(404).json({ message: "No companies found" });
    const companies = companyNames.map(name => ({ companyName: name }));
    res.status(200).json({ message: "Companies fetched successfully", data: companies });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

const startEngagement = async (req, res) => {
  try {
  } catch (error) {
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { mobileNumber, company, website, state, bio, employees } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    user.phone = mobileNumber || user.phone;
    user.company = company || user.company;
    if (![user_role.Sub_Admin, user_role.Super_Admin].includes(user.role)) {
      let additionalDetails = await AdditionalDetails.findOne({ _id: user.additionalDetails });
      if (!additionalDetails) {
        additionalDetails = new AdditionalDetails({ state, bio, numberOfEmployees: employees, companyWebsite: website });
        await additionalDetails.save();
        user.additionalDetails = additionalDetails._id;
      } else {
        additionalDetails.state = state || additionalDetails.state;
        additionalDetails.bio = bio || additionalDetails.bio;
        additionalDetails.numberOfEmployees = employees || additionalDetails.numberOfEmployees;
        additionalDetails.companyWebsite = website || additionalDetails.companyWebsite;
        await additionalDetails.save();
      }
    }
    await user.save();
    const updatedUser = await User.findById(userId).populate('additionalDetails');
    res.status(200).json({ success: true, message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).populate('additionalDetails').select('-password -token -resetPasswordToken -resetPasswordTokenExpires');
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.status(200).json({ success: true, user: { ...user.toObject(), additionalDetails: user.additionalDetails || null, inviteLinks: user.inviteLinks || [] } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

const sendInvite = async (req, res) => {
  try {
    const { email } = req.body;
    const userId = req.user?.id;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, message: "Invalid email address" });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    await sendMail(email, null, "Invitation to Join Talentid.app", "candidate-invite", "Candidate", null, "Candidate", "Talentid.app", null, null, null, null, { signupLink: `${process.env.frontend_url}/signup` });
    user.inviteLinks.push({ email: email, type: 'invite' });
    await user.save();
    res.status(200).json({ success: true, message: "Invitation email sent successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to send invitation email", error: error.message });
  }
};

const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Valid email is required" });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    const otp = randomStringGenerator(6, "numeric");
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    user.otp = await bcrypt.hash(otp, 10);
    user.otpExpires = otpExpires;
    await user.save();
    await sendMail(email, user._id, "Password Reset OTP", "recruiter-otp", user.fullname, null, null, null, null, null, null, null, otp);
    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to send OTP", error: error.message });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.otp || !user.otpExpires || user.otpExpires < new Date()) return res.status(400).json({ message: "OTP expired or invalid" });
    const isMatch = await bcrypt.compare(otp, user.otp);
    if (!isMatch) return res.status(400).json({ message: "Invalid OTP" });
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    user.otp = null;
    user.otpExpires = null;
    await user.save();
    res.status(200).json({ message: "OTP verified successfully", token });
  } catch (error) {
    res.status(500).json({ message: "Failed to verify OTP", error: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;
    if (!token || !password || !confirmPassword) return res.status(400).json({ message: "Token, password, and confirm password are required" });
    if (password !== confirmPassword) return res.status(400).json({ message: "Passwords do not match" });
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.password = await bcrypt.hash(password, 10);
    await user.save();
    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to reset password", error: error.message });
  }
};

export {
  searchUserInfo,
  updateUserData,
  getUserCredits,
  deleteUserAccount,
  getUserHistoryData,
  fetchAllusers,
  getAllApiCountValue,
  searchCompanies,
  sendInvite,
  updateProfile,
  getProfile,
  sendOtp,
  verifyOtp,
  resetPassword
};


import User from "../models/user.model.js";

import { sendMail } from "../utils/mail.js";

import jwt from "jsonwebtoken";

import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";

import axios from 'axios';

import AdditionalDetails from "../models/additionalDetails.model.js";

import OptForm from "../models/opt.model.js";

import Counter from "../models/count.model.js";

import Candidate from "../models/candidate.model.js";

import { emailType, getDateDifference, user_role } from "../utils/data.js";

import { allCompaniesEndpoint } from "../utils/data.js";
import Offer from "../models/offer.model.js";
import HiringCandidate from "../models/hiringCandidate.model.js";



const fetchAppliedCompaniesFromScreenit = async (email, token) => {
  try {
    console.log("Fetching data from Screenit...");
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

    console.log("Screenit response:", response.data);
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
    console.error("Error fetching data from Screenit:", error);
    return [];
  }
};

const fetchAppliedCompaniesFromDummyBackend = async (email) => {
  try {
    console.log("Fetching data from Dummy Backend...");
    const response = await axios.get(`${process.env.dummyBackendCompanyUrl}/${email}`);
    console.log("Dummy Backend response:", response.data);
    return response?.data?.data?.appliedCompanies || [];
  } catch (error) {
    console.error("Error fetching data from Dummy Backend:", error);
    return [];
  }
};

const fetchSignedOfferLetter = async (email) => {
  try {
    const offers = await Offer.find({}).populate('candidate').populate('hr');
    const userData = offers.filter((data) => data.candidate.email === email);
    console.log("Filtered user data:", userData);
    return userData;
  } catch (error) {
    console.error("Error fetching user data from our platform:", error);
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
    console.error("Error fetching user data from companies:", error);
    throw new Error("Failed to fetch user data");
  }
};

const filterCandidateData = (companiesData) =>
  companiesData.filter((company) => getDateDifference(company.appliedAt));



const searchUserInfo = async (req, res) => {
  try {
    console.log("User ID:", req.user.id);
    const { email } = req.body;
    const userId = req.user.id;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.isVerified) return res.status(401).json({ message: "User is not verified" });
    if (user.credits <= 0) return res.status(403).json({ message: "Insufficient credits" });

    const authenticatedUser = await User.findOne({ email: process.env.secretEmail });
    if (!authenticatedUser) return res.status(404).json({ message: "Authenticated user not found" });

    // Fetch all data in parallel
    const [allAppliedCompaniesData, signedOfferData, candidateData, hiringCandidateData] = await Promise.all([
      fetchUserDataFromCompanies(email, authenticatedUser.token),
      fetchSignedOfferLetter(email),
      Candidate.findOne({ email }).populate("appliedCompanies"),
      HiringCandidate.findOne({ email })
    ]);

    let offersData = [];
    if (hiringCandidateData) {
      offersData = await Offer.find({ email });
    }

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
    console.error("Error in searchUserInfo:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

const updateUserData = async (req, res) => {
  console.log("Inside updateUserData");

  try {
    // Destructure and provide default values
    const {
      adminUserId,
      userId,
      fullname = null,
      email = null,
      phone = null,
      company = null,
      role = null,
      isVerified = null,
      credits = null,
      address = null,
      gender = null,
      dateOfBirth = null,
      nationality = null,
      maritalStatus = null,
      bio = null
    } = req.body;

    console.log("Request data:", adminUserId, userId, fullname, email, phone, company, role, isVerified, credits);

    // Validate that clientUserId is provided
    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
        error: null,
        data: null,
      });
    }

    // Fetch admin and client user records
    const adminUser = await User.findById(adminUserId);
    const clientUser = await User.findById(userId).populate('additionalDetails');;

    // Check if the client user exists

    if (!clientUser) {
      return res.status(404).json({
        message: "Client user ID not found",
        error: null,
        data: null,
      });
    }

    // Check if the admin user has the required role to make certain updates

    // Create an object to store the fields that need to be updated
    const updateFields = {};

    // Fields that can be updated by both regular users and admin
    if (fullname !== null) {

      updateFields.fullname = fullname;
      updateFields.userImage = `https://api.dicebear.com/5.x/initials/svg?seed=${fullname}`

    }

    if (phone !== null) updateFields.phone = phone;
    if (address) clientUser.additionalDetails.address = address;
    if (gender) clientUser.additionalDetails.gender = gender;
    if (dateOfBirth) clientUser.additionalDetails.dateOfBirth = dateOfBirth;
    if (nationality) clientUser.additionalDetails.nationality = nationality;
    if (maritalStatus) clientUser.additionalDetails.maritalStatus = maritalStatus;
    if (bio) clientUser.additionalDetails.bio = bio;

    // Admin-only fields
    if (adminUser && adminUser.role === "Admin") {

      console.log("admin user ke andar ")
      if (email !== null) updateFields.email = email;
      if (company !== null) updateFields.company = company;
      if (role !== null) updateFields.role = role;

      if (credits !== null) {
        updateFields.credits = Number(credits);
        try {
          await sendMail(clientUser.email, null, "Credits added to your account", "credits", clientUser.fullname, updateFields.credits);
        } catch (error) {
          console.error("Error sending credits email:", error.message);
        }
      }

      if (isVerified !== null) {

        console.log("hellow ");
        updateFields.isVerified = isVerified;
        try {
          await sendMail(clientUser.email, null, "User Verification", "verify", clientUser.fullname, null);
        } catch (error) {
          console.error("Error sending verification email:", error.message);
        }
      }
    }

    // Save changes to the nested additional details if any field was modified

    await clientUser.additionalDetails.save();
    console.log("Updated fields:", updateFields);

    // Update the client user with the specified fields
    const updatedUser = await User.findByIdAndUpdate(userId, updateFields, {
      new: true, // Return the updated document
      runValidators: true, // Ensure the updated data adheres to the schema
    }).populate('additionalDetails');

    return res.status(200).json({
      message: "User updated successfully",
      error: null,
      data: updatedUser,
    });

  } catch (error) {
    console.error("Error in updateUserData:", error.message);

    return res.status(500).json({
      message: "Error updating user",
      data: null,
      error: error.message,
    });
  }
};



const getAllApiCountValue = async (req, res) => {

  try {

    const apiCounts = await Counter.find({});

    return res.status(200).json({

      message: "all api counts fetch successfully ",
      data: apiCounts,
      success: true,

    })

  } catch (error) {

    console.log("Error in getAllApiCountValue", error.message);

    return res.status(500).json({

      success: false,
      message: "Error in getting API count value",
      error: error.message,

    })
  }

}


const getUserHistoryData = async (req, res) => {

  try {

    const userId = req.user.id;

    console.log("user id is ", userId);

    // Validate the userId
    if (!userId) {
      return res.status(400).json({
        data: null,
        message: "User ID is required",
        error: null,
      });
    }

    // Fetch the user's history data from the database


    const userData = await User.findById(userId).populate("searchHistory");

    // Check if user history data exists
    if (!userData.searchHistory || userData.searchHistory.length === 0) {

      return res.status(404).json({
        data: null,
        message: "No history found for this user",
        error: null,
      });


    }
    // Sort the history array by createdAt in descending order
    userData.searchHistory.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));


    console.log("user history at login", userData.searchHistory);


    // Return the user's history data

    return res.status(200).json({
      data: userData.searchHistory,
      message: "User history fetched successfully",
      error: null,

    });

  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      data: null,
      message: "Some error occurred while fetching user history",
      error: error.message,
    });
  }
};




const getUserCredits = async (req, res) => {

  try {

    const userId = req.user.id;

    if (!userId) {

      return res.status(400).json(({


        message: "all field are required ",
        error: null,
        data: null,

      }))

    }

    const userCredits = await User.findById(userId).select('credits');

    return res.status(200).json({

      message: "user credits get success",
      data: userCredits,
      success: true,
    })

  } catch (error) {

    console.log(error);

    return res.status(500).json({

      message: "get error while update the credits  "
    })

  }
}



const fetchAllusers = async (req, res) => {

  try {

    const users = await User.find({}).select('-token -password -searchHistory'); // Exclude token and password
    // Exclude searchHistory


    return res.status(200).json({

      message: "users fetched successfully",
      data: users,
      error: null,

    })


  } catch (error) {

    console.log("error", error);

    return res.status(500).json({

      message: "some error occurred while fetching users",
      data: null,
      error: error.message,

    })

  }
}


// delete the users account 

const deleteUserAccount = async (req, res) => {
  try {

    const id = req.user.id;

    // Check if ID is provided

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required to delete the account.',
      });
    }

    // Find and delete the user

    const userDetails = await User.findById(id);

    // If user is not found

    if (!deletedUser) {

      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });

    }

    // find additional details 

    const findAdditionalDetails = await AdditionalDetails.findByIdAndDelete(userDetails._id);

    // Successful deletion
    return res.status(200).json({
      success: true,
      message: 'User account deleted successfully.',
      data: deletedUser, // Optional: return deleted user info
    });
  } catch (error) {
    console.error('Error deleting user account:', error.message);
    return res.status(500).json({

      success: false,
      message: 'Server error. Could not delete user account.',
      error: error.message

    });
  }
};


const searchCompanies = async (req, res) => {
  try {
    const users = await User.find({}).select('company');
    const companyNames = [...new Set(users.map(user => user.company).filter(Boolean))]; 

    if (!companyNames.length) {
      return res.status(404).json({ message: "No companies found" });
    }

    const companies = companyNames.map(name => ({ companyName: name }));

    res.status(200).json({
      message: "Companies fetched successfully",
      data: companies,
    });
  } catch (error) {
    console.error("Error in searchCompanies:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// now i have to start the engagement server 

const startEngagement = async (req, res) => {

  try {


    // 1. it should difference bw the offer date and the joining date 
    // 2. you should have send atleast five skills of that candidate 
    // 3. now we have to send the skills to the openAI in order to generate questions but the number of questions depends on diff bw thw offer and joining date

  } catch (error) {

    console.error("error in startEngagement", error.message);


  }
}

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      mobileNumber,
      company,
      website,
      state,
      bio,
      employees
    } = req.body;

    console.log('rfr')

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Update user fields
    user.phone = mobileNumber || user.phone;
    user.company = company || user.company;

    // For non-admin users, update additional details
    if (![user_role.Sub_Admin, user_role.Super_Admin].includes(user.role)) {
      // Update or create additional details
      let additionalDetails = await AdditionalDetails.findOne({ _id: user.additionalDetails });

      if (!additionalDetails) {
        additionalDetails = new AdditionalDetails({
          state,
          bio,
          numberOfEmployees: employees,
          companyWebsite: website
        });
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

    // Populate additional details for response
    const updatedUser = await User.findById(userId).populate('additionalDetails');

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId)
      .populate('additionalDetails')
      .select('-password -token -resetPasswordToken -resetPasswordTokenExpires');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      user: {
        ...user.toObject(),
        additionalDetails: user.additionalDetails || null,
        inviteLinks: user.inviteLinks || []
      }
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

const sendInvite = async (req, res) => {
  try {
    const { email } = req.body;
    const userId = req.user?.id; // Assuming you have user authentication middleware providing the user ID

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid email address" });
    }

    // Check if email already exists in inviteLinks
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // if (user.inviteLinks.includes(email)) {
    //   return res.status(400).json({ success: false, message: "This email has already been invited" });
    // }

    await sendMail(
      email,
      null,
      "Invitation to Join Talentid.app",
      "candidate-invite",
      "Candidate",
      null,
      "Candidate",
      "Talentid.app",
      null,
      null,
      null,
      null,
      { signupLink: `${process.env.frontend_url}/signup` }
    );

    user.inviteLinks.push({ 
      email: email, 
      type: 'invite' 
    });
    await user.save();

    res.status(200).json({ success: true, message: "Invitation email sent successfully" });
  } catch (error) {
    console.error("Error sending invite email:", error);
    res.status(500).json({ success: false, message: "Failed to send invitation email", error: error.message });
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
  sendInvite
};



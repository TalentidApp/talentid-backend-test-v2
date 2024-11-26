

import User from "../models/user.model.js";

import { sendMail } from "../utils/mail.js";

import jwt from "jsonwebtoken";

import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";

import axios from 'axios'; // Make sure to install axios if you haven't

import AdditionalDetails from "../models/additionalDetails.model.js";

import OptForm from "../models/opt.model.js";

import Counter from "../models/count.model.js";

import Candidate from "../models/candidate.model.js";

import { emailType, getDateDifference } from "../utils/data.js";

import { allCompaniesEndpoint } from "../utils/data.js";



// Utility function to handle API requests

const fetchAppliedCompaniesFromScreenit = async (email, token) => {

  console.log("scrneet ke andar ")
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

  // Process profile data
  return response.data.profile.map((data) => ({
    companyName: data?.org_name,
    applicantName: data?.candidate_name,
    appliedAt: data?.start_time,
    jobTitle: data?.job_title,
    applicationStatus: data?.recommended_status,
    currentStatus: data?.interview_status,
    currentRound: data?.round_name,
    rounds: [
      {
        roundName: data?.round_name,
        date: data?.start_time,
        status: data?.interview_status,
      },
    ],
  }));
};




const fetchAppliedCompaniesFromDummyBackend = async (email) => {

  console.log("dummy ke andar ");

  const response = await axios.get(`${process.env.dummyBackendCompanyUrl}/${email}`);
  if (!response?.data?.data?.appliedCompanies) return [];

  return response.data.data.appliedCompanies;
};



const fetchUserDataFromCompanies = async (email, token) => {
  try {
    const [screenitData, dummyData] = await Promise.all([
      fetchAppliedCompaniesFromScreenit(email, token),
      fetchAppliedCompaniesFromDummyBackend(email),
    ]);

    // Combine data from both sources
    return [...screenitData, ...dummyData];
  } catch (error) {
    console.error("Error fetching user data from companies:", error);
    throw new Error("Failed to fetch user data");
  }

  finally {


    try{

      await Promise.all([
  
        allCompaniesEndpoint.map(async (endpointUrl) => {
  
          const existingCounter = await Counter.findOne({ endpoint: endpointUrl });
  
          if (!existingCounter) {
            console.log("Counter does not exist, creating a new one...");
  
            // Create and save a new counter
            const newCounter = new Counter({
              endpoint: endpointUrl,
              count: 1,
            });
            await newCounter.save();
          } else {
            console.log("Counter exists, incrementing count...");
            // Increment the counter and save
            existingCounter.count += 1;
            await existingCounter.save();
          }
  
        })
  
      ])

    }

    catch(error){

      console.log("Error in updating counter : ", error);

      throw new Error ("error occur in update the counter");

    }

  }
};



// Filter out candidates with outdated application data
const filterCandidateData = (companiesData) =>
  companiesData.filter((company) => getDateDifference(company.appliedAt));


// Main controller
const searchUserInfo = async (req, res) => {
  try {
    const { email, userId } = req.body;
    if (!email || !userId) {
      return res.status(400).json({ message: "Both email and userId are required" });
    }

    // Validate the user initiating the search
    const isUserFound = await User.findById(userId);
    if (!isUserFound) return res.status(404).json({ message: "User not found" });
    if (!isUserFound.isVerified) return res.status(401).json({ message: "User is not verified" });
    if (isUserFound.credits <= 0) return res.status(403).json({ message: "Insufficient credits" });

    // Get authenticated admin user
    const authenticatedUser = await User.findOne({ email: process.env.secretEmail });
    if (!authenticatedUser) {
      return res.status(404).json({ message: "Authenticated user not found" });
    }

    // Fetch data from companies

    var allAppliedCompaniesData;

    try{

       allAppliedCompaniesData = await fetchUserDataFromCompanies(email, authenticatedUser.token);
       isUserFound.credits -= 1;

       await isUserFound.save();

    }catch(error){

      return res.status(500).json({

        message:"Error fetching the companies data ",
        data : null,
        error:null

      })

    }

    // Filter outdated data
    const filteredAppliedCompanies = filterCandidateData(allAppliedCompaniesData);
    if (filteredAppliedCompanies.length === 0) {

      return res.status(404).json({ message: "No data found for this email" });
      
    }

    // Save the candidate's data
    const candidate = await Candidate.create({
      email,
      appliedCompanies: filteredAppliedCompanies,
    });

    // Update search history for the user
    isUserFound.searchHistory.push({ _id: candidate._id });
    await isUserFound.save();

    // Respond with the fetched data
    res.status(200).json({
      message: "User data fetched successfully",
      data: filteredAppliedCompanies,
    });
  } catch (error) {
    console.error("Error in searchUserInfo:", error.message);
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

    // Extract the userId from the request parameters

    const { userId } = req.params;

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

    const { userId } = req.params;

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
    const { id } = req.query; // Get the user ID from the query parameters

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




export {

  searchUserInfo,
  updateUserData,
  getUserCredits,
  deleteUserAccount,
  getUserHistoryData,
  fetchAllusers,
  getAllApiCountValue,
};



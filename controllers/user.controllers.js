
import { users } from "../db/dummy.db.js";

import User from "../models/user.model.js";

import bcrypt from "bcryptjs";

import { sendMail } from "../utils/mail.js";

import jwt from "jsonwebtoken";

import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";

import axios from 'axios'; // Make sure to install axios if you haven't

import AdditionalDetails from "../models/additionalDetails.model.js";

import OptForm from "../models/opt.model.js";


const signupUser = async (req, res) => {
  try {
    const { fullname, email, phone, company, role, password } = req.body;

    if (!fullname || !email || !phone || !company || !role || !password) {

      res.status(400).json({

        data: null,
        message: "Please provide all the required fields",

      })

    }

    const user = await User.findOne({ email });

    if (user) {

      return res.status(400).json({ message: "User already exist" });
    }

    const hashedPassword = await bcrypt.hash(password, 6);

    const createAdditionalDetails = await AdditionalDetails.create({


      gender: null,
      address: null,
      dateOfBirth: null,
      nationality: null,
      maritalStatus: null,
      bio: null,

    });

    const newUser = new User({
      fullname,
      email,
      phone,
      company,
      role,
      additionalDetails: createAdditionalDetails._id,
      userImage: `https://api.dicebear.com/5.x/initials/svg?seed=${fullname}`,
      password: hashedPassword,
    });

    await newUser.save();

    return res.status(200).json({

      success: true,
      data: newUser,
      message: "User registered successfully",
      error: null,

    })

  } catch (error) {

    res.status(500).json({ message: error.message });
    console.log("Error in signupUser", error.message);

  }
};


// JWT secret and expiration (add this to your .env file)



const loginUser = async (req, res) => {

  console.log("Inside login controller");

  try {
    const { email, password } = req.body;

    // Check if email or password are missing
    if (!email || !password) {
      return res.status(400).json({
        data: null,
        message: "All fields are required",
        error: null,
      });
    }

    // Find user by email and populate additional details
    const user = await User.findOne({ email }).populate('additionalDetails');

    console.log("user is at login ", user);

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Check if the user is verified
    if (!user.isVerified) {
      return res.status(401).json({
        message: "User is not verified",
        error: null,
        data: null,
      });
    }

    // Check if the password is correct
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Generate JWT Token
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '7d', // Manually set expiration to 7 days
    });

    // Set the token as an HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,   // Cookie can't be accessed via JavaScript
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days expiration in milliseconds
    });

    // Generate external token
    try {
      const data = await axios.get(`${process.env.base_company_url}/generate_token/${email}`);
      console.log("Generated external token: ", data.data.token);
      user.token = data.data.token;
    } catch (error) {
      return res.status(500).json({
        data: null,
        message: "Error while generating external token",
        error: error.message,
      });
    }

    await user.save();

    // Respond with user data (without password)
    res.status(201).json({
      _id: user._id,
      fullname: user.fullname,
      userImage: user.userImage,
      email: user.email,
      phone: user.phone,
      company: user.company,
      role: user.role,
      token: user.token,
      credits: user.credits,
      additionalDetails: user.additionalDetails, // Include populated additional details
      message: "Login successful",

    });

  } catch (error) {
    res.status(500).json({ message: error.message });
    console.log("Error in loginUser:", error.message);
  }
};



// update the user Data 

// this can be used by admin and user both 



const updateUserData = async (req, res) => {

  try {

    const {
      adminUserId,
      clientUserId,
      fullname = null,
      email = null,
      phone = null,
      company = null,
      role = null,
      isVerified = null,
      credits = null,
    } = req.body;

    console.log("at backend ", adminUserId, clientUserId);

    if (!clientUserId) {
      return res.status(400).json({
        message: "User ID is required",
        error: null,
        data: null,
      });
    }

    // Check if the admin user exists 

    const isAdminUserExists = await User.findById(adminUserId);

    // check if the client user exits 

    const isClientUserExists = await User.findById(clientUserId);

    if (!isClientUserExists) {

      return res.status(404).json({
        message: "client user id not found",
        error: null,
        data: null,
      });

    }

    // Create an object to store the fields that need to be updated
    const updateFields = {};

    if (fullname !== null) updateFields.fullname = fullname;
    if (email !== null) updateFields.email = email;
    if (phone !== null) updateFields.phone = phone;
    if (company !== null) updateFields.company = company;
    if (role !== null) updateFields.role = role;
    if (isVerified !== null && isAdminUserExists.role == "Admin") {


      await sendMail(isClientUserExists.email, null, "User Verfication", "verify", isClientUserExists.fullname, null);

      updateFields.isVerified = isVerified;

    }


    if (credits !== null && isAdminUserExists.role == "Admin") {

      try {

        await sendMail(isClientUserExists.email, null, "credit added to your account", "credits", isClientUserExists.fullname, isClientUserExists.credits + credits);

      } catch (e) {

        console.log(e.message);

        return res.status(400).json({

          message: "error while sending sending mail ",
          data: null,
          error: e.message,

        })
      }


      updateFields.credits = isClientUserExists.credits + Number(credits);

    }



    console.log("updated fields ", updateFields);

    // Update the user with the specified fields
    const updatedUser = await User.findByIdAndUpdate(clientUserId, updateFields, {
      new: true, // Return the updated document
      runValidators: true, // Ensure the updated data adheres to the schema
    });

    return res.status(200).json({
      message: "User updated successfully",
      error: null,
      data: updatedUser,
    });


  } catch (e) {

    return res.status(500).json({

      message: "error updating user",
      data: null,
      error: e.message,

    })

  }

};




const searchUserInfo = async (req, res) => {

  try {
    const { email, userId } = req.body;

    console.log("Email at backend:", email);

    if (!email || !userId) {

      return res.status(400).json({ message: "Both email and userId are required" });


    }


    if (isUserHasSubmittedOptForm) {

      return res.status(400).json({

        message: "no user exists with this email",
        erorr: "no user exists with this email",
        data: null,

      });

    }

    // check person who want to serach other candidate has valid user id 

    const isUserFound = await User.findById(userId);

    if (!isUserFound) {

      return res.status(404).json({ message: "User not found" });

    }

    if (isUserFound && !isUserFound.isVerified) {

      return res.status(401).json({ message: "User is not verified" });

    }

    // Check if the authenticated user has enough credits
    if (isUserFound.credits <= 0) {

      return res.status(403).json({ message: "Insufficient credits" });

    }


    // Find the authenticated user by their ID

    const authenticatedUser = await User.findOne({ email: process.env.secretEmail });

    console.log("authen user ", authenticatedUser);

    if (!authenticatedUser) {

      return res.status(404).json({ message: "Authenticated user not found" });

    }


    // Make an external API call to fetch the user data by email
    let apiResponse;
    try {

      apiResponse = await axios.post(
        'https://org.screenit.io/v2/api/service/user_data',
        {
          user_email: process.env.secretEmail, // Authenticated user email
          candidate_email: email, // Searched user email
        },
        {
          headers: {
            Authorization: `Bearer ${authenticatedUser.token}`,

          }
        }
      );

    } catch (error) {
      console.log("error hai bhai ", error);
      return res.status(500).json({ message: "Error fetching user data from external API" });
    }

    console.log("API response:", apiResponse.data);

    if (apiResponse.status == 200 && apiResponse.success == false) { // that means user not found 

      isUserFound.credits -= 1;

    }

    const user = apiResponse.data;

    console.log(apiResponse);

    if (!apiResponse.data.success) {

      return res.status(404).json({

        message: apiResponse.data.msg.name || apiResponse.data.msg,

        error: apiResponse.data.msg.message,

        data: null

      });

    }

    const profile = apiResponse.data.profile[0];

    // Decrement the authenticated user's credits and update the search history


    console.log("profile data is ", profile);

    isUserFound.credits -= 1;

    // we check here the user which he going to search has submitted opt form or not 

    const isUserHasSubmittedOptForm = await OptForm.findOne({

      email: email,

    })

    isUserFound.searchHistory.push({
      email: email,
      candidate_name: profile?.candidate_name,
      org_name: profile?.org_name,
      job_title: profile.job_title,  // Add appropriate value
      start_time: new Date(),  // Add the actual start time
      round_name: profile.round_name,  // Add appropriate value
      recommended_status: profile.recommended_status,  // Add appropriate value
      interview_status: profile.interview_status,  // Add appropriate value
      timestamp: new Date(),
    });

    // Save the updated authenticated user info

    await isUserFound.save();

    // Respond with success and the fetched user data
    return res.status(200).json({

      message: "User data fetch was successful",
      data: user,
      error: null,

    });

  } catch (error) {

    res.status(500).json({ message: error.message });
    console.log("Error in searchUserInfo", error.message);

  }
};



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

    const userData = await User.findById(userId).sort({ createdAt: -1 }); // -1 for descending order

    // Check if user history data exists
    if (!userData.searchHistory || userData.searchHistory.length === 0) {

      return res.status(404).json({
        data: null,
        message: "No history found for this user",
        error: null,
      });
    }


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




const resetPassword = async (req, res) => {

  try {

    console.log("reset pass ke andar ");

    const { password, confirmPasswordValue, userId } = req.body;

    console.log("password ", password, " confirm password ", confirmPasswordValue, " userId ", userId);

    if (!password || !confirmPasswordValue || !userId) {

      return res.status(400).json({

        data: null,
        message: "Please provide all the required fields",
        error: null,

      })
    }


    // const user = await User.findById(req.user._id); // cookies are not works 

    const user = await User.findById(userId);

    if (!user) {

      return res.status(404).json({ message: "User not found" });

    }

    if (!bcrypt.compare(password, user.password)) {

      return res.status(404).json({

        message: "password mismatch",
        data: null,
        erorr: null,

      })

    }

    const hashedPassword = await bcrypt.hash(confirmPasswordValue, 6);

    user.password = hashedPassword;

    await user.save();

    return res.status(200).json({

      message: "Password updated successfully",
      data: null,
      error: null,

    });

  } catch (error) {

    return res.status(500).json({

      data: null,
      message: error.message

    });

  }

}




// TODO we have to do it 

const forgotPasswordEmail = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if email is provided
    if (!email) {
      return res.status(400).json({
        data: null,
        message: "Please provide an email address.",
        error: null,
      });
    }

    // Find user by email
    const findUser = await User.findOne({ email });

    if (!findUser) {
      return res.status(404).json({
        data: null,
        message: "No user found with this email address.",
        error: null,
      });
    }

    // Send the forgot password email
    await sendMail(email, findUser._id, "Reset Your Password", "resetPassword", findUser.fullname);

    // Send success response
    return res.status(200).json({
      data: null,
      message: "Forgot password link has been sent to your email.",
      error: null,
    });

  } catch (error) {
    console.log(error.message);

    return res.status(500).json({
      success: false,
      data: null,
      error: error.message,
      message: "An error occurred while sending the email.",
    });
  }
};




const forgotPassword = async (req, res) => {
  try {
    const { password, confirmPassword, userId } = req.body;

    // Check for required fields
    if (!password || !confirmPassword || !userId) {
      return res.status(400).json({
        data: null,
        message: "All fields are required",
        error: null,
      });
    }

    // Ensure passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({
        data: null,
        message: "Passwords do not match",
        error: null,
      });
    }

    // Find the user by ID
    const findUser = await User.findById(userId);

    // Function to check if the token is expired
    const isTokenExpired = (tokenExpires) => {

      return Date.now() > new Date(tokenExpires).getTime();

    };

    if (isTokenExpired(findUser.resetPasswordTokenExpires)) {

      return res.status(404).json({

        data: null,
        message: "Token is expired plz create forgot password request again",
        error: null,

      })

    }

    if (!findUser) {
      return res.status(404).json({
        data: null,
        message: "No user found with this user ID",
        error: null,
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 6);
    console.log("hashed password: " + hashedPassword);

    // Update the user's password
    findUser.password = hashedPassword;
    await findUser.save();

    return res.status(200).json({
      message: "Password updated successfully",
      data: null,
      error: null,
    });

  } catch (error) {
    console.log(error.message);
    res.status(500).json({
      data: null,
      message: "Some error occurred while updating password",
      error: error.message,
    });
  }
};



const logout = async (req, res) => {

  try {

    console.log("hii1")

    // Check if user exists
    // if (!req.cookies.jwt) {
    //   return res.status(400).json({
    //     message: "No user found",
    //     data: null,
    //     error: null,
    //   });
    // }

    // Clear the JWT cookie
    res.clearCookie("jwt", { path: "/" });

    // Send a success response
    res.status(200).json({

      msessage: "user logged out successfully",
      data: null,
      error: null,

    }); // 204 No Content for successful logout


  } catch (error) {
    // Handle any errors that occurred during logout
    res.status(500).json({
      data: null,
      message: "Some error occurred while logging out",
      error: error.message,
    });
  }
};


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



export { searchUserInfo, updateUserData, signupUser, loginUser, deleteUserAccount, getUserHistoryData, fetchAllusers, resetPassword, forgotPassword, forgotPasswordEmail, logout };



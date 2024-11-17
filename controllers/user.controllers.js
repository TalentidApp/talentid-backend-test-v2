
import { users } from "../db/dummy.db.js";

import User from "../models/user.model.js";

import bcrypt from "bcryptjs";

import { sendMail } from "../utils/mail.js";

import jwt from "jsonwebtoken";

import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";

import axios from 'axios'; // Make sure to install axios if you haven't

import AdditionalDetails from "../models/additionalDetails.model.js";

import OptForm from "../models/opt.model.js";

import Counter from "../models/count.model.js";

import Candidate from "../models/candidate.model.js";

import { emailType, getDateDifference } from "../utils/data.js";


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

    // now we are going to verfify user Email

    try {

      await sendMail(email, newUser._id, "Eamil Verification", "verifyEmail", newUser.fullname);

    } catch (error) {

      return res.status(400).json({

        success: false,
        data: newUser,
        message: "some error occured while send mail ",
        error: null,

      })
    }


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



const verifyUserEmail = async (req, res) => {

  try {

    console.log("verify user email ke andar ")

    const { token } = req.params;

    if (!token) {

      return res.status(400).json({
        data: null,
        message: "Token not found",
        error: null,

      })

    }

    let newToken = token.split(" ")[0];

    console.log("new token ",newToken);

    const findUser = await User.findOne({ token: newToken });

    console.log("find user is ",findUser);

    if (findUser) {

      findUser.isEmailVerified = true;
      findUser.token ="";
      await findUser.save();

      return res.status(200).json({

        success: true,
        data: null,
        message: "User email verified successfully",
        error: null,
      })
    }

    return res.status(400).json({

      success: false,
      data: null,
      message: "token is not valid or token is expired ",
      error: null,
    })

  } catch (error) {

    res.status(500).json({ message: error.message });

  }
}

// JWT secret and expiration (add this to your .env file)



const loginUser = async (req, res) => {

  // console.log("Inside login controller");

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

    // console.log("user is at login ", user);

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
      // console.log("Generated external token: ", data.data.token);
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
    // console.log("Error in loginUser:", error.message);
  }
};



// update the user Data 

// this can be used by admin and user both 


// import AdditionalDetails from "../models/additionalDetails.model.js";

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




const searchUserInfo = async (req, res) => {

  try {
    const { email, userId } = req.body;

    console.log("Email at backend:", email);

    if (!email || !userId) {

      return res.status(400).json({ message: "Both email and userId are required" });


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
    // try {

    //   const existingCounter = await Counter.findOne({ endpoint: `${process.env.base_company_url}/user_data` });

    //   console.log(existingCounter);

    //   if (!existingCounter) {
    //     console.log("Counter does not exist, creating a new one...");

    //     // Create and save a new counter for the endpoint
    //     const newCounter = new Counter({
    //       endpoint: `${process.env.base_company_url}/user_data`,
    //       count: 1,
    //     });
    //     await newCounter.save();

    //   } else {
    //     // If it exists, increment the count and save it
    //     console.log("Counter exists, incrementing count...");
    //     existingCounter.count += 1;
    //     await existingCounter.save();
    //   }

    //   // apiResponse = await axios.post(
    //   //   `${process.env.base_company_url}/user_data`,
    //   //   {
    //   //     user_email: process.env.secretEmail, // Authenticated user email
    //   //     candidate_email: email, // Searched user email
    //   //   },
    //   //   {
    //   //     headers: {
    //   //       Authorization: `Bearer ${authenticatedUser.token}`,

    //   //     }
    //   //   }
    //   // );

    apiResponse = await axios.get(`https://dummy-backend-five.vercel.app/getCandidateData/${email}`);


    // } catch (error) {
    //   console.log("error hai bhai ", error);
    //   return res.status(500).json({ message: "Error fetching user data from external API" });
    // }

    console.log("API response:", apiResponse?.data?.data);

    // if (apiResponse?.status == 200 && apiResponse?.success == false) { // that means user not found 

    //   isUserFound.credits -= 1;

    // }

    const user = apiResponse?.data?.data;


    // if (!apiResponse?.data?.success) {

    //   return res.status(404).json({

    //     message: apiResponse?.data?.msg?.name || apiResponse?.data?.msg,

    //     error: apiResponse?.data?.msg?.message,

    //     data: null

    //   });

    // }

    const profile = apiResponse?.data?.data;

    // Decrement the authenticated user's credits and update the search history


    console.log("profile data is ", profile);

    // if (apiResponse?.data?.profile.length == 0) {

    //   return res.status(403).json({

    //     message: "no user exists with the specified email",
    //     data: null,
    //     error: "no user exists with the specified email"

    //   })
    // }

    isUserFound.credits -= 1;

    // we check here the user which he going to search has submitted opt form or not 

    const isUserHasSubmittedOptForm = await OptForm.findOne({

      email: email,

    })

    if (isUserHasSubmittedOptForm) {

      await isUserFound.save();

      return res.status(400).json({

        message: "no user exists with this email",
        erorr: "no user exists with this email",
        data: null,

      });


    } else {

      // console.log("actual profile data ",profile);


      // isUserFound.searchHistory.push({

      //   email:email,
      //   candidate_name:profile[0].candidate_name,
      //   org_name: profile.org_name,
      //   job_title: profile.job_title,  // Add appropriate value
      //   start_time: new Date(),  // Add the actual start time
      //   round_name: profile.round_name,  // Add appropriate value
      //   recommended_status: profile.recommended_status,  // Add appropriate value

      //   interview_status: profile.interview_status,  // Add appropriate value
      //   timestamp: new Date(),  // Add the actual start time

      // });

      //first we create a new candidate 

      // const actualData = {
      //   "email": "lavanyamrinalini@gmail.com",
      //   "appliedCompanies": [
      //     {
      //       "companyName": "Company XYZ",
      //       "applicantName": "John Doe",
      //       "jobTitle": "Software Engineer",
      //       "appliedAt": "2024-11-01",
      //       "applicationStatus": "Pending",
      //       "rounds": [
      //         {
      //           "roundName": "Technical Interview",
      //           "date": "2024-11-05",
      //           "status": "Completed",
      //           "feedback": "Great technical skills"
      //         }
      //       ],
      //       "currentRound": "HR Interview",
      //       "currentStatus": "Pending"
      //     },
      //     {
      //       "companyName": "ddd XYZ",
      //       "applicantName": "John Doe",
      //       "jobTitle": "Software Engineer",
      //       "appliedAt": "2024-11-01",
      //       "applicationStatus": "Pending",
      //       "rounds": [
      //         {
      //           "roundName": "Screening Interview",
      //           "date": "2024-11-05",
      //           "status": "Selected",
      //           "feedback": "Great technical skills"

      //         },
      //         {
      //           "roundName": "Technical Interview",
      //           "date": "2024-11-05",
      //           "status": "Selected",
      //           "feedback": "Great technical skills"
      //         },
      //         {

      //           "roundName": "HR Interview",
      //           "date": "2024-11-05",
      //           "status": "Pending",
      //           "feedback": "Great technical skills"

      //         }
      //       ],
      //       "currentRound": "HR Interview",
      //       "currentStatus": "Pending"
      //     }
      //   ]
      // }

      console.log("profile is ", profile);

      let filteredAppliedCompanies = profile.appliedCompanies.filter((company) => {

        if (getDateDifference(company.appliedAt)) {

          return company;

        }

      });


      const candidate = await Candidate.create({
        email: email,
        appliedCompanies: filteredAppliedCompanies
      });


      // await Candidate.save();

      isUserFound.searchHistory.push({

        _id: candidate._id,

      })

      // Save the updated isUserFound document
      await isUserFound.save();

      // Respond with success and the fetched user data
      return res.status(200).json({

        message: "User data fetch was successful",
        data: filteredAppliedCompanies,
        error: null,

      });


    }

  } catch (error) {

    res.status(500).json({ message: error.message });
    console.log("Error in searchUserInfo", error.message);

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



export {
  verifyUserEmail,
  searchUserInfo, updateUserData, getUserCredits, signupUser,
  getAllApiCountValue, loginUser, deleteUserAccount, getUserHistoryData
  , fetchAllusers, resetPassword, forgotPassword, forgotPasswordEmail,
  logout
};



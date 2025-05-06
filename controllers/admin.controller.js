import HiringCandidate from "../models/hiringCandidate.model.js";
import User from "../models/user.model.js";
import bcrypt from "bcrypt";
import { user_role } from "../utils/data.js";
import AdditionalDetails from "../models/additionalDetails.model.js";
import { sendMail } from "../utils/mail.js"; // Added missing import for sendMail

async function getAllRecruiters(req, res) {
  try {
    const userData = await User.find({
      role: { $nin: [user_role.Sub_Admin, user_role.Super_Admin] },
    }).select("-password -token");

    return res.status(200).json({
      success: true,
      data: userData,
      message: "All recruiters fetched successfully",
    });
  } catch (error) {
    console.error("Error in getAllRecruiters:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

async function getAllCandidates(req, res) {
  try {
    const userData = await HiringCandidate.find({});

    return res.status(200).json({
      success: true,
      data: userData,
      message: "All candidates fetched successfully",
    });
  } catch (error) {
    console.error("Error in getAllCandidates:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

async function fetchAllAdmin(req, res) {
  try {
    const userData = await User.find({
      role: { $in: [user_role.Sub_Admin, user_role.Super_Admin] },
    }).select("fullname email role");

    return res.status(200).json({
      success: true,
      data: userData,
      message: "All admins fetched successfully",
    });
  } catch (error) {
    console.error("Error in fetchAllAdmin:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

async function createNewAdmin(req, res) {
  try {
    const { fullname, email, password, role } = req.body;
    const adminUserId = req.user.id;

    if (!fullname || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "All fields (fullname, email, password, role) are required",
      });
    }

    const adminUser = await User.findById(adminUserId);
    if (!adminUser || adminUser.role !== user_role.Super_Admin) {
      return res.status(403).json({
        success: false,
        message: "Only Super Admin can create new admins",
      });
    }

    if (![user_role.Sub_Admin, user_role.Super_Admin].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be Sub_Admin or Super_Admin",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already in use",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      fullname,
      email,
      password: hashedPassword,
      role,
      company: "Talent ID",
    });

    await user.save();

    return res.status(201).json({
      success: true,
      message: "Admin created successfully",
      data: {
        _id: user._id,
        fullname: user.fullname,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error in createNewAdmin:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}


const updateUserData = async (req, res) => {
  try {
    const {
      adminUserId,
      userId,
      fullname,
      email,
      phone,
      company,
      companySize,
      industry,
      designation,
      role,
      isVerified,
      isEmailVerified,
      credits,
      subscriptionPlan,
      address,
      gender,
      dateOfBirth,
      nationality,
      maritalStatus,
      bio,
      notificationPreferences,
      verifiedDocuments,
    } = req.body;

    if (!adminUserId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Admin user ID and user ID are required",
        error: null,
        data: null,
      });
    }

    const adminUser = await User.findById(adminUserId);
    const clientUser = await User.findById(userId).populate("additionalDetails");

    if (!adminUser || ![user_role.Admin, user_role.Super_Admin].includes(adminUser.role)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin or Super Admin can update user data",
        error: null,
        data: null,
      });
    }

    if (!clientUser) {
      return res.status(404).json({
        success: false,
        message: "Client user not found",
        error: null,
        data: null,
      });
    }

    if ([user_role.Sub_Admin, user_role.Super_Admin].includes(clientUser.role)) {
      return res.status(400).json({
        success: false,
        message: "Cannot update document verification for admin users",
        error: null,
        data: null,
      });
    }

    if (email && email !== clientUser.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email already in use",
          error: null,
          data: null,
        });
      }
    }

    const updateFields = {};
    if (fullname !== undefined) {
      updateFields.fullname = fullname;
      updateFields.userImage = `https://api.dicebear.com/5.x/initials/svg?seed=${fullname}`;
    }
    if (email !== undefined) updateFields.email = email;
    if (phone !== undefined) updateFields.phone = phone;
    if (company !== undefined) updateFields.company = company;
    if (companySize !== undefined) updateFields.companySize = companySize;
    if (industry !== undefined) updateFields.industry = industry;
    if (designation !== undefined) updateFields.designation = designation;
    if (role !== undefined) updateFields.role = role;
    if (subscriptionPlan !== undefined) updateFields.subscriptionPlan = subscriptionPlan;
    if (isEmailVerified !== undefined) updateFields.isEmailVerified = isEmailVerified;
    if (notificationPreferences !== undefined) updateFields.notificationPreferences = notificationPreferences;

    if (isVerified !== undefined) {
      updateFields.isVerified = isVerified;
      try {
        await sendMail(clientUser.email, null, "User Verification", "verify", clientUser.fullname, null);
      } catch (error) {
        console.error("Error sending verification email:", error.message);
      }
    }

    if (credits !== undefined) {
      updateFields.credits = Number(credits);
      try {
        await sendMail(clientUser.email, null, "Credits added to your account", "credits", clientUser.fullname, updateFields.credits);
      } catch (error) {
        console.error("Error sending credits email:", error.message);
      }
    }

    if (verifiedDocuments !== undefined) {
      updateFields.verifiedDocuments = verifiedDocuments;
      try {
        const emailSubject = verifiedDocuments
          ? "Your Documents Have Been Verified"
          : "Your Document Verification Has Been Revoked";
        const emailType = verifiedDocuments ? "document-verified" : "document-unverified";
        await sendMail(
          clientUser.email,
          clientUser._id,
          emailSubject,
          emailType,
          clientUser.fullname,
          null
        );
      } catch (error) {
        console.error("Error sending document verification email:", error.message);
      }
    }

    // Update additional details if they exist
    if (clientUser.additionalDetails) {
      if (address !== undefined) clientUser.additionalDetails.address = address;
      if (gender !== undefined) clientUser.additionalDetails.gender = gender;
      if (dateOfBirth !== undefined) clientUser.additionalDetails.dateOfBirth = dateOfBirth;
      if (nationality !== undefined) clientUser.additionalDetails.nationality = nationality;
      if (maritalStatus !== undefined) clientUser.additionalDetails.maritalStatus = maritalStatus;
      if (bio !== undefined) clientUser.additionalDetails.bio = bio;
      await clientUser.additionalDetails.save();
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateFields, {
      new: true,
      runValidators: true,
    }).populate("additionalDetails");

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      error: null,
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error in updateUserData:", error.message);
    return res.status(500).json({
      success: false,
      message: "Error updating user",
      data: null,
      error: error.message,
    });
  }
};


const deleteUserAccount = async (req, res) => {
    const { adminUserId, userId } = req.body;

    if (!adminUserId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Admin user ID and user ID are required",
      });
    }

    console.log("Inside updateUserData");
  
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
  
      console.log("Request data:", {
        adminUserId,
        userId,
        fullname,
        email,
        phone,
        company,
        companySize,
        industry,
        designation,
        role,
        verifiedDocuments,
        isEmailVerified,
        isVerified,
        credits,
        subscriptionPlan,
      });
  
      if (!userId) {
        return res.status(400).json({
          message: "User ID is required",
          error: null,
          data: null,
        });
      }
  
      if (!adminUserId) {
        return res.status(400).json({
          message: "Admin User ID is required",
          error: null,
          data: null,
        });
      }
  
      const adminUser = await User.findById(adminUserId);
      const clientUser = await User.findById(userId).populate("additionalDetails");
  
      if (!adminUser) {
        return res.status(404).json({
          message: "Admin user not found",
          error: null,
          data: null,
        });
      }
  
      if (!clientUser) {
        return res.status(404).json({
          message: "Client user not found",
          error: null,
          data: null,
        });
      }
  
      // Create update objects
      const updateFields = {};
      const additionalDetailsUpdates = {};
  
      // Fields that can be updated by both regular users and admins
      if (fullname !== null) {
        if (!fullname.trim()) {
          return res.status(400).json({
            message: "Full name cannot be empty",
            error: null,
            data: null,
          });
        }
        updateFields.fullname = fullname.trim();
        // Only update userImage if explicitly desired
        // updateFields.userImage = `https://api.dicebear.com/5.x/initials/svg?seed=${fullname.trim()}`;
      }
  
      if (phone !== null) {
        if (phone && !/^\d{10}$/.test(phone)) {
          return res.status(400).json({
            message: "Phone must be a 10-digit number",
            error: null,
            data: null,
          });
        }
        updateFields.phone = phone;
      }
  
      // Additional details fields
      if (address !== null) additionalDetailsUpdates.address = address;
      if (gender !== null) additionalDetailsUpdates.gender = gender;
      if (dateOfBirth !== null) additionalDetailsUpdates.dateOfBirth = dateOfBirth;
      if (nationality !== null) additionalDetailsUpdates.nationality = nationality;
      if (maritalStatus !== null) additionalDetailsUpdates.maritalStatus = maritalStatus;
      if (bio !== null) additionalDetailsUpdates.bio = bio;
  
      // Admin-only fields
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
          try {
            await sendMail(
              clientUser.email,
              null,
              "User Verification",
              "verify",
              clientUser.fullname,
              null
            );
          } catch (emailError) {
            console.error("Error sending verification email:", emailError.message);
            // Optionally include in response
            // updateFields.emailError = "Failed to send verification email";
          }
        }
        if (credits !== null) {
          const creditsNum = Number(credits);
          if (isNaN(creditsNum) || creditsNum < 0) {
            return res.status(400).json({
              message: "Credits must be a non-negative number",
              error: null,
              data: null,
            });
          }
          updateFields.credits = creditsNum;
          try {
            await sendMail(
              clientUser.email,
              null,
              "Credits added to your account",
              "credits",
              clientUser.fullname,
              creditsNum
            );
          } catch (emailError) {
            console.error("Error sending credits email:", emailError.message);
            // Optionally include in response
            // updateFields.emailError = "Failed to send credits email";
          }
        }
        if (subscriptionPlan !== null) updateFields.subscriptionPlan = subscriptionPlan;
      } else {
        // Non-admin trying to update admin-only fields
        if (
          email !== null ||
          company !== null ||
          companySize !== null ||
          industry !== null ||
          designation !== null ||
          role !== null ||
          verifiedDocuments !== null ||
          isEmailVerified !== null ||
          isVerified !== null ||
          credits !== null ||
          subscriptionPlan !== null
        ) {
          return res.status(403).json({
            message: "Unauthorized to update admin-only fields",
            error: null,
            data: null,
          });
        }
      }
  
      // Update additionalDetails if needed
      if (Object.keys(additionalDetailsUpdates).length > 0) {
        if (!clientUser.additionalDetails) {
          // Create new additionalDetails document if it doesn't exist
          const AdditionalDetails = require("../models/AdditionalDetails"); // Adjust path
          clientUser.additionalDetails = await AdditionalDetails.create(additionalDetailsUpdates);
        } else {
          // Update existing additionalDetails
          await clientUser.additionalDetails.updateOne(additionalDetailsUpdates);
        }
      }
  
      // Update the client user with the specified fields
      console.log("Updating fields:", updateFields);
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateFields },
        {
          new: true,
          runValidators: true,
        }
      ).populate("additionalDetails");
  
      if (!updatedUser) {
        return res.status(404).json({
          message: "Failed to update user",
          error: null,
          data: null,
        });
      }
  
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

export {
  getAllRecruiters,
  getAllCandidates,
  fetchAllAdmin, 
  createNewAdmin,
  updateUserData,
  deleteUserAccount,
};
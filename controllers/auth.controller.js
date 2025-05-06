import UploadImageToCloudinary from "../utils/uploadImageToCloudinary.js";
import User from "../models/user.model.js";
import AdditionalDetails from "../models/additionalDetails.model.js";
import { sendMail } from "../utils/mail.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import axios from "axios";
import { user_role } from "../utils/data.js";

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
};

const verifyUserEmail = async (req, res) => {
  try {
    console.log("Inside verifyUserEmail");
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      console.warn("Missing email or OTP in request body:", { email, otp });
      return res.status(400).json({
        success: false,
        data: null,
        message: "Email and OTP are required",
        error: null,
      });
    }

    // Find user by email
    const findUser = await User.findOne({ email });
    console.log("Found user:", findUser ? findUser.email : "No user found");

    if (!findUser) {
      return res.status(404).json({
        success: false,
        data: null,
        message: "User not found with this email",
        error: null,
      });
    }

    // Check if OTP exists and is not expired
    if (!findUser.otp || !findUser.otpExpires) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "No OTP found for this user. Please request a new OTP",
        error: null,
      });
    }

    if (new Date() > findUser.otpExpires) {
      console.log("OTP expired for user:", findUser.email);
      return res.status(400).json({
        success: false,
        data: null,
        message: "OTP has expired. Please request a new OTP",
        error: null,
      });
    }

    // Verify OTP
    if (findUser.otp !== otp) {
      console.log("Invalid OTP provided for user:", findUser.email);
      return res.status(400).json({
        success: false,
        data: null,
        message: "Invalid OTP",
        error: null,
      });
    }

    // OTP is valid, mark email as verified
    findUser.isEmailVerified = true; // Assuming this field exists
    findUser.otp = null; // Clear OTP
    findUser.otpExpires = null; // Clear OTP expiration
    await findUser.save();

    console.log("Email verified successfully for user:", findUser.email);

    return res.status(200).json({
      success: true,
      data: null,
      message: "Email verified successfully",
      error: null,
    });
  } catch (error) {
    console.error("Error in verifyUserEmail:", error);
    return res.status(500).json({
      success: false,
      data: null,
      message: error.message || "Internal server error",
      error: error.message,
    });
  }
};

const signupUser = async (req, res) => {
  console.log("Inside signupUser");

  try {
    const { fullname, email, phone, company, role, password, captchaValue } = req.body;

    let formData = new FormData();
    formData.append("secret", process.env.SECRET_KEY);
    formData.append("response", captchaValue);

    if (!fullname || !email || !phone || !company || !role || !password) {
      return res.status(400).json({
        data: null,
        message: "Please provide all the required fields",
      });
    }

    const user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 6);
    const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "5h" });

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
      token: verificationToken,
      verifiedDocuments: false, // Changed from "no" to false
    });

    await newUser.save();

    return res.status(200).json({
      success: true,
      data: { userId: newUser._id },
      message: "User registered successfully. Please check your email for verification link.",
      error: null,
    });
  } catch (error) {
    console.error("Error in signupUser:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

const uploadDocuments = async (req, res) => {
  console.log("Inside uploadDocuments");
  console.log("Request body:", req.body);

  try {
    const { document , userId} = req.body;
    if (!document || !userId) {
      return res.status(400).json({
        success: false,
        message: "No document provided in request body",
      });
    }

    let buffer;
    if (document.startsWith("data:")) {
      const base64Data = document.split(",")[1];
      buffer = Buffer.from(base64Data, "base64");
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid document format. Expected base64 data URI.",
      });
    }

    const uploadResult = await UploadImageToCloudinary(buffer, "signed_offer_letters", undefined, undefined);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { documents: uploadResult.secure_url, verifiedDocuments: false },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Document uploaded successfully, pending verification",
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
    });
  } catch (error) {
    console.error("Error in uploadDocuments:", error.message);
    return res.status(500).json({
      success: false,
      message: "Error uploading document to Cloudinary",
      error: error.message,
    });
  }
};

// Verify OTP
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
        error: null,
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        error: null,
      });
    }

    if (user.otpExpires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
        error: null,
      });
    }

    if (user.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
        error: null,
      });
    }

    // OTP is correct, update verification status
    user.isEmailVerified = true;
    user.isVerified = true;
    user.otp = "";
    user.otpExpires = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      error: null,
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
        error: null,
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        error: null,
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email already verified",
        error: null,
      });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    await sendMail(
      email,
      user._id,
      "Verify Your Email with OTP",
      "otp",
      user.fullname,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      otp
    );

    return res.status(200).json({
      success: true,
      message: "OTP resent successfully",
      error: null,
    });
  } catch (error) {
    console.error("Error resending OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Login User (unchanged)
const loginUser = async (req, res) => {
  try {
    const { email, password, captchaValue } = req.body;

    console.log("email ", email, " password ", password, " captchaValue ", captchaValue);

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email })
      .populate("additionalDetails")
      .populate({ path: "searchHistory" });

    console.log("user find in db ", user);

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (user.role === user_role.Super_Admin || user.role === user_role.Sub_Admin) {
      console.log(user);
      console.log("pass", password);
      if (user.password !== password) {
        return res.status(400).json({ message: "Invalid admin password" });
      }
    } else {
      const isPasswordCorrect = await bcrypt.compare(password, user.password);
      if (!isPasswordCorrect) {
        return res.status(400).json({ message: "Invalid password" });
      }
    }

    const expiresIn = 24 * 60 * 60 * 1000;
    const tokenExpiry = Date.now() + expiresIn;
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("token", token, {
      domain: ".talentid.app",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: expiresIn,
    });

    try {
      const data = await axios.get(`${process.env.base_company_url}/generate_token/${email}`);
      user.token = data.data.token;
    } catch (error) {
      return res.status(500).json({ message: "Error while generating external token", error: error.message });
    }

    await user.save();

    res.status(200).json({
      _id: user._id,
      fullname: user.fullname,
      userImage: user.userImage,
      email: user.email,
      phone: user.phone,
      company: user.company,
      role: user.role,
      token: token,
      credits: user.credits,
      searchHistory: user.searchHistory,
      additionalDetails: user.additionalDetails,
      tokenExpiry,
      isEmailVerified: user.isEmailVerified,
      verifiedDocuments: user.verifiedDocuments,
      ghostedCount: user.ghostingCount,
      message: "Login successful",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reset Password (unchanged)
const resetPassword = async (req, res) => {
  try {
    console.log("reset pass ke andar ");
    const { password, confirmPasswordValue } = req.body;
    let userId = req.user.id;

    console.log("password ", password, " confirm password ", confirmPasswordValue, " userId ", userId);

    if (!password || !confirmPasswordValue || !userId) {
      return res.status(400).json({
        data: null,
        message: "Please provide all the required fields",
        error: null,
      });
    }

    const user = await User.findById(userId);
    console.log("user is ", user);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!await bcrypt.compare(password, user.password)) {
      return res.status(404).json({
        message: "password mismatch",
        data: null,
        error: null,
      });
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
      message: error.message,
    });
  }
};

// Forgot Password Email (unchanged)
const forgotPasswordEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        data: null,
        message: "Please provide an email address.",
        error: null,
      });
    }

    const findUser = await User.findOne({ email });
    if (!findUser) {
      return res.status(404).json({
        data: null,
        message: "No user found with this email address.",
        error: null,
      });
    }

    await sendMail(email, findUser._id, "Reset Your Password", "resetPassword", findUser.fullname);

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

// Forgot Password (unchanged)
const forgotPassword = async (req, res) => {
  try {
    const { password, confirmPassword, userId } = req.body;

    if (!password || !confirmPassword || !userId) {
      return res.status(400).json({
        data: null,
        message: "All fields are required",
        error: null,
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        data: null,
        message: "Passwords do not match",
        error: null,
      });
    }

    const findUser = await User.findById(userId);

    const isTokenExpired = (tokenExpires) => {
      return Date.now() > new Date(tokenExpires).getTime();
    };

    if (isTokenExpired(findUser.resetPasswordTokenExpires)) {
      return res.status(404).json({
        data: null,
        message: "Token is expired plz create forgot password request again",
        error: null,
      });
    }

    if (!findUser) {
      return res.status(404).json({
        data: null,
        message: "No user found with this user ID",
        error: null,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 6);
    console.log("hashed password: " + hashedPassword);

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

// Logout (unchanged)
const logout = async (req, res) => {
  try {
    console.log("hii1");

    res.clearCookie("jwt", { path: "/" });

    res.status(200).json({
      message: "user logged out successfully",
      data: null,
      error: null,
    });
  } catch (error) {
    res.status(500).json({
      data: null,
      message: "Some error occurred while logging out",
      error: error.message,
    });
  }
};

export {
  verifyUserEmail,
  signupUser,
  loginUser,
  forgotPassword,
  forgotPasswordEmail,
  resetPassword,
  logout,
  uploadDocuments,
  verifyOtp,
  resendOtp,
};
import HiringCandidate from "../models/hiringCandidate.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendMail } from "../utils/mail.js";

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
};

const candidateLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const isCandidateExists = await HiringCandidate.findOne({ email }).populate("offers");
        if (!isCandidateExists) {
            return res.status(404).json({ message: "Candidate not found" });
        }

        const isPasswordMatch = await bcrypt.compare(password, isCandidateExists.password);
        if (!isPasswordMatch) {
            return res.status(401).json({ message: "Password does not match" });
        }

        const payloadData = {
            id: isCandidateExists._id,
            email: isCandidateExists.email,
            role: isCandidateExists.role,
        };

        const token = jwt.sign(payloadData, process.env.JWT_SECRET, { expiresIn: "24h" });

        res.cookie("token", token, {
            domain: ".talentid.app",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "none",
            maxAge: 24 * 60 * 60 * 1000,
        });

        isCandidateExists.token = token;

        return res.status(200).json({
            message: "Logged in successfully",
            data: isCandidateExists,
            token: token,
            error: null,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server Error", error: error.message });
    }
};

const candidateSignup = async (req, res) => {
    try {
        const { fullName, email, password } = req.body;
        if (!fullName || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const existingCandidate = await HiringCandidate.findOne({ email });
        if (existingCandidate) {
            return res.status(400).json({ message: "Email already in use" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newCandidate = new HiringCandidate({
            name: fullName,
            email,
            password: hashedPassword,
        });

        await newCandidate.save();

        await sendMail(email, null, "Welcome! Your Sign-In to Talent ID Was Successful 🎉", "candidate-signup", fullName, null, null, null, null, null, null, null, null)

        return res.status(201).json({ message: "Candidate registered successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server Error", error: error.message });
    }
};

const candidateLogout = async (req, res) => {
    try {
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax"
        });

        return res.status(200).json({
            message: "Logged out successfully",
            error: null
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server Error",
            error: error.message
        });
    }
};

const forgotPasswordEmail = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                data: null,
                message: "Please provide an email address",
                error: null,
            });
        }

        const findUser = await HiringCandidate.findOne({ email });
        if (!findUser) {
            return res.status(404).json({
                data: null,
                message: "No user found with this email address",
                error: null,
            });
        }

        // Generate and save OTP
        const otp = generateOTP();
        findUser.otp = otp;
        findUser.otpExpires = Date.now() + 10 * 60 * 1000;
        await findUser.save();
        console.log(otp)
        // Send OTP email
        await sendMail(
            email,
            findUser._id,
            "Password Reset OTP",
            "candidate-forgot-password",
            findUser.name,
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
            data: null,
            message: "OTP has been sent to your email",
            error: null,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            data: null,
            message: "An error occurred while sending OTP",
            error: error.message,
        });
    }
};

const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                message: "Email and OTP are required",
                error: null
            });
        }

        const user = await HiringCandidate.findOne({ email });
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                error: null
            });
        }

        if (user.otp !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({
                message: "Invalid or expired OTP",
                error: null
            });
        }

        // Clear OTP after verification
        user.otp = null;
        user.otpExpires = null;
        await user.save();

        return res.status(200).json({
            message: "OTP verified successfully",
            error: null
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server Error",
            error: error.message
        });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email, password, confirmPasswordValue } = req.body;
        console.log(email, password, confirmPasswordValue)

        if (!email || !password || !confirmPasswordValue) {
            return res.status(400).json({
                message: "Please provide all required fields",
                error: null,
            });
        }

        const user = await HiringCandidate.findOne({ email });
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                error: null,
            });
        }

        console.log(user)

        if (password !== confirmPasswordValue) {
            return res.status(400).json({
                message: "Passwords do not match",
                error: null,
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        await user.save();

        console.log(hashedPassword)
        return res.status(200).json({
            message: "Password updated successfully",
            error: null,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server Error",
            error: error.message
        });
    }
};

export {
    candidateLogin,
    candidateSignup,
    candidateLogout,
    forgotPasswordEmail,
    verifyOtp,
    forgotPassword
};
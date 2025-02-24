
import HiringCandidate from "../models/hiringCandidate.model.js";

import bcrypt from "bcryptjs";

import jwt from "jsonwebtoken";

import { sendMail } from "../utils/mail.js";

const candidateLogin = async (req, res) => {

    try {

        const { email, password } = req.body;

        if (!email || !password) {

            return res.status(400).json({ message: "All fields are required" });

        }

        // check first email is exists or not 

        const isCandidateExists = await HiringCandidate.findOne({ email: email }).populate("offers")

        if (!isCandidateExists) {

            return res.status(404).json({ message: "Candidate not found" });

        }

        // compare the password first 


        const isPasswordMatch = bcrypt.compare(password, isCandidateExists.password);

        if (!isPasswordMatch) {

            return res.status(401).json({ message: "Password does not match " });

        }

        // if the password match 

        // generate the token


        const payloadData = {
            id: isCandidateExists._id,
            email: isCandidateExists.email,
            role: isCandidateExists.role
        }

        const token = jwt.sign(payloadData, process.env.JWT_SECRET, { expiresIn: '24h' });

        // after creating the token return return that token in the cosokies form 

        // Set the token as an HTTP-only cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: false, // Use true in production with HTTPS
            sameSite: 'lax', // Or 'none' for cross-origin requests
            maxAge: expiresIn, // 1 day
        });


        return res.status(200).json({

            message: "Logged in successfully",
            data: isCandidateExists,
            error: null,
        })


    } catch (error) {

        console.error(error);

        return res.status(500).json({ message: "Server Error", error: error.message });

    }
}


const fetchCandidateDetails = async (req, res) => {

    try {

        const id = req.user.id;

        if (!id) {

            return res.status(401).json({ message: "Unauthorized" });

        }

        const candidateDetails = await HiringCandidate.findById(id).populate("offers");

        if (!candidateDetails) {

            return res.status(404).json({ message: "Candidate not found" });

        }

        return res.status(200).json({ message: "Candidate details fetched successfully", data: candidateDetails, error: null });

    } catch (error) {

        console.error(error);
        return res.status(500).json({ message: "Server Error", error: error.message });

    }
}



// forgot password during login 


const forgotPassword = async (req, res) => {

    try {

        const { password, confirmPasswordValue } = req.body;

        let userId = req.user.id;

        console.log("password ", password, " confirm password ", confirmPasswordValue, " userId ", userId);

        if (!password || !confirmPasswordValue || !userId) {

            return res.status(400).json({

                data: null,
                message: "Please provide all the required fields",
                error: null,

            })
        }


        // const user = await User.findById(req.user._id); // cookies are not works 

        const user = await HiringCandidate.findById(userId);

        console.log("user is ", user);

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

// forgot password for mail also 

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
        const findUser = await HiringCandidate.findOne({ email });

        if (!findUser) {
            return res.status(404).json({
                data: null,
                message: "No user found with this email address.",
                error: null,
            });
        }

        // Send the forgot password email
        await sendMail(email, findUser._id, "forgot Your Password", "candidate-forgot-password", findUser.fullname);

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


export { candidateLogin, fetchCandidateDetails, forgotPassword, forgotPasswordEmail };


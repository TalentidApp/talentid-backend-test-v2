

import User from "../models/user.model.js";

import AdditionalDetails from "../models/additionalDetails.model.js";

import { sendMail } from "../utils/mail.js";

import bcrypt from "bcryptjs";

import jwt from "jsonwebtoken";

import axios from "axios";

// verify user email 

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

        console.log("new token ", newToken);

        const findUser = await User.findOne({ token: newToken });

        console.log("find user is ", findUser);

        if (findUser) {

            findUser.isEmailVerified = true;
            findUser.token = "";
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



// signup the user 

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



// login the user 

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


// reset the password 

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

        console.log("user is ", user);

        if (!user) {

            return res.status(404).json({ message: "User not found" });

        }

        if (!await bcrypt.compare(password, user.password)) {

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





export {

    verifyUserEmail,
    signupUser,
    loginUser,
    forgotPassword,
    forgotPasswordEmail,
    resetPassword,
    logout,
};



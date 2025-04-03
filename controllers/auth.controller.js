import UploadImageToCloudinary from "../utils/uploadImageToCloudinary.js";


import User from "../models/user.model.js";

import AdditionalDetails from "../models/additionalDetails.model.js";

import { sendMail } from "../utils/mail.js";

import bcrypt from "bcryptjs";

import jwt from "jsonwebtoken";

import axios from "axios";
import { company_size_value, user_role } from "../utils/data.js";

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
    console.log("Inside signupUser");

    try {
        const { fullname, email, phone, company, role, password, captchaValue } = req.body;

        let formData = new FormData();
        formData.append("secret", process.env.SECRET_KEY);
        formData.append("response", captchaValue);

        // Uncomment this if you want to enable CAPTCHA verification
        // const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
        // const result = await fetch(url, {
        //     body: formData,
        //     method: 'POST',
        // });
        // const challengeSucceeded = (await result.json()).success;

        // if (!challengeSucceeded) {
        //     return res.status(403).json({ message: "Invalid reCAPTCHA token" });
        // }

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
            data: { userId: newUser._id },
            message: "User registered successfully",
            error: null,
        });
    } catch (error) {
        console.error("Error in signupUser:", error.message);
        return res.status(500).json({ message: error.message });
    }
};

export const uploadDocuments = async (req, res) => {
    console.log("Inside uploadDocuments");
    console.log("Request body:", req.body);

    try {
        const { userId, document } = req.body;

        if (!document) {
            return res.status(400).json({
                success: false,
                message: "No document provided in request body",
            });
        }

        let buffer;
        if (document.startsWith('data:')) {
            const base64Data = document.split(',')[1];
            buffer = Buffer.from(base64Data, 'base64');
        } else {
            return res.status(400).json({
                success: false,
                message: "Invalid document format. Expected base64 data URI.",
            });
        }

        const uploadResult = await UploadImageToCloudinary(
            buffer,
            'signed_offer_letters', // Folder
            undefined,
            undefined  // Quality
        );

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { documents: uploadResult.secure_url }, // Store the Cloudinary URL
            { new: true, runValidators: true } // Return updated doc, run schema validators
        );

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Document uploaded successfully",
            url: uploadResult.secure_url,
            public_id: uploadResult.public_id,
        });
    } catch (error) {
        console.error('Error in uploadDocuments:', error.message);
        return res.status(500).json({
            success: false,
            message: "Error uploading document to Cloudinary",
            error: error.message,
        });
    }

};

const loginUser = async (req, res) => {
    try {
        const { email, password, captchaValue } = req.body;

        console.log("email ", email, " password ", password, " captchaValue ", captchaValue);

        // if (!captchaValue) {
        //     return res.status(400).json({ message: "CAPTCHA is required" });
        // }

        // let formData = new URLSearchParams(); // Use URLSearchParams instead of FormData
        // formData.append("secret", process.env.SECRET_KEY);
        // formData.append("response", captchaValue);

        // const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
        // const result = await fetch(url, {
        //     method: "POST",
        //     headers: {
        //         "Content-Type": "application/x-www-form-urlencoded", // Set header
        //     },
        //     body: formData
        // });

        // const challengeSucceeded = (await result.json()).success;

        // console.log(result, challengeSucceeded);


        // if (!challengeSucceeded) {
        //     return res.status(403).json({ message: "Invalid reCAPTCHA token" });
        // }

        if (!email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const user = await User.findOne({ email })
            .populate("additionalDetails")
            .populate({ path: "searchHistory" });

        console.log("user find in db ", user)

        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }
        console.log(user.verifiedDocuments )
        if (user && !user.verifiedDocuments) {
            console.log('verifying documents')
            res.status(202).json({ 'message': 'verifying documents' });
            return;
        }

        // 🛑 If the user is an Admin, compare password as plain text
        if (user.role === user_role.Super_Admin || user.role === user_role.Sub_Admin) {

            console.log(user);

            console.log("pass", password);
            if (user.password !== password) {
                return res.status(400).json({ message: "Invalid admin password" });
            }
        } else {
            // ✅ For non-admin users, check if email & admin verification is completed
            if (!user.isEmailVerified) {
                return res.status(401).json({ message: "User is not verified by email" });
            }
            if (!user.isVerified) {
                return res.status(401).json({ message: "User is not verified by admin" });
            }

            // 🔒 Check hashed password for regular users
            const isPasswordCorrect = await bcrypt.compare(password, user.password);
            if (!isPasswordCorrect) {
                return res.status(400).json({ message: "Invalid password" });
            }
        }

        // Generate JWT Token
        const expiresIn = 24 * 60 * 60 * 1000; // 1 day
        const tokenExpiry = Date.now() + expiresIn;
        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        // Set HTTP-only cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: expiresIn,
        });

        // Fetch external token
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
            token: user.token,
            credits: user.credits,
            searchHistory: user.searchHistory,
            additionalDetails: user.additionalDetails,
            tokenExpiry,
            message: "Login successful",
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};




// reset the password 

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



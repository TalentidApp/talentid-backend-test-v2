import { userVerificationTemplate } from "./templates/userVerificationTemplate.js";
import { randomStringGenerator, generateResetPasswordToken } from "./data.js";
import { resetPasswordTemplate } from "./templates/resetPasswordTemplate.js";
import { creditUpdateTemplate } from "./templates/creditTemplate.js";
import nodemailer from "nodemailer";
import User from "../models/user.model.js";
import { emailVerificationTemplate } from "./templates/emailVerificationTemplate.js";

// import image from "../assests/image.png"

export async function sendMail(email, userId = null, subject, emailType, fullname, credits = null) {
    try {
        // Debugging info
        console.log("Email Details:", { email, userId, subject, emailType, fullname, credits });
        console.log("Mail credentials:", process.env.mail_user, process.env.mail_pass);

        // Ensure environment variables are set
        if (!process.env.mail_user || !process.env.mail_pass || !process.env.mail_host) {
            throw new Error("Mail environment variables are not properly set.");
        }

        // Create Nodemailer transport
        const transport = nodemailer.createTransport({
            host: process.env.mail_host,
            port: 587,
            auth: {
                user: process.env.mail_user,
                pass: process.env.mail_pass,
            },
        });

        // Initialize variables
        let htmlContent = "";
        let token, tokenExpires, tokenData;
        let findUser;

        switch (emailType) {
            case "verifyEmail":
                console.log("Handling email verification");
                findUser = await User.findById(userId);
                if (!findUser) throw new Error("User not found for verification.");

                tokenData = generateResetPasswordToken();
                findUser.token = tokenData.token;
                await findUser.save();

                htmlContent = emailVerificationTemplate(
                    fullname,
                    `${process.env.frontend_url}/verify-email/${tokenData.token}`
                );
                break;

            case "verify":
                console.log("Handling user verification email");
                htmlContent = userVerificationTemplate(fullname);
                break;

            case "resetPassword":
                console.log("frontens url",process.env.frontend_url);
                console.log("Handling reset password email");
                findUser = await User.findById(userId);
                if (!findUser) throw new Error("User not found for password reset.");

                tokenData = generateResetPasswordToken();
                token = tokenData.token;
                tokenExpires = tokenData.tokenExpires;

                findUser.resetPasswordToken = token;
                findUser.resetPasswordTokenExpires = tokenExpires;
                await findUser.save();

                htmlContent = resetPasswordTemplate(userId); // Use reset password template
                break;

            case "credits":
                console.log("Handling credit update email");
                htmlContent = creditUpdateTemplate(fullname, credits);
                break;

            default:
                throw new Error(`Invalid email type: ${emailType}`);
        }

        if (!htmlContent) throw new Error("Failed to generate email content.");

        // Define email options
        const mailOptions = {
            from: `"Talent ID" <${process.env.mail_user}>`,
            to: email,
            subject: `${subject} - Talent ID`,
            html: htmlContent,
        };

        // Send email
        const mailResponse = await transport.sendMail(mailOptions);
        console.log("Mail sent successfully:", mailResponse);

        return mailResponse;
    } catch (error) {
        console.error("Error in sendMail:", error.message);
        throw error;
    }
}

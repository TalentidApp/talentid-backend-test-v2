import { userVerificationTemplate } from "./templates/auth-templates/userVerificationTemplate.js";
import { randomStringGenerator, generateResetPasswordToken } from "./data.js";
import { resetPasswordTemplate } from "./templates/auth-templates/resetPasswordTemplate.js";
import { creditUpdateTemplate } from "./templates/offer-templates/creditTemplate.js";
import nodemailer from "nodemailer";
import User from "../models/user.model.js";
import { emailVerificationTemplate } from "./templates/auth-templates/emailVerificationTemplate.js";

import { offerLetterTemplate } from "./templates/offer-templates/OfferLetter-Template.js";
import HiringCandidate from "../models/hiringCandidate.model.js";

export async function sendMail(email, userId = null, subject, emailType, fullname, credits = null, candidateName, companyName, jobTitle, offerLetterLink, joiningDate, expiryDate) {
    try {
        // Debugging info
        console.log("Email Details:", { email, userId, subject, emailType, fullname, credits });
        console.log("Mail credentials:", process.env.mail_user, process.env.mail_pass);

        console.log("email type is ", emailType);

        // Ensure environment variables are set
        if (!process.env.mail_user || !process.env.mail_pass || !process.env.mail_host) {
            throw new Error("Mail environment variables are not properly set.");
        }

        // Create Nodemailer transport
        const transport = nodemailer.createTransport({
            // host: process.env.mail_host,
            host: "smtp.zeptomail.in",
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

            case "candidate-forgot-password":
                console.log("frontens url", process.env.frontend_url);
                console.log("Handling reset password email");
                findUser = await HiringCandidate.findById(userId);
                if (!findUser) throw new Error("User not found for password reset.");

                tokenData = generateResetPasswordToken();
                token = tokenData.token;
                tokenExpires = tokenData.tokenExpires;

                findUser.resetPasswordToken = token;
                findUser.resetPasswordTokenExpires = tokenExpires;
                await findUser.save();

                htmlContent = resetPasswordTemplate(userId); // Use reset password template
                break;

            case "resetPassword":
                console.log("frontens url", process.env.frontend_url);
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

            case "offer-release":
                console.log("Handling offer release email");
                htmlContent = offerLetterTemplate(candidateName, companyName, jobTitle, offerLetterLink, joiningDate, expiryDate);
                break;

            default:
                throw new Error(`Invalid email type: ${emailType}`);
        }

        if (!htmlContent) throw new Error("Failed to generate email content.");

        // Define email options

        const mailOptions = {
            from: '"TalentId Team" <Support@talentid.app>',
            to: email,
            subject: `${subject} - Talent ID`,
            html: htmlContent,
        };

        // Dynamically add attachments if both files exist
        const attachments = [];
        if (offerLetterLink) {
            attachments.push({
                filename: "OfferLetter.pdf",
                path: offerLetterLink,
            });
        }

        // Add attachments only if there are any
        if (attachments.length > 0) {
            mailOptions.attachments = attachments;
        }


        // Send email
        const mailResponse = await transport.sendMail(mailOptions);
        console.log("Mail sent successfully:", mailResponse);

        return mailResponse;
    } catch (error) {
        console.error("Error in sendMail:", error.message);
        throw error;
    }
}

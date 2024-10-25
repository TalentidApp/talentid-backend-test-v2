
import { userVerificationTemplate } from "./userVerificationTemplate.js";

import { randomStringGenerator } from "./data.js";

import { resetPasswordTemplate } from "./resetPasswordTemplate.js";

import { creditUpdateTemplate } from "./creditTemplate.js";

import { generateResetPasswordToken } from "./data.js";

import nodemailer from "nodemailer";
import User from "../models/user.model.js";

export async function sendMail(email, userId=null,subject,emailType,fullname,credits=null) {
    try {

        // console.log("email type is ", email, userId=null, subject, emailType, fullname,credits=null);

        console.log(process.env.mail_user, process.env.mail_pass);

        // Create Nodemailer transport
        const transport = await nodemailer.createTransport({
            host: process.env.mail_host,
            port: 587,
            auth: {
                user: process.env.mail_user,
                pass: process.env.mail_pass,
            },
        });

        // Define the email content based on emailType
        let htmlContent;

        switch (emailType) {

            case "verify":
                htmlContent = userVerificationTemplate(fullname); // Use verification template
                break;
            case "resetPassword":

                let findUser = await User.findById(userId);

                const {token,tokenExpires} = generateResetPasswordToken();
                findUser.resetPasswordToken = token;
                findUser.resetPasswordTokenExpires = tokenExpires;
                findUser.save();
                htmlContent = resetPasswordTemplate(userId); // Use reset password template
                break;
            case "credits":
                htmlContent = creditUpdateTemplate(fullname,credits);
                break;
            default:
                throw new Error("Invalid email type");
        }

        // Define email options
        const mailOptions = {
            from: `"Talent ID" <${process.env.mail_user}>`,
            to: email,
            subject: `${subject} - Talent ID`,
            html: htmlContent, // Use the selected template

        };

        // Send email
        const mailResponse = await transport.sendMail(mailOptions);
        console.log("Mail Response:", mailResponse);

        return mailResponse;
    } catch (error) {
        console.error("Error sending email:", error.message);
        throw error;
    }
}

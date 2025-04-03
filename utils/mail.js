import nodemailer from "nodemailer";
import User from "../models/user.model.js";
import HiringCandidate from "../models/hiringCandidate.model.js";
import { randomStringGenerator, generateResetPasswordToken } from "./data.js";

export async function sendMail(
  email,
  userId = null,
  subject,
  emailType,
  fullname,
  credits = None,
  candidateName,
  companyName,
  jobTitle,
  offerLetterLink,
  joiningDate,
  expiryDate,
  otp,
  additionalData = {}
) {
  try {
    console.log("Email Details:", { email, userId, subject, emailType, fullname, credits, additionalData });
    console.log("Mail credentials:", process.env.mail_user, process.env.mail_pass);

    if (!process.env.mail_user || !process.env.mail_pass || !process.env.mail_host) {
      throw new Error("Mail environment variables are not properly set.");
    }

    const transport = nodemailer.createTransport({
      host: "smtp.zeptomail.in",
      port: 587,
      auth: {
        user: process.env.mail_user,
        pass: process.env.mail_pass,
      },
    });

    let htmlContent = "";
    let token, tokenExpires, tokenData;
    let findUser;

    switch (emailType) {
      case "verifyEmail":
        findUser = await User.findById(userId);
        if (!findUser) throw new Error("User not found for verification.");
        tokenData = generateResetPasswordToken();
        findUser.token = tokenData.token;
        await findUser.save();
        htmlContent = `
          <h2>Email Verification</h2>
          <p>Hello ${fullname},</p>
          <p>Please verify your email by clicking the link below:</p>
          <a href="${process.env.frontend_url}/verify-email/${tokenData.token}">Verify Email</a>
          <p>Regards,<br>TalentId Team</p>
        `;
        break;

      case "verify":
        htmlContent = `
          <h2>User Verification</h2>
          <p>Hello ${fullname},</p>
          <p>Your account has been successfully verified!</p>
          <p>Regards,<br>Talentid.app</p>
        `;
        break;

      case "candidate-forgot-password":
        findUser = await HiringCandidate.findById(userId);
        if (!findUser) throw new Error("User not found for password reset.");
        htmlContent = `
          <h2>Password Reset Request</h2>
          <p>Hello ${fullname},</p>
          <p>Your OTP for password reset is: <strong>${otp}</strong></p>
          <p>This OTP is valid for 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>Regards,<br>Talentid.app</p>
        `;
        break;

      case "resetPassword":
        findUser = await User.findById(userId);
        if (!findUser) throw new Error("User not found for password reset.");
        tokenData = generateResetPasswordToken();
        token = tokenData.token;
        tokenExpires = tokenData.tokenExpires;
        findUser.resetPasswordToken = token;
        findUser.resetPasswordTokenExpires = tokenExpires;
        await findUser.save();
        htmlContent = `
          <h2>Reset Your Password</h2>
          <p>Hello ${fullname},</p>
          <p>Click the link below to reset your password:</p>
          <a href="${process.env.frontend_url}/reset-password/${token}">Reset Password</a>
          <p>This link expires in 1 hour.</p>
          <p>Regards,<br>TalentId Team</p>
        `;
        break;

      case "credits":
        htmlContent = `
          <h2>Credit Update</h2>
          <p>Hello ${fullname},</p>
          <p>Your account has been updated with ${credits} credits.</p>
          <p>Regards,<br>Talentid.app</p>
        `;
        break;

      case "offer-release":
        htmlContent = `
            <h2>Offer Letter</h2>
            <p>Hello ${candidateName},</p>
            <p>Congratulations! You've been offered the position of ${jobTitle} at ${companyName}.</p>
            <p>Joining Date: ${joiningDate}</p>
            <p>Offer Expiry Date: ${expiryDate}</p>
            <p>Regards,<br>Talentid.app</p>
          `;
        break;

      case "offer-reminder":
        htmlContent = `
            <h2>Offer Reminder</h2>
            <p>Hello ${candidateName},</p>
            <p>This is a friendly reminder regarding the offer for the position of ${jobTitle} at ${companyName}.</p>
            <p>Please review the offer details at your earliest convenience.</p>
            <p>Joining Date: ${joiningDate}</p>
            <p>Offer Expiry Date: ${expiryDate}</p>
            <p>If you have any questions, feel free to reach out.</p>
            <p>Regards,<br>TalentId Team</p>
          `;
        break;

      case "candidate-signup":
        htmlContent = `
          <h2>Welcome to TalentId!</h2>
          <p>Hello ${fullname},</p>
          <p>Thank you for signing up with TalentId. We're excited to have you on board!</p>
          <p>You can now explore opportunities and manage your profile with us.</p>
          <p>Regards,<br>Talentid.app</p>
        `;
        break;

      case "teamMemberAdded":
        htmlContent = `
          <h2>Welcome to the Team!</h2>
          <p>Hello ${fullname},</p>
          <p>You've been added to a team by ${additionalData.adminName}.</p>
          <p>Get started by logging into your TalentId account.</p>
          <p>Regards,<br>Talentid.app</p>
        `;
        break;

      case "teamMemberConfirmation":
        htmlContent = `
          <h2>Team Member Added</h2>
          <p>Hello ${fullname},</p>
          <p>You've successfully added ${additionalData.memberName} (${additionalData.memberEmail}) to your team.</p>
          <p>They have been notified and can now access the team features.</p>
          <p>Regards,<br>Talentid.app</p>
        `;
        break;

      // New case for candidate rejection confirmation
      case "offer-rejected-candidate":
        htmlContent = `
          <h2>Offer Rejection Confirmation</h2>
          <p>Hello ${fullname},</p>
          <p>You have rejected the offer for the position of ${jobTitle} at ${companyName}.</p>
          <p>If you have any questions or need assistance, feel free to contact us.</p>
          <p>Regards,<br>TalentId Team</p>
        `;
        break;

      // email.utils.js
      case "candidate-invite":
        htmlContent = `
    <h2>Welcome to Talentid.app!</h2>
    <p>Hello,</p>
    <p>You’ve been invited to join Talentid.app to explore job opportunities and receive offers.</p>
    <p>Please sign up using the link below:</p>
    <a href="${additionalData.signupLink}">Sign Up Now</a>
    <p>We look forward to helping you find your next opportunity!</p>
    <p>Regards,<br>TalentId Team</p>
  `;
        break;

      // New case for admin notification
      case "offer-rejected-admin":
        htmlContent = `
          <h2>Offer Rejected by Candidate</h2>
          <p>Hello ${fullname},</p>
          <p>The candidate (${additionalData.candidateEmail}) has rejected the offer for the position of ${jobTitle}.</p>
          <p>Offer ID: ${additionalData.offerId}</p>
          <p>Status: Declined</p>
          <p>Regards,<br>TalentId Team</p>
        `;
        break;
      case "offer-retracted-candidate":
        htmlContent = `
            <h2>Offer Retracted</h2>
            <p>Hello ${fullname},</p>
            <p>We regret to inform you that the offer for the position of ${jobTitle} at ${companyName} has been retracted.</p>
            <p>If you have any questions, please feel free to contact us.</p>
            <p>Regards,<br>TalentId Team</p>
          `;
        break;

      // Add new case for offer retraction notification to admin
      case "offer-retracted-admin":
        htmlContent = `
            <h2>Offer Retracted Notification</h2>
            <p>Hello ${fullname},</p>
            <p>The offer for the position of ${jobTitle} has been successfully retracted.</p>
            <p>Candidate Email: ${additionalData.candidateEmail}</p>
            <p>Offer ID: ${additionalData.offerId}</p>
            <p>Status: Retracted</p>
            <p>Regards,<br>TalentId Team</p>
          `;
        break;

      default:
        throw new Error(`Invalid email type: ${emailType}`);
    }

    if (!htmlContent) throw new Error("Failed to generate email content.");

    const mailOptions = {
      from: '"TalentId Team" <Support@talentid.app>',
      to: email,
      subject: `${subject} - Talent ID`,
      html: htmlContent,
    };

    const attachments = [];
    if (offerLetterLink) {
      attachments.push({
        filename: "OfferLetter.pdf",
        path: offerLetterLink,
      });
    }
    if (attachments.length > 0) {
      mailOptions.attachments = attachments;
    }

    const mailResponse = await transport.sendMail(mailOptions);
    console.log("Mail sent successfully:", mailResponse);

    return mailResponse;
  } catch (error) {
    console.error("Error in sendMail:", error.message);
    throw error;
  }
}
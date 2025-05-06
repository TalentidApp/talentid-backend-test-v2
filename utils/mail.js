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
  credits = null,
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
            <a href="https://work.talentid.app/verify-email/${tokenData.token}">Verify Email</a>
            <p>Regards,<br>TalentId Team</p>
        `;
        break;

      case "otp":
        htmlContent = `
          <h2>Email Verification</h2>
          <p>Hello ${fullname},</p>
          <p>Your OTP for email verification is: <strong>${otp}</strong></p>
          <p>Please enter this OTP within 5 minutes to verify your email.</p>
          <p>If you didn’t request this, please ignore this email.</p>
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
          <p>Please log in to view and accept your offer letter:</p>
          <a href="https://offers.talentid.app/" style="display: inline-block; padding: 10px 20px; background-color: #5C3386; color: white; text-decoration: none; border-radius: 5px;">View Offer Letter</a>
          <p>Joining Date: ${joiningDate}</p>
          <p>Offer Expiry Date: ${expiryDate}</p>
          <p>If you have any questions, please contact us.</p>
          <p>Regards,<br>TalentId Team</p>
        `;
        break;

      case "offer-reminder":
        htmlContent = `
          <h2>Offer Reminder</h2>
          <p>Hello ${candidateName},</p>
          <p>This is a friendly reminder regarding the offer for the position of ${jobTitle} at ${companyName}.</p>
          <p>Please log in to review the offer details:</p>
          <a href="https://offers.talentid.app/" style="display: inline-block; padding: 10px 20px; background-color: #5C3386; color: white; text-decoration: none; border-radius: 5px;">View Offer Letter</a>
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

      case "offer-rejected-candidate":
        htmlContent = `
          <h2>Offer Rejection Confirmation</h2>
          <p>Hello ${fullname},</p>
          <p>You have rejected the offer for the position of ${jobTitle} at ${companyName}.</p>
          <p>If you have any questions or need assistance, feel free to contact us.</p>
          <p>Regards,<br>TalentId Team</p>
        `;
        break;

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

      case "offer-accepted-admin":
        htmlContent = `
          <h2>Offer Accepted by Candidate</h2>
          <p>Hello ${fullname},</p>
          <p>The candidate (${additionalData.candidateEmail}) has accepted the offer for the position of ${jobTitle}.</p>
          <p>Offer ID: ${additionalData.offerId}</p>
          <p>Status: Accepted</p>
          <p>Regards,<br>TalentId Team</p>
        `;
        break;

      case "offer-ghosted-admin":
        htmlContent = `
          <h2>Candidate Accepted Another Offer</h2>
          <p>Hello ${fullname},</p>
          <p>The candidate (${additionalData.candidateEmail}) has accepted another offer and is no longer available for the position of ${jobTitle}.</p>
          <p>Offer ID: ${additionalData.offerId}</p>
          <p>Status: Ghosted</p>
          <p>Regards,<br>TalentId Team</p>
        `;
        break;

      case "document-verified":
        findUser = await User.findById(userId);
        if (!findUser) throw new Error("User not found for document verification.");
        tokenData = generateResetPasswordToken();
        findUser.loginToken = tokenData.token;
        findUser.loginTokenExpires = tokenData.tokenExpires;
        await findUser.save();
        htmlContent = `
          <h2>Document Verification Successful</h2>
          <p>Hello ${fullname},</p>
          <p>Congratulations! Your documents have been successfully verified.</p>
          <p>Please log in to continue:</p>
          <a href="https://work.talentid.app/" style="display: inline-block; padding: 10px 20px; background-color: #5C3386; color: white; text-decoration: none; border-radius: 5px;">Log In Now</a>
          <p>Regards,<br>TalentId Team</p>
        `;
        break;

      case "document-unverified":
        htmlContent = `
          <h2>Document Verification Revoked</h2>
          <p>Hello ${fullname},</p>
          <p>Your document verification has been revoked.</p>
          <p>Please contact support for more information.</p>
          <p>Regards,<br>TalentId Team</p>
        `;
        break;

        case "test-invitation":
          htmlContent = `
            <h2>Technical Assessment for ${jobTitle}</h2>
            <p>Dear ${candidateName},</p>
            <p>You have been invited to complete a technical assessment for the ${jobTitle} position at ${companyName}.</p>
            <p><strong>Scheduled Date and Time:</strong> ${new Date(additionalData.scheduledDate).toLocaleString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
              timeZone: 'UTC'
            })} (your local time)</p>
            <p><strong>Duration:</strong> ${additionalData.duration} minutes</p>
            <p>Please click the link below to start the test at the scheduled time:</p>
            <p><a href="${offerLetterLink}" style="display: inline-block; padding: 10px 20px; background-color: #5C3386; color: white; text-decoration: none; border-radius: 5px;">Start Test</a></p>
            <p><strong>Note:</strong> The test can be accessed up to 5 minutes early. Ensure your device's timezone is set correctly.</p>
            <p>Best regards,</p>
            <p>${companyName} Team</p>
          `;
          break;
    
        case "test-schedule-notification":
            const now = new Date();
            htmlContent = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333;">Technical Assessments Scheduled for ${jobTitle}</h2>
                <p>Dear ${candidateName},</p>
                <p>We are pleased to inform you that technical assessments for the <strong>${jobTitle}</strong> position at ${companyName} have been scheduled. Please prepare to demonstrate your skills and expertise at the following times:</p>
                <h3 style="color: #555;">Scheduled Assessments</h3>
                <ul style="list-style: none; padding: 0;">
                  ${additionalData.testDates
                    .map(
                      (date, index) => {
                        const testDate = new Date(date);
                        const endTime = new Date(testDate.getTime() + 60 * 60 * 1000); // 60 minutes
                        let statusNote = "";
                        if (testDate <= now) {
                          statusNote = "<span style='color: red;'>Note: This test time has already passed. Please contact support.</span>";
                        }
                        return `
                          <li style="margin-bottom: 15px;">
                            <strong>Test ${index + 1}</strong><br>
                            <strong>Date and Time:</strong> ${testDate.toLocaleString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "numeric",
                              minute: "numeric",
                              hour12: true,
                            })}<br>
                            <strong>Duration:</strong> 60 minutes<br>
                            ${statusNote}
                          </li>
                        `;
                      }
                    )
                    .join("")}
                </ul>
                <h3 style="color: #555;">Topics to Prepare</h3>
                <p>The assessments will cover the following technical skills:</p>
                <ul style="padding-left: 20px;">
                  ${additionalData.skills.length > 0
                    ? additionalData.skills.map((skill) => `<li>${skill}</li>`).join("")
                    : `<li>General programming concepts relevant to the ${jobTitle} role</li>`}
                </ul>
                <p><strong>Preparation:</strong> Please review the listed topics and be ready to start each assessment promptly at the scheduled time. You will receive a separate email with the test link at the start of each assessment.</p>
                <p>If you have any questions or if a test time has passed, please contact our team at <a href="mailto:support@talentid.app">support@talentid.app</a>.</p>
                <p>Best regards,</p>
                <p style="font-weight: bold;">${companyName} Recruitment Team</p>
              </div>
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

    // Only include attachments for cases where explicitly needed (not for offer-release)
    const attachments = [];
    if (emailType !== "offer-release" && emailType !== "offer-reminder" && offerLetterLink) {
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
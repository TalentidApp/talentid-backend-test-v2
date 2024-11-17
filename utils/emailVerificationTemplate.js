export function emailVerificationTemplate(name, frontendUrl) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Verification</title>
  <style>
    body {
      font-family: 'Arial', sans-serif;
      margin: 0;
      padding: 0;
      background-color: #F3E5F5; /* Light Purple Background */
    }
    .email-container {
      max-width: 600px;
      margin: 40px auto;
      padding: 0;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
      border: 2px solid #AB47BC; /* Border in purple */
    }
    .email-header {
      background-color: #6A1B9A; /* Deep Purple Theme */
      color: #ffffff;
      text-align: center;
      padding: 20px;
    }
    .email-header h1 {
      margin: 0;
      font-size: 28px;
    }
    .email-header span {
      font-size: 18px;
      display: block;
      margin-top: 5px;
    }
    .email-body {
      padding: 20px 30px;
      color: #4A4A4A;
      text-align: center;
    }
    .email-body h2 {
      color: #6A1B9A;
      font-size: 22px;
      margin-bottom: 15px;
    }
    .email-body p {
      font-size: 16px;
      line-height: 1.5;
      margin: 10px 0;
    }
    .verification-link {
      display: inline-block;
      background-color: #6A1B9A; /* Purple Button */
      color: #ffffff;
      text-decoration: none;
      padding: 12px 20px;
      margin: 20px 0;
      font-size: 18px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .verification-link:hover {
      background-color: #7B1FA2; /* Slightly lighter purple */
    }
    .email-footer {
      background-color: #F3E5F5;
      padding: 15px;
      text-align: center;
      color: #6A1B9A;
      font-size: 14px;
    }
    .email-footer a {
      color: #6A1B9A;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header -->
    <div class="email-header">
      <img src="https://asset.cloudinary.com/dfz0wkqij/61ad374ff61fc20f604973d183f1cb5e" alt="Talent ID Logo" style="max-width: 150px; height: auto; margin-bottom: 10px;">
      <span>World's First Candidate Tracking System</span>
    </div>
    <!-- Body -->
    <div class="email-body">
      <h2>Verify Your Email Address</h2>
      <p>Hi ${name},</p>
      <p>Thank you for signing up with Talent ID! Please verify your email to activate your account and start exploring our platform.</p>
      <a href="${frontendUrl}" class="verification-link">Verify Email</a>
      <p>If you didn't create an account, you can safely ignore this email.</p>
    </div>
    <!-- Footer -->
    <div class="email-footer">
      <p>&copy; 2024 Talent ID. All rights reserved.</p>
      <p><a href="#">Privacy Policy</a> | <a href="#">Terms of Service</a></p>
    </div>
  </div>
</body>
</html>
`;
}

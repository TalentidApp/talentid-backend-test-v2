export default function teamMemberAddedTemplate (fullname, adminName, companyName) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0;">
        <h2 style="color: #4f46e5;">Welcome to ${companyName}'s Team!</h2>
        <p>Hello ${fullname},</p>
        <p>You have been added to TalentId's team on TalentId by ${adminName}.</p>
        <p>You can now access the platform with your registered email address.</p>
        <p>If you haven't received login credentials yet, please contact your administrator.</p>
        <p style="margin-top: 30px;">Best regards,<br>The TalentId Team</p>
      </div>
    `;
  };
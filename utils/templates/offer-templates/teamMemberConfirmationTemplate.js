export default function teamMemberConfirmationTemplate  (adminName, memberName, memberEmail) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0;">
        <h2 style="color: #4f46e5;">Team Member Added Successfully</h2>
        <p>Hello ${adminName},</p>
        <p>You have successfully added ${memberName} (${memberEmail}) to $TalentId's team on TalentId.</p>
        <p>The team member has been notified via email.</p>
        <p style="margin-top: 30px;">Best regards,<br>The TalentId Team</p>
      </div>
    `;
  };
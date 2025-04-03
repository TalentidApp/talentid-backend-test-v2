import notificationModel from "../models/notification.model.js";
import Team from "../models/team.js";
import User from "../models/user.model.js"; // Import User model to fetch and update admin details
import { sendMail } from "../utils/mail.js";

// controllers/teamController.js
// controllers/teamController.js
export const addTeamMember = async (req, res) => {
  try {
    const { firstName, lastName, workEmail, role } = req.body;
    const createdBy = req.user.id;

    const adminUser = await User.findById(createdBy);
    if (!adminUser) {
      return res.status(404).json({ message: "Admin user not found" });
    }

    let team = await Team.findOne({ createdBy });
    let isNewTeam = false;

    if (!team) {
      team = new Team({ createdBy, members: [] });
      isNewTeam = true;
    }

    const existingMember = team.members.find(
      (member) => member.email === workEmail
    );
    if (existingMember) {
      return res.status(400).json({ message: "Member already exists in the team" });
    }

    team.members.push({
      firstName,
      lastName,
      email: workEmail,
      role: role || "User",
    });

    await team.save();

    if (isNewTeam) {
      adminUser.teams.push(team._id);
      await adminUser.save();
    }

    // Create admin notification
    const adminNotification = new notificationModel({
      user: adminUser._id,
      title: "Team Member Added",
      description: `${firstName} ${lastName} has been added to your team`,
      type: "team_member_added",
      metadata: {
        memberName: `${firstName} ${lastName}`,
        memberEmail: workEmail,
      },
      createdBy: adminUser._id,
      emailEnabled: adminUser.notificationPreferences.masterToggle,
      received: adminUser.notificationPreferences.masterToggle
    });
    const shouldSendEmails = adminUser.notificationPreferences?.masterToggle
    if (shouldSendEmails) {
      await sendMail(
        adminUser.email,
        null,
        "Team Member Added",
        "teamMemberConfirmation",
        adminUser.fullname,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        {
          memberName: `${firstName} ${lastName}`,
          memberEmail: workEmail,
        }
      );
      adminNotification.emailSent = true;
    }
    await sendMail(
      workEmail,
      null,
      "You've been added to a team",
      "teamMemberAdded",
      `${firstName} ${lastName}`,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      { adminName: adminUser.fullname }
    );

    adminNotification.save(),

      res.status(201).json({
        id: team.members[team.members.length - 1]._id,
        firstName,
        lastName,
        email: workEmail,
        role,
      });
  } catch (error) {
    console.error("Error in addTeamMember:", error);
    res.status(500).json({ message: error.message });
  }
};
// Get all team members
export const getTeamMembers = async (req, res) => {
  try {
    const team = await Team.findOne({ createdBy: req.user.id });

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    res.status(200).json(team.members);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteTeamMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const team = await Team.findOne({ createdBy: req.user.id });

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const initialLength = team.members.length;
    team.members = team.members.filter(
      (member) => member._id.toString() !== memberId
    );

    if (initialLength === team.members.length) {
      return res.status(404).json({ message: "Member not found" });
    }

    await team.save();
    res.status(200).json({ message: "Member removed successfully" });
  } catch (error) {
    console.error("Error in deleteTeamMember:", error);
    res.status(500).json({ message: error.message });
  }
};

// Update team member
export const updateTeamMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { firstName, lastName, role } = req.body;
    const team = await Team.findOne({ createdBy: req.user.id });

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const memberIndex = team.members.findIndex(
      (member) => member._id.toString() === memberId
    );

    if (memberIndex === -1) {
      return res.status(404).json({ message: "Member not found" });
    }

    // Update member fields
    if (firstName) team.members[memberIndex].firstName = firstName;
    if (lastName) team.members[memberIndex].lastName = lastName;
    if (role) team.members[memberIndex].role = role;

    await team.save();

    res.status(200).json(team.members[memberIndex]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// controllers/notificationController.js
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import { sendMail } from "../utils/mail.js";

export const createNotification = async (req, res) => {
  try {
    const createdBy = req.user.id;
    const { userId, title, description, type, metadata } = req.body;
    
    const user = await User.findById(userId || createdBy);
    if (!user) return res.status(404).json({ message: "User not found" });

    const shouldSendEmail = 
      user.notificationPreferences.masterToggle &&
      user.notificationPreferences.specificNotifications
        .find(pref => pref.type === type)?.emailEnabled !== false;

    const notification = new Notification({
      user: userId || createdBy,
      title,
      description,
      type,
      emailEnabled: shouldSendEmail,
      metadata,
      createdBy,
      received: shouldSendEmail,
      emailSent: false
    });

    if (shouldSendEmail) {
      await sendMail(
        user.email,
        null,
        title,
        type,
        user.fullname,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        metadata
      );
      notification.emailSent = true;
    }

    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).json({ message: error.message });
  }
};

// Add this to see all notifications
export const getAllNotifications = async (req, res) => {
  try {
    const userId = req.params.userId === "me" ? req.user.id : req.params.userId;
    const notifications = await Notification.find({ user: userId })
      .populate('user', 'fullname email')
      .populate('createdBy', 'fullname')
      .sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: error.message });
  }
};

export const updateNotificationPreference = async (req, res) => {
  try {
    const userId = req.params.userId === "me" ? req.user.id : req.params.userId;
    const { masterToggle, specificNotifications } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          "notificationPreferences.masterToggle": masterToggle,
          "notificationPreferences.specificNotifications": specificNotifications
        }
      },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user.notificationPreferences);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
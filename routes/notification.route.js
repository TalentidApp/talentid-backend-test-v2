// routes/notificationRoutes.js
import express from "express";
import {
  createNotification,
  getAllNotifications,
  updateNotificationPreference
} from "../controllers/notification.controller.js";
import protectRoute from "../middlewares/protectRoute.middleware.js";
import User from "../models/user.model.js";
const router = express.Router();

// Create a new notification
router.post("/", protectRoute, createNotification);

// Get all notifications for a user with populated data
router.get("/all/:userId", protectRoute, getAllNotifications);

// Get user's notification preferences
router.get("/preferences/:userId", protectRoute, async (req, res) => {
  try {
    const userId = req.params.userId === "me" ? req.user.id : req.params.userId;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(User.notificationPreferences);
  } catch (error) {
    console.error("Error fetching preferences:", error);
    res.status(500).json({ message: error.message });
  }
});

// Update user's notification preferences
router.put("/preferences/:userId", protectRoute, updateNotificationPreference);

export default router;
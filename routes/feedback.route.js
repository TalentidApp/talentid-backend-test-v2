import express from "express";
import { submitFeedback, getFeedback } from "../controllers/feedback.controller.js";

const router = express.Router();

router.post("/submit", submitFeedback);
router.get("/received/:recipientModel/:recipientId", getFeedback);

export default router;
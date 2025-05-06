import express from "express";
import {
    verifyUserEmail,
    signupUser,
    loginUser,
    forgotPassword,
    forgotPasswordEmail,
    resetPassword,
    logout,
    // checkVerificationStatus,
    uploadDocuments,
    verifyOtp,
    resendOtp,
} from "../controllers/auth.controller.js";
import protectRoute from "../middlewares/protectRoute.middleware.js";

const router = express.Router();

router.get("/verify-email/:token", verifyUserEmail); // Kept for backward compatibility
router.post("/signup", signupUser);
router.post("/login", loginUser);
router.post("/forgot-password-email", forgotPasswordEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", protectRoute, resetPassword);
router.post("/logout", protectRoute, logout);
// router.get("/check-verification/:userId", checkVerificationStatus);
router.post("/upload-documents", uploadDocuments);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);

export default router;
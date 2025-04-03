
import express from "express";

import {fetchAllCandidate,fetchCandidateDetails,E_SignDocument, DownloadUpdate} from "../controllers/candidate.controller.js";

import protectRoute from "../middlewares/protectRoute.middleware.js";
import { candidateLogin, candidateLogout, candidateSignup, forgotPassword, forgotPasswordEmail, verifyOtp } from "../controllers/candidate-auth.controller.js";

const router = express.Router();


router.get("/fetchAllCandidate",protectRoute,fetchAllCandidate);
router.get("/fetchCandidate",protectRoute,fetchCandidateDetails);
router.post("/uploadDocument",E_SignDocument);
router.post("/candidate-login", candidateLogin );
router.post("/candidate-signup", candidateSignup);
router.post("/candidate-logout",protectRoute, candidateLogout);
router.post('/handleSignedDocument', DownloadUpdate);
router.post('/forgot-password-email', forgotPasswordEmail);
router.post('/verify-otp', verifyOtp);
router.post('/forgot-password', forgotPassword);



export default router;


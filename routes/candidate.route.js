
import express from "express";

import {fetchAllCandidate,fetchCandidateDetails,E_SignDocument} from "../controllers/candidate.controller.js";

import protectRoute from "../middlewares/protectRoute.middleware.js";

const router = express.Router();


router.get("/fetchAllCandidate",protectRoute,fetchAllCandidate);

router.post("/uploadDocument",E_SignDocument);

export default router;


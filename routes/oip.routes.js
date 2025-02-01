import express from "express";

import { addCandidate } from "../controllers/oip.controller.js";

import upload from "../utils/upload.js";

import { generateQuizFromSkills } from "../controllers/oip.controller.js";

const router = express.Router();

// Define the routes

console.log("hellow route ke andar ")

router.post("/addCandidate",addCandidate);

router.post("/generateSkills",generateQuizFromSkills);

export default router;


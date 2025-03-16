import express from "express";

import {getAllRecruiters,getAllCandidates} from "../controllers/admin.controller.js"

const router = express.Router();


router.get("/get-all-recruiters",getAllRecruiters);

router.get("/get-all-candidates",getAllCandidates);


export default router;


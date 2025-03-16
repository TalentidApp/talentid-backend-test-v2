import express from "express";

import {getAllRecruiters,getAllCandidates,ftechAllAdmin,createNewAdmin} from "../controllers/admin.controller.js"

import protectRoute from "../middlewares/protectRoute.middleware.js";

const router = express.Router();


router.get("/get-all-recruiters",protectRoute,getAllRecruiters);

router.get("/get-all-candidates",protectRoute,getAllCandidates);

router.get("/get-all-admin",protectRoute,ftechAllAdmin);

router.post("/create-admin",protectRoute,createNewAdmin);


export default router;


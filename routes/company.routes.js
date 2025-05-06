import express from "express";
import { addCompany, getCompany, updateCompany } from "../controllers/company.controller.js";
import  protectRoute  from "../middlewares/protectRoute.middleware.js";

const router = express.Router();

router.post("/", protectRoute, addCompany);
router.get("/:companyName", getCompany);
router.put("/:companyName", protectRoute, updateCompany);

export default router;
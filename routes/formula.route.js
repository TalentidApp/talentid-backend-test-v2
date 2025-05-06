import express from "express";
import {
  saveFormulaData,
  checkFormulaStatus,
  updateFormulaData,
} from "../controllers/formula.controller.js";
import protectRoute from "../middlewares/protectRoute.middleware.js";
const router = express.Router();

router.post("/formula",protectRoute, saveFormulaData);

router.get("/formula/status/:candidateId",protectRoute, checkFormulaStatus);

router.put("/formula",protectRoute, updateFormulaData);

export default router;
import express from "express";
import {
  addTeamMember,
  getTeamMembers,
  deleteTeamMember,
  updateTeamMember
} from "../controllers/team.controller.js";
import protectRoute from "../middlewares/protectRoute.middleware.js";

const router = express.Router();

router.post("/", protectRoute, addTeamMember);
router.get("/", protectRoute, getTeamMembers);
router.delete("/:memberId", protectRoute, deleteTeamMember);
router.patch("/:memberId", protectRoute, updateTeamMember); // Add this line

export default router;
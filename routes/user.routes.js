import express from "express";
import {

  searchUserInfo,
  getUserHistoryData,
  fetchAllusers,
  deleteUserAccount,
  updateUserData,
  getAllApiCountValue,
  getUserCredits,
  searchCompanies,
  updateProfile,
  getProfile,
  sendInvite

} from "../controllers/user.controllers.js";



import protectRoute from "../middlewares/protectRoute.middleware.js";

import logSearch from "../middlewares/searchHistory.middleware.js";


const router = express.Router();

router.post("/update-user", protectRoute, updateProfile);

router.post("/user-info",protectRoute,searchUserInfo); 

router.post("/invite",protectRoute, sendInvite)

router.get("/fetchAllusers",protectRoute,fetchAllusers);

router.get("/getUserHistoryData",protectRoute,getUserHistoryData);

router.delete("/deleteUserAccount",protectRoute,deleteUserAccount);

router.post("/updateUserData",protectRoute,updateUserData);

router.get("/search-companies", protectRoute, searchCompanies);

router.get("/getAllApiCountValue",protectRoute,getAllApiCountValue);
router.get("/", protectRoute, getProfile);
router.get("/getUserCredits",protectRoute,getUserCredits);




export default router;



import express from "express";
import {

  searchUserInfo,
  getUserHistoryData,
  fetchAllusers,
  deleteUserAccount,
  updateUserData,
  getAllApiCountValue,
  getUserCredits

} from "../controllers/user.controllers.js";



import protectRoute from "../middlewares/protectRoute.middleware.js";

import logSearch from "../middlewares/searchHistory.middleware.js";


const router = express.Router();


router.post("/user-info",protectRoute,searchUserInfo); 


router.get("/fetchAllusers",protectRoute,fetchAllusers);

router.get("/getUserHistoryData",protectRoute,getUserHistoryData);

router.delete("/deleteUserAccount",protectRoute,deleteUserAccount);

router.post("/updateUserData",protectRoute,updateUserData);

router.get("/getAllApiCountValue",protectRoute,getAllApiCountValue);

router.get("/getUserCredits",protectRoute,getUserCredits);



export default router;



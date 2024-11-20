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


router.post("/user-info",searchUserInfo); 


router.get("/fetchAllusers",fetchAllusers);

router.get("/getUserHistoryData/:userId",getUserHistoryData);

router.delete("/deleteUserAccount",deleteUserAccount);

router.post("/updateUserData",updateUserData);

router.get("/getAllApiCountValue",getAllApiCountValue);

router.get("/getUserCredits/:userId",getUserCredits);



export default router;



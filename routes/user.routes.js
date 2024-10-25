import express from "express";
import {
  loginUser,
  searchUserInfo,
  signupUser,
  resetPassword,
  logout,
  forgotPasswordEmail,
  forgotPassword,
  getUserHistoryData,
  fetchAllusers,
  deleteUserAccount,
  updateUserData,
  // updateUserProfile, // i have to add
} from "../controllers/user.controllers.js";
import protectRoute from "../middlewares/protectRoute.middleware.js";
import logSearch from "../middlewares/searchHistory.middleware.js";
import { createContactUs,getAllContactUsForm,updateContactUsStatus } from "../controllers/contactUs.controller.js";

import {updateAdditionalDetails} from "../controllers/additionalDetails.controller.js";

const router = express.Router();

router.post("/signup", signupUser);
router.post("/login", loginUser);
// router.post("/user-info", protectRoute, searchUserInfo); // i have to add

router.post("/user-info",searchUserInfo); 

router.post("/contact-us", createContactUs);

router.get("/getAllContactUsForm",getAllContactUsForm);

router.post("/updateContactUsStatus",updateContactUsStatus);

router.get("/fetchAllusers",fetchAllusers);

router.post("/resetPassword",resetPassword); // implement protected routes 

router.post("/forgotPasswordEmail",forgotPasswordEmail);

router.post("/forgotPassword",forgotPassword);

router.get("/logout",logout);

router.get("/getUserHistoryData/:userId",getUserHistoryData);

router.delete("/deleteUserAccount",deleteUserAccount);

router.post("/updateUserData",updateUserData);

router.post("/updateAdditionalDetails",updateAdditionalDetails)

export default router;



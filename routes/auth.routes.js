

import express from "express";

const app = express.Router();

import {

    loginUser,
    logout,
    forgotPasswordEmail,
    forgotPassword,
    resetPassword,
    verifyUserEmail,
    signupUser,

    
} from "../controllers/auth.controller.js";
import router from "./user.routes.js";


router.post("/signup", signupUser);
router.post("/login", loginUser);

router.post("/resetPassword",resetPassword); // implement protected routes 

router.post("/forgotPasswordEmail",forgotPasswordEmail);

router.post("/forgotPassword",forgotPassword);

router.get("/logout",logout);


router.get("/verifyUserEmail/:token",verifyUserEmail);

export default router;


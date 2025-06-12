
import express from "express";

const router = express.Router();


import {createPaymentLink, initializePayment  } from "../controllers/payment.controller.js";
import protectRoute from "../middlewares/protectRoute.middleware.js";


router.post("/create-payment-link",protectRoute,createPaymentLink);

router.post("/cashfree-webhook",initializePayment);


export default router;




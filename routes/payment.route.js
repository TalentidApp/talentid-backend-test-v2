
import express from "express";

const router = express.Router();


import {createPaymentLink,initializePayemnt} from "../controllers/payment.controller.js";

// Define a middleware function to log each request

router.post("/create-payment-link",createPaymentLink);


router.post("/cashfree-webhook",initializePayemnt);


export default router;




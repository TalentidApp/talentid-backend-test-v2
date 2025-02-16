
import express from "express";

import createOffer from "../controllers/offer.controller.js";

import protectRoute from "../middlewares/protectRoute.middleware.js";


const router = express.Router();

router.post("/create-offer",protectRoute,createOffer);

router.get("/getAllOffers",protectRoute,)


export default router;

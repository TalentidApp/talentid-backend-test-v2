import express from "express";
import upload from "../utils/upload.js";
import protectRoute from "../middlewares/protectRoute.middleware.js";
import { createOffer, getAllOffers, getOffersByStatus } from "../controllers/offer.controller.js";

import createOfferPunch from "../controllers/offer-punch.controller.js";

const router = express.Router();

// Routes
router.post(
    "/create-offer",
    protectRoute,
    upload.fields([
        { name: "offerLetter", maxCount: 1 },
        { name: "candidateResume", maxCount: 1 }
    ]),
    createOffer
);

router.post(
    "/create-offer-punch",
    protectRoute,
    upload.fields([
        { name: "offerLetter", maxCount: 1 },
        { name: "candidateResume", maxCount: 1 }
    ]),
    createOfferPunch
);

router.get("/get-all-offers", protectRoute, getAllOffers);
router.get("/get-offers-by-status/:status", protectRoute, getOffersByStatus);

export default router;

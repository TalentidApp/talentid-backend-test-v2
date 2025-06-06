import express from "express";
import protectRoute from "../middlewares/protectRoute.middleware.js";
import {
  createOffer,
  getAllOffers,
  getAllOffersOfIndividualCandidate,
  getCandidateOffers,
  getOffersByStatus,
  handleDigioWebhook,
  updateOffer,
  getOfferById,
  getDigioToken,
  sendOfferRemainder,
  updateShowStatus,
  generateTest,
  submitTest,
  getTest,
  scheduleTests,
  getCandidateTests,
} from "../controllers/offer.controller.js";
import { createOfferPunch, getOfferPunches } from "../controllers/offer-punch.controller.js";

const router = express.Router();

router.post("/create-offer", protectRoute, createOffer);
router.post("/create-offer-punch", protectRoute, createOfferPunch);
router.post("/all-offer-OfCandidate", protectRoute, getAllOffersOfIndividualCandidate);
router.get("/get-all-offers", protectRoute, getAllOffers);
router.get("/get-offer-punches", protectRoute, getOfferPunches);
router.get("/offers", protectRoute, getCandidateOffers);
router.get("/get-offers-by-status/:status", protectRoute, getOffersByStatus);
router.post("/offer/updateStatus", protectRoute, updateOffer);
router.get("/offer/:id", protectRoute, getOfferById);
router.post("/send-offer-email/:offerId", sendOfferRemainder)
router.post("/digio-webhook", handleDigioWebhook);
router.post("/generate-test", protectRoute, generateTest);
router.post("/submit-test", protectRoute, submitTest);
router.post("/schedule-tests",protectRoute, scheduleTests);
router.get("/test/:testId", getTest);
router.get("/tests",protectRoute, getCandidateTests);
router.post('/update-show-status', protectRoute, updateShowStatus);
router.get("/digio/token", protectRoute, getDigioToken);

export default router;
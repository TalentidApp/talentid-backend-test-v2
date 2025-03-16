
import express from "express";

import protectRoute from "../middlewares/protectRoute.middleware.js";

const router = express.Router();

import {

    createContactUs,
    getAllContactUsForm,
    updateContactUsStatus

} from "../controllers/contactUs.controller.js";


router.post("/contact-us", createContactUs);

router.get("/getAllContactUsForm",protectRoute,getAllContactUsForm);

router.post("/updateContactUsStatus",protectRoute,updateContactUsStatus);


export default router;





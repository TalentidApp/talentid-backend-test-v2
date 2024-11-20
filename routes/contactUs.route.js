
import express from "express"

const router = express.Router();

import {

    createContactUs,
    getAllContactUsForm,
    updateContactUsStatus

} from "../controllers/contactUs.controller.js";


router.post("/contact-us", createContactUs);

router.get("/getAllContactUsForm",getAllContactUsForm);

router.post("/updateContactUsStatus",updateContactUsStatus);


export default router;





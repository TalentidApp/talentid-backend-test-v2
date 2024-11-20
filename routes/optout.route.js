
import express from "express";

const router = express.Router();


import {createOptForm} from "../controllers/optform.controller.js";


router.post("/createOptOutForm", createOptForm); 


export default router;





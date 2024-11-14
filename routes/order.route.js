
import express from 'express';

const router = express.Router();


import { getOrderData } from '../controllers/order.controller.js';

router.get("/getAllOrderData",getOrderData);

export default router;



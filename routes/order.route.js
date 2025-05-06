
import express from 'express';

const router = express.Router();


import { getOrder, getOrderData } from '../controllers/order.controller.js';
import protectRoute from '../middlewares/protectRoute.middleware.js';

router.get("/getAllOrderData",getOrderData);

router.get("/:orderId", protectRoute, getOrder);


export default router;



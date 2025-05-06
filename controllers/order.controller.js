

import Order from "../models/order.model.js";

const getOrderData = async(req,res)=>{

    try{

        const OrderData = await Order.find({}).sort({ createdAt: -1 });;

        return res.status(200).json({

            message:" all Order data get successfully",
            data :OrderData,

        })

    }catch(e){

        console.log(e);
        return res.status(500).json({

            message:"error getting Order data",
            data : null,
            error:null
        })

    }
}

export const getOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        return res.status(200).json(order);
    } catch (error) {
        return res.status(500).json({ message: "Error fetching order", error: error.message });
    }
};

export {getOrderData};




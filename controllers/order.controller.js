

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

export {getOrderData};




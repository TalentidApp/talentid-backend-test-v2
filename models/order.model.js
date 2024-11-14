import mongoose from "mongoose";

import { paymentStatusEnum } from "../utils/data.js";
import { number } from "zod";

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },  // Unique ID of the user
  customerDetails: {
    customer_name: { type: String, required: true },
    customer_email: { type: String, required: true },
    customer_phone: { type: String, required: true },
    customer_id: { type: String, required: true },
  },
  orderAmount: { type: Number, required: true },
  credits:{

    type:Number,
    required: true,
    
  },
  paymentStatus: {
    type: String,
    enum: Object.values(paymentStatusEnum), // Use the enum values for the enum field
    default: paymentStatusEnum.PENDING, // Default value from the enum
    validate: {
        validator: function(value) {
            // Custom validation to allow case-insensitivity
            return Object.values(paymentStatusEnum).includes(value.toUpperCase());
        },
        message: props => `${props.value} is not a valid payment status!`
    }
},
  link_id: { type: String, required: true }, // Storing Cashfree payment link's unique ID
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});


const Order = mongoose.model('Order', orderSchema);

export default Order;

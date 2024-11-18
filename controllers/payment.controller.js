
import Order from "../models/order.model.js"; // Import the Order model

import axios from "axios";

import dotenv from "dotenv";
import { json } from "express";

import { v4 as uuidv4 } from 'uuid'; // Generate unique order ID

import crypto from 'crypto';

import User from "../models/user.model.js";

import { paymentStatusEnum } from "../utils/data.js";


dotenv.config();



export const createPaymentLink = async (req, res) => {
    try {
        const { customerDetails, orderAmount,credits, userId, orderId } = req.body;

        console.log("create payment link data ",credits);

        // Step 1: Call Cashfree API to create the payment link
        const response = await axios.post(`${process.env.CASHFREE_API}`, {
            customer_details: {
                customer_name: customerDetails.customer_name,
                customer_email: customerDetails.customer_email,
                customer_phone: customerDetails.customer_phone,
                customer_id: userId,
            },
            link_notify: {
                send_sms: true,
                send_email: true,
            },
            order_meta: {
                // return_url: 'https://talentid.app/', // Your frontend payment response URL
                notify_url: `${process.env.backend_url}/api/payments/cashfree-webhook`  // backend payment response URL
            },
            link_amount: orderAmount,
            link_currency: "INR",
            link_id: orderId, // Your internal orderId as link_id for Cashfree
            link_purpose: "Payment for service",
            link_minimum_partial_amount: 20,
        }, {
            headers: {
                'x-api-version': '2023-08-01',
                'x-client-id': process.env.CASHFREE_APP_ID, // Use environment variables for security
                'x-client-secret': process.env.CASHFREE_SECRET_KEY, // Use environment variables for security
                'Content-Type': 'application/json',
            },
        });

        console.log("res ka data ", response.data);

        // Step 2: Save the order to the database along with Cashfree link details
        const newOrder = new Order({
            userId,
            orderId,
            customerDetails,
            orderAmount,
            credits,
            paymentStatus: paymentStatusEnum.PENDING,
            link_id: response.data.link_id, // Save Cashfree's link_id
        });

        await newOrder.save(); // Save the order into the database

        console.log("Order created successfully", newOrder);

        // Step 3: Respond with the payment link and order details
        return res.status(200).json({
            data: {
                paymentLink: response.data.link_url, // Return payment link from Cashfree
                orderId: newOrder._id, // Return the new order's ID
            },
            message: "Payment link generated successfully",
            error: null,
        });
    } catch (error) {
        // Enhanced error handling
        console.error('Error creating payment link:', error);

        return res.status(500).json({
            message: "Error generating payment link",
            error: error.response ? error.response.data : error.message, // Return detailed error if available
            data: null,
        });
    }
};






export async function initializePayemnt(req, res) {

    try {

        console.log("intializing payment ke andar ");

        // Log the entire request body to understand its structure
        console.log("Request body: ", req.body.data);

        // Extracting the data from the correct nested structure

        const { data } = req.body;
        const payment_status = data?.payment?.payment_status;

        const customer_email = data?.customer_details?.customer_email;

        console.log("customer email", data?.customer_details?.customer_email)

        if (!payment_status || !customer_email) {

            return res.status(400).json({ error: 'Missing required fields in the request' });

        }

        await updateOrderDetails(customer_email, payment_status, res);

    }
    catch (error) {

        console.log("erorr is ", error);

        return res.status(500).json({ error: 'Error processing payment' });


    }

}







const fetchPaymentLinkDetails = async (linkId) => {

    try {
        const response = await axios.get(`${process.env.CASHFREE_API}/${linkId}`, {
            headers: {
                'accept': 'application/json',
                'x-api-version': '2023-08-01',
                'x-client-id': process.env.CASHFREE_APP_ID, // Store this securely
                'x-client-secret': process.env.CASHFREE_SECRET_KEY, // Store this securely
                'x-idempotency-key': '47bf8872-46fe-11ee-be56-0242ac120002', // Generate dynamically if needed
                'x-request-id': process.env.CASHFREE_APP_ID // This can also be dynamic or constant
            }
        });

        console.log("Payment Link Details:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error fetching payment details:", error.response ? error.response.data : error.message);
        throw error;
    }
};





export async function updateOrderDetails(customer_email, paymentStatus, res) {
    try {
        console.debug("Update Order Details:", { customer_email, paymentStatus });

        if (!customer_email || !paymentStatus) {
            return res.status(400).json({
                message: "Missing required fields in the request",
                error: null,
                data: null,
            });
        }

        const mostRecentOrder = await Order.findOne({
            "customerDetails.customer_email": customer_email,
        }).sort({ createdAt: -1 });

        if (!mostRecentOrder) {
            return res.status(404).json({
                message: "No order found for this customer email",
                error: null,
                data: null,
            });
        }


        // Check if the current status is already SUCCESS before proceeding
        if (mostRecentOrder.paymentStatus === paymentStatusEnum.SUCCESS && paymentStatus === paymentStatusEnum.SUCCESS) {
            return res.status(200).json({
                message: "Order already marked as SUCCESS",
                error: null,
                data: { order: mostRecentOrder }
            });
        }


        mostRecentOrder.paymentStatus = paymentStatus;
        try {
            await mostRecentOrder.save();
        } catch (saveError) {
            console.error("Error saving order:", saveError);
            return res.status(500).json({
                message: "Error saving updated order",
                error: saveError.message,
                data: null,
            });
        }

        console.log("most recent order after updated ",mostRecentOrder);

        if (paymentStatus === paymentStatusEnum.SUCCESS) {
            const userId = mostRecentOrder.userId;
            if (!userId) {
                return res.status(404).json({
                    message: "No userId found for this order",
                    error: null,
                    data: null,
                });
            }

            const creditsToAdd = typeof mostRecentOrder.orderAmount === "number"
                ? mostRecentOrder?.credits
                : 0;

            const updateUserCredits = await User.findOneAndUpdate(
                { _id: userId },
                { $inc: { credits: creditsToAdd } },
                { new: true }
            );

            if (updateUserCredits) {
                console.debug("User credits updated:", updateUserCredits);
            } else {
                return res.status(404).json({
                    message: "User not found for the given order",
                    error: null,
                    data: null,
                });
            }

            return res.status(200).json({
                message: "Order status and user credits updated successfully",
                error: null,
                data: {
                    order: mostRecentOrder,
                    user: updateUserCredits,
                },
            });
        }

        return res.status(200).json({
            message: "Order status updated successfully, no user credit changes applied.",
            error: null,
            data: { order: mostRecentOrder },
        });
    } catch (error) {
        console.error("Error updating order details:", error.message);
        return res.status(500).json({
            message: "Error updating order details",
            error: error.message,
            data: null,
        });
    }
}



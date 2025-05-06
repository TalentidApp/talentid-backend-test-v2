import Order from "../models/order.model.js";
import axios from "axios";
import dotenv from "dotenv";
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import User from "../models/user.model.js";
import { paymentStatusEnum } from "../utils/data.js";

dotenv.config();

export const createPaymentLink = async (req, res) => {
  try {
    const { customerDetails, orderAmount, credits, orderId } = req.body;

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: "Unauthorized: User not authenticated",
        error: "No valid user found in request",
        data: null,
      });
    }

    const userId = req.user.id;

    console.log("create payment link data", { credits, orderId, userId });

    if (!customerDetails.customer_name || !customerDetails.customer_email || !customerDetails.customer_phone) {
      return res.status(400).json({
        message: "Missing required customer details",
        error: "customer_name, customer_email, and customer_phone are required",
        data: null,
      });
    }

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
        return_url: `https://offers.talentid.app/settings/subscription`,
        notify_url: `https://2c90-2405-201-c015-a855-2c31-d80b-8c7b-faea.ngrok-free.app/api/payments/cashfree-webhook`,
      },
      link_amount: orderAmount,
      link_currency: "INR",
      link_id: orderId,
      link_purpose: "Payment for service",
      link_minimum_partial_amount: 20,
    }, {
      headers: {
        'x-api-version': '2023-08-01',
        'x-client-id': process.env.CASHFREE_APP_ID,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY,
        'Content-Type': 'application/json',
      },
    });

    console.log("Cashfree API response:", response.data);

    const newOrder = new Order({
      userId,
      orderId,
      customerDetails: {
        customer_name: customerDetails.customer_name,
        customer_email: customerDetails.customer_email,
        customer_phone: customerDetails.customer_phone,
        customer_id: userId,
      },
      orderAmount,
      credits,
      paymentStatus: paymentStatusEnum.PENDING,
      link_id: response.data.link_id,
    });

    await newOrder.save();

    console.log("Order created successfully", newOrder);

    return res.status(200).json({
      data: {
        paymentLink: response.data.link_url,
        orderId: newOrder._id,
      },
      message: "Payment link generated successfully",
      error: null,
    });
  } catch (error) {
    console.error('Error creating payment link:', error.message, error.stack);
    return res.status(500).json({
      message: "Error generating payment link",
      error: error.response ? error.response.data : error.message,
      data: null,
    });
  }
};

export async function initializePayment(req, res) {
  try {
    console.debug("Initializing payment webhook", JSON.stringify(req.body, null, 2));
    console.debug("Webhook headers:", req.headers);

    const { data } = req.body;
    const payment_status = data?.payment?.payment_status;
    const customer_email = data?.customer_details?.customer_email;

    if (!payment_status || !customer_email) {
      console.error("Missing required fields", { payment_status, customer_email });
      return res.status(400).json({
        message: "Missing required fields: payment_status and customer_email are required",
        error: null,
        data: null,
      });
    }

    console.debug("Processing webhook for", { customer_email, payment_status });

    // Call updateOrderDetails
    const result = await updateOrderDetails(customer_email, payment_status);
    console.debug("updateOrderDetails result", result);

    return res.status(result.status).json({
      message: result.message,
      error: result.error,
      data: result.data,
    });
  } catch (error) {
    console.error("Error processing webhook:", error.message, error.stack);
    return res.status(500).json({
      message: "Internal server error while processing webhook",
      error: error.message,
      data: null,
    });
  }
}

export async function updateOrderManually(req, res) {
  try {
    const { orderId } = req.params;
    console.debug("Manually updating order", { orderId });

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        message: "Order not found",
        error: null,
        data: null,
      });
    }

    const result = await updateOrderDetails(order.customerDetails.customer_email, "SUCCESS");
    return res.status(result.status).json({
      message: result.message,
      error: result.error,
      data: result.data,
    });
  } catch (error) {
    console.error("Error updating order manually:", error.message, error.stack);
    return res.status(500).json({
      message: "Internal server error while updating order",
      error: error.message,
      data: null,
    });
  }
}

const fetchPaymentLinkDetails = async (linkId) => {
  try {
    const response = await axios.get(`${process.env.CASHFREE_API}/${linkId}`, {
      headers: {
        'accept': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': process.env.CASHFREE_APP_ID,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY,
        'x-idempotency-key': '47bf8872-46fe-11ee-be56-0242ac120002',
        'x-request-id': process.env.CASHFREE_APP_ID,
      },
    });

    console.log("Payment Link Details:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching payment details:", error.response ? error.response.data : error.message);
    throw error;
  }
};

export async function updateOrderDetails(customer_email, paymentStatus) {
  try {
    console.debug("Update Order Details:", { customer_email, paymentStatus });

    if (!customer_email || !paymentStatus) {
      return {
        status: 400,
        data: null,
        message: "Missing required fields: customer_email and paymentStatus are required",
        error: null,
      };
    }

    const normalizedPaymentStatus = paymentStatus.toUpperCase();
    if (!Object.values(paymentStatusEnum).includes(normalizedPaymentStatus)) {
      return {
        status: 400,
        data: null,
        message: `Invalid payment status: ${paymentStatus}`,
        error: null,
      };
    }

    const mostRecentOrder = await Order.findOne({
      "customerDetails.customer_email": customer_email,
    }).sort({ createdAt: -1 });

    if (!mostRecentOrder) {
      return {
        status: 404,
        data: null,
        message: "No order found for this customer email",
        error: null,
      };
    }

    if (
      mostRecentOrder.paymentStatus === paymentStatusEnum.SUCCESS &&
      normalizedPaymentStatus === paymentStatusEnum.SUCCESS
    ) {
      return {
        status: 200,
        data: { order: mostRecentOrder },
        message: "Order already processed as SUCCESS",
        error: null,
      };
    }

    mostRecentOrder.paymentStatus = normalizedPaymentStatus;
    await mostRecentOrder.save();
    console.debug("Order updated:", mostRecentOrder);

    if (normalizedPaymentStatus === paymentStatusEnum.SUCCESS) {
      const userId = mostRecentOrder.userId;
      if (!userId) {
        return {
          status: 404,
          data: null,
          message: "No userId found for this order",
          error: null,
        };
      }

      const user = await User.findById(userId);
      if (!user) {
        return {
          status: 404,
          data: null,
          message: "User not found for the given order",
          error: null,
        };
      }

      const creditsToAdd = typeof mostRecentOrder.credits === "number" ? mostRecentOrder.credits : 0;
      const subscriptionExpiry = new Date();
      subscriptionExpiry.setDate(subscriptionExpiry.getDate() + 30);

      const updateUser = await User.findOneAndUpdate(
        { _id: userId },
        {
          $inc: { credits: creditsToAdd },
          $set: {
            subscriptionPlan: "Starter",
            subscriptionExpiry: subscriptionExpiry,
            isVerified: true,
          },
        },
        { new: true }
      );

      console.debug("User updated:", updateUser);

      return {
        status: 200,
        data: { order: mostRecentOrder, user: updateUser },
        message: "Order status and user subscription updated successfully",
        error: null,
      };
    }

    return {
      status: 200,
      data: { order: mostRecentOrder },
      message: "Order status updated successfully",
      error: null,
    };
  } catch (error) {
    console.error("Error updating order details:", error.message, error.stack);
    return {
      status: 500,
      data: null,
      message: "Internal server error while updating order details",
      error: error.message,
    };
  }
}
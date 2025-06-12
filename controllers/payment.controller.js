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

    const response = await axios.post(`https://api.cashfree.com/pg/links`, {
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
        return_url: `https://offers.talentid.app/settings/subscription?orderId=${orderId}&status={status}`,
        notify_url: `https://talentid-backend-v2.vercel.app/api/payments/cashfree-webhook`,
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
    if (!data) {
      console.warn("Received empty or invalid webhook payload, likely a test request");
      return res.status(200).json({ message: "Webhook received, but no data to process (test request)" });
    }

    const payment_status = data.link_status;
    const customer_email = data?.customer_details?.customer_email;
    const link_id = data?.link_id;

    if (!payment_status || !customer_email || !link_id) {
      console.error("Missing required fields", { payment_status, customer_email, link_id });
      return res.status(400).json({
        message: "Missing required fields: link_status, customer_email, and link_id are required",
        error: null,
        data: null,
      });
    }

    console.debug("Processing webhook for", { customer_email, payment_status });

    const result = await updateOrderDetails(link_id, payment_status);
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

    const result = await updateOrderDetails(order.link_id, "PAID");
    return res.status(result.status).json({
      message: result.message,
      error: result.error,
      data: result.data,
    });
  } catch (error) {
    console.error("Error updating order manually:", error.message, error

.stack);
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
      },
    });

    console.log("Payment Link Details:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching payment details:", error.response ? error.response.data : error.message);
    throw error;
  }
};

export async function updateOrderDetails(linkId, paymentStatus) {
  try {
    console.debug("Update Order Details:", { linkId, paymentStatus });

    if (!linkId || !paymentStatus) {
      return {
        status: 400,
        data: null,
        message: "Missing required fields: linkId and paymentStatus are required",
        error: null,
      };
    }

    const normalizedPaymentStatus = paymentStatus.toUpperCase();
    let mappedStatus;
    switch (normalizedPaymentStatus) {
      case "PAID":
        mappedStatus = paymentStatusEnum.SUCCESS;
        break;
      case "PARTIALLY_PAID":
        mappedStatus = paymentStatusEnum.PARTIAL;
        break;
      case "EXPIRED":
      case "CANCELLED":
        mappedStatus = paymentStatusEnum.FAILED;
        break;
      default:
        return {
          status: 400,
          data: null,
          message: `Invalid payment status: ${paymentStatus}`,
          error: null,
        };
    }

    const order = await Order.findOne({ link_id: linkId });
    if (!order) {
      return {
        status: 404,
        data: null,
        message: "No order found for this link ID",
        error: null,
      };
    }

    if (order.paymentStatus === paymentStatusEnum.SUCCESS && mappedStatus === paymentStatusEnum.SUCCESS) {
      return {
        status: 200,
        data: { order },
        message: "Order already processed as SUCCESS",
        error: null,
      };
    }

    order.paymentStatus = mappedStatus;
    await order.save();
    console.debug("Order updated:", order);

    if (mappedStatus === paymentStatusEnum.SUCCESS) {
      const userId = order.userId;
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

      const creditsToAdd = typeof order.credits === "number" ? order.credits : 0;
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
        data: { order, user: updateUser },
        message: "Order status and user subscription updated successfully",
        error: null,
      };
    }

    return {
      status: 200,
      data: { order },
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
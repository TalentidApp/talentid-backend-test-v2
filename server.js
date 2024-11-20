import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./db/connectDB.js";
import cookieParser from "cookie-parser";
import { startCronJob } from "./utils/cronJobs.js";

// Routes
import paymentRoute from "./routes/payment.route.js";
import OrderRoutes from "./routes/order.route.js";
import authRoutes from "./routes/auth.routes.js";
import contactUsRoute from "./routes/contactUs.route.js";
import optOutRoutes from "./routes/optout.route.js";
import userRoutes from "./routes/user.routes.js";

dotenv.config();

// Connect to the database
connectDB();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: "*", // Replace with your frontend URL for security
    credentials: true, // Allow cookies with cross-origin requests
  })
);

// Routes
app.use("/api/users", userRoutes);
app.use("/api/payments", paymentRoute);
app.use("/api/orders", OrderRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/contactus", contactUsRoute);
app.use("/api/optout", optOutRoutes);

app.get("/", (req, res) => {
  res.send("Welcome to Talent ID API");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});

// startCronJob(); // Start the cron job after the server is running


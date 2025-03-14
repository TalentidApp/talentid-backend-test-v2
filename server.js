import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./db/connectDB.js";
import cookieParser from "cookie-parser";
import { startCronJob } from "./utils/cronJobs.js";

import fileUpload from "express-fileupload";

import path from "path";

import bodyParser from "body-parser";

import axios from "axios";




// Routes
import paymentRoute from "./routes/payment.route.js";
import OrderRoutes from "./routes/order.route.js";
import authRoutes from "./routes/auth.routes.js";
import contactUsRoute from "./routes/contactUs.route.js";
import optOutRoutes from "./routes/optout.route.js";
import userRoutes from "./routes/user.routes.js";
import oipRoutes from "./routes/oip.routes.js";

import offerRoutes from "./routes/offer.route.js";

import candidateRoutes from "./routes/candidate.route.js";


dotenv.config();

// Connect to the database
connectDB();


// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(bodyParser.json({ limit: "50mb" })); // Adjust as needed
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Parses URL-encoded data

app.use(cookieParser());
app.use(
  cors({

    origin: ["http://localhost:5173","http://localhost:3000"], // ✅ Set frontend URL explicitly
    credentials: true, // ✅ Required for cookies
  })
);


import { fileURLToPath } from 'url';

// Define __dirname manually

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: path.join(__dirname, 'tmp'), // Use a 'tmp' folder in your project directory
}));


app.use((req, res, next) => {
  res.setHeader("ngrok-skip-browser-warning", "true");
  next();
});



// Routes
app.use("/api/users", userRoutes);
app.use("/api/payments", paymentRoute);
app.use("/api/orders", OrderRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/contactus", contactUsRoute);
app.use("/api/optout", optOutRoutes);

app.use("/api/user",oipRoutes);

app.use("/api/offer",offerRoutes);

// fetch All Candidate 

app.use("/api/candidate",candidateRoutes)

app.get("/", (req, res) => {
  res.send("Welcome to Talent ID API");
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});

startCronJob(); // Start the cron job after the server is running


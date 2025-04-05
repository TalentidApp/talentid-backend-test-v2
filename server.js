import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./db/connectDB.js";
import cookieParser from "cookie-parser";
import { startCronJob } from "./utils/cronJobs.js";
import session from 'express-session';
import fileUpload from "express-fileupload";
import path from "path";
import bodyParser from "body-parser";
import axios from "axios";
import { fileURLToPath } from 'url';

import paymentRoute from "./routes/payment.route.js";
import OrderRoutes from "./routes/order.route.js";
import authRoutes from "./routes/auth.routes.js";
import contactUsRoute from "./routes/contactUs.route.js";
import optOutRoutes from "./routes/optout.route.js";
import userRoutes from "./routes/user.routes.js";
import oipRoutes from "./routes/oip.routes.js";
import teamRoutes from './routes/team.route.js';
import offerRoutes from "./routes/offer.route.js";
import notificationRoute from './routes/notification.route.js';
import candidateRoutes from "./routes/candidate.route.js";
import adminRoutes from "./routes/admin.route.js";
import todoRoute from "./routes/todo.route.js";

dotenv.config();

// Connect to the database
connectDB();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(bodyParser.json({ limit: "50mb" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({ origin: ["http://localhost:3000/",'https://offers.talentid.app/','http://localhost:5173/'], credentials: true }));
app.set('trust proxy', 1);
// Define __dirname manually
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: path.join(__dirname, 'tmp')
}));

app.use((req, res, next) => {
  res.setHeader("ngrok-skip-browser-warning", "true");
  next();
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', 
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

// Routes
app.use("/api/users", userRoutes);
app.use("/api/payments", paymentRoute);
app.use("/api/orders", OrderRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/contactus", contactUsRoute);
app.use("/api/optout", optOutRoutes);
app.use("/api/user", oipRoutes);
app.use("/api/offer", offerRoutes);
app.use("/api/notifications", notificationRoute);
app.use("/api/candidate", candidateRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/todo", todoRoute);

app.get("/", (req, res) => {
  res.send("Welcome to Talent ID API");
});

app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});

startCronJob();

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./db/connectDB.js";
import cookieParser from "cookie-parser";
import userRoutes from "./routes/user.routes.js";

import paymentRoute from "./routes/payment.route.js";

import {startCronJob} from "./utils/cronJobs.js"

import OrderRoutes from "./routes/order.route.js"

dotenv.config();

connectDB();
const app = express();

const PORT = process.env.PORT || 5000;

console.log("port is ",process.env.PORT);


app.use(express.json()); // parsing json data of req.body
app.use(express.urlencoded({ extended: true })); // to parse form data in the req.body
app.use(cookieParser()); // to parse cookies in the req.cookies


// const allowedOrigins = [
//   'https://cts.talentid.app',
//   'https://talentid.app'
// ];

// app.use(cors({
//   origin: (origin, callback) => {
//     if (!origin || allowedOrigins.includes(origin)) {
//       callback(null, true); // Allow request
//     } else {
//       callback(new Error('Not allowed by CORS')); // Reject request
//     }
//   },
//   credentials: true // Allow cookies with cross-origin requests
// }));

app.use(cors({
  origin: '*', // Replace with your frontend URL
  credentials: true // Allow sending cookies with cross-origin requests
}));

app.use("/api/users", userRoutes);

app.use("/api/payments", paymentRoute);

app.use("/api/orders", OrderRoutes);

app.listen(PORT, () => {

  console.log(`Server started at http://localhost:${PORT}`);

});


app.get("/",(req,res)=>{

    res.send("Welcome to Talent ID API");
    
})

// Schedule the cron job to run every 7 hours

startCronJob();





import dotenv from "dotenv";

import User from "../models/user.model.js"

dotenv.config();

import cron from "node-cron";

import axios from "axios";

// Function to refresh the token using environment variables

const refreshAccessToken = async () => {
    try {
        const findUser = await User.findOne({

            email: process.env.secretEmail
        });
        if (!findUser) {
            console.error('User not found');
            return;
        }

        console.log("User found at cron job: ", findUser);

        const response = await axios.get(`${process.env.base_company_url}/generate_token/${process.env.secretEmail}`);

        findUser.token = response.data.token;
        await findUser.save();

        console.log("Token updated successfully");

    } catch (error) {
        console.error('Error refreshing access token:', error);
    }
};


// Schedule the cron job to run every 7 hours
// export const startCronJob = () => {
//     cron.schedule('0 * * * *', () => {
//         console.log('Running token refresh cron job...');
//         refreshAccessToken();
//     });
// };



export const startCronJob = () => {

    cron.schedule('* * * * *', async () => {
        console.log('Running token refresh cron job...');
    
        try {
            await refreshAccessToken();
            console.log('Token refreshed successfully.');
        } catch (error) {
            console.error('Error refreshing token:', error);
            // Consider adding retry logic or notifying relevant parties
        }
    
    });


}    


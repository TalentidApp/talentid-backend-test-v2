
import { v2 as cloudinary } from 'cloudinary';
import dotenv from "dotenv";


cloudinary.config({
  cloud_name: process.env.CLOUD_NAME, // Replace with your Cloud Name
  api_key: process.env.API_KEY,       // Replace with your API Key
  api_secret: process.env.API_SECRET, // Replace with your API Secret
});


export default cloudinary;



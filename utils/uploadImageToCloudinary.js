
import cloudinary from "../config/cloudinary.js";

import fs from "fs";

import path from "path";

import dotenv from "dotenv";

const UploadImageToCloudinary = async (file, folder = "", height = "100", quality = "100") => {
    console.log(file);

    try {
        if (!file) {
            throw new Error("Invalid file input.");
        }

        // Upload to Cloudinary using the correct local file path
        const options = {
            folder,
            height: parseInt(height, 10),
            quality: parseInt(quality, 10),
            resource_type: "auto",
        };
        
        const uploadResult = await cloudinary.uploader.upload(file.tempFilePath, options); // Use the local file path
        
        return uploadResult;

    } catch (error) {
        console.error("Error uploading image to Cloudinary:", error.message);
        throw error; // Rethrow the error for the calling function to handle
    }
};

export default UploadImageToCloudinary;
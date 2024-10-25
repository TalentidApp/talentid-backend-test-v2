import AdditionalDetails from "../models/additionalDetails.model.js" // Import the AdditionalDetails model

import User from "../models/user.model.js";

export async function updateAdditionalDetails(req, res) {
  try {
    const {id,userId,address = null, gender = null, dateOfBirth = null, nationality = null, maritalStatus = null, bio = null } = req.body;


    let additionalDetails = await AdditionalDetails.findById(id);

    if (!additionalDetails) {
      return res.status(404).json({
        data: null,
        message: "Additional details not found",
        error: null
      });
    }

    // Update the fields if they are provided in the request body
    if (address) additionalDetails.address = address;
    if (gender) additionalDetails.gender = gender;
    if (dateOfBirth) additionalDetails.dateOfBirth = dateOfBirth;
    if (nationality) additionalDetails.nationality = nationality;
    if (maritalStatus) additionalDetails.maritalStatus = maritalStatus;
    if (bio) additionalDetails.bio = bio;

    // Save the updated additional details
    await additionalDetails.save();


    const updatedUser = await User.findById(userId).populate("additionalDetails").exec();

    return res.status(200).json({
      data: updatedUser,
      message: "Additional details updated successfully",
      error: null
    });
  } catch (error) {
    console.error("Error updating additional details: ", error.message);

    return res.status(500).json({
      data: null,
      message: "Internal server error",
      error: error.message
    });
  }
}



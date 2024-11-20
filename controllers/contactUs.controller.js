import ContactUs from "../models/contactUs.model.js";

import { sendMail } from "../utils/mail.js";



export const createContactUs = async (req, res) => {
  try {
    const { fullname, company, email, phone, queryOptions, message } = req.body;

    console.log(fullname, company, email, phone, queryOptions, message)

    if (!fullname || !company || !email || !queryOptions || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (phone && phone.toString().length !== 10) {
      return res.status(400).json({ error: "Phone number must be 10 digits" });
    }

    const newContactUs = new ContactUs({
      fullname,
      company,
      email,
      phone,
      queryOptions,
      message,
    });

    const savedContactUs = await newContactUs.save();

    res.status(201).json(savedContactUs);
  } catch (error) {

    res.status(500).json({ message: error.message });
    console.log("Error in createContactUs ", error.message);


  }
};




export const updateContactUsStatus = async (req, res) => {

  try {

    const { updatedStatus, contactUsId } = req.body;

    if (!updatedStatus || !contactUsId) {

      return res.status(400).json({ error: "All fields are required" });


    }

    // find contact us and update the STatus 

    const isFromExists = await ContactUs.findByIdAndUpdate(contactUsId, {

      status: updatedStatus

    }, { new: true });


    if (!isFromExists) {

      return res.status(404).json({ error: "Contact Us form  not found with this id " });

    }

    // form updated successfully

    res.status(200).json({

      data: isFromExists,
      message: "Contact Us form status updated successfully",
      status: 200,
      success: true

    });

  }catch(error){

    res.status(200).json({

      data: null,
      message: " error occur while Contact Us form updated ",
      error:error.message,

    });

  }

}



export const getAllContactUsForm = async(req,res)=>{

  try{

    const allContactUsForm = await ContactUs.find({}).sort({ createdAt: -1 });

    res.status(200).json({

      message:"all constact us form fetch successfully",
      data: allContactUsForm,
      status: 200,
      success: true,

    });

  }catch(error){

    res.status(500).json({ message: error.message });

  }
}




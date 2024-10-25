
import mongoose from "mongoose";
import { statusEnum } from "../utils/data.js";

import { queryOptionsEnum } from "../utils/data.js";

const contactUsSchema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: true,
    },
    company: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: Number,
      minLength: 10,
      maxLength: 10,
    },
    status: {
      type: String,
      enum: Object.values(statusEnum),
      default: statusEnum.PENDING,
      required: true,
    },
    queryOptions: {
      type: String,
      enum: Object.values(queryOptionsEnum),
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const ContactUs = mongoose.model("ContactUs", contactUsSchema);
export default ContactUs;



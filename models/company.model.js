import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: [true, "Company name is required."],
      unique: true,
      trim: true,
      maxlength: [100, "Company name cannot exceed 100 characters."],
    },
    logo: {
      type: String,
      default: "",
      validate: {
        validator: function (v) {
          return v === "" || /^(https?:\/\/)/i.test(v);
        },
        message: "Logo must be a valid URL or empty.",
      },
    },
    address: {
      type: String,
      required: [true, "Address is required."],
      trim: true,
      maxlength: [200, "Address cannot exceed 200 characters."],
    },
    website: {
      type: String,
      required: [true, "Website is required."],
      trim: true,
      validate: {
        validator: function (v) {
          return /^(https?:\/\/)/i.test(v);
        },
        message: "Website must be a valid URL.",
      },
    },
    about: {
      type: String,
      required: [true, "About is required."],
      trim: true,
      maxlength: [500, "About cannot exceed 500 characters."],
    },
    contactPhone: {
      type: String,
      required: [true, "Contact phone is required."],
      trim: true,
      validate: {
        validator: function (v) {
          return /^\+?\d{10,15}$/.test(v);
        },
        message: "Contact phone must be a valid phone number.",
      },
    },
    contactEmail: {
      type: String,
      required: [true, "Contact email is required."],
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: "Contact email must be a valid email address.",
      },
    },
    rating: {
      type: Number,
      required: [true, "Rating is required."],
      min: [0, "Rating cannot be less than 0."],
      max: [5, "Rating cannot exceed 5."],
    },
    feedbackReceived: [{ type: mongoose.Schema.Types.ObjectId, ref: "Feedback" }],
    feedbackGiven: [{ type: mongoose.Schema.Types.ObjectId, ref: "Feedback" }],
  },
  { timestamps: true }
);

export default mongoose.model("Company", companySchema);
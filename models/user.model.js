import mongoose, { Mongoose } from "mongoose";

import AdditionalDetails from "./additionalDetails.model.js";

import Candidate from "./candidate.model.js";

// const searchHistorySchema = new mongoose.Schema({
//   candidate_name: {
//     type: String,
//     // required: true,
//   },
//   email:{

//     type: String,
    
//   },
//   org_name: {
//     type: String,
//     // required: true,
//   },
//   job_title: {
//     type: String,
//     // required: true,
//   },
//   start_time: {
//     type: Date,
//     // required: true,
//   },
//   round_name: {
//     type: String,
//     // required: true,
//   },
//   recommended_status: {
//     type: String,
//     // required: true,
//   },
//   proxy: {
//     type: Boolean,
//     // required: true,
//   },
//   interview_status: {
//     type: String,
//     // required: true,
//   },
// },
//   { timestamps: true }

// );


// const SearchedHistorySchema = mongoose.model("SearchedHistorySchema", searchHistorySchema);


const userSchema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type:String
    },
    company: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["Admin", "User","Corporate HR","HR Agency","Others"],
      required: true,
    },
    password: {
      type: String,
      minLength: 8,
      required: true,
    },
    additionalDetails:{

      type:mongoose.Schema.Types.ObjectId,
      ref: "AdditionalDetails",

    },
    isEmailVerified: { type: Boolean, default: false },
    isVerified:{

      type: Boolean,
      default: false,

    },
    credits: {
      type: Number,
      default: 100,
    },
    userImage: {

      type: String,

    },
    token: {
      type: String,
      expires: {
        type: Date,
        default: () => new Date(Date.now() + 5 * 60 * 60 * 1000) // 5 hours from now
      },
    },

    resetPasswordToken: {
      type: String,
    },
    resetPasswordTokenExpires: {
      type: Date,
      default: () => new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
    },

    searchHistory:[
      {

        type:mongoose.Schema.Types.ObjectId,
        ref: "Candidate",
      }
    ],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;




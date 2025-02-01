import mongoose from 'mongoose';

const additionalDetailsSchema = new mongoose.Schema({
  address: {
    type: String,
    default: null, // Optional, defaults to null
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    default: null, // Optional, defaults to null
  },
  dateOfBirth: {
    type: Date,
    default: null, // Optional, defaults to null
  },
  nationality: {
    type: String,
    default: null, // Optional, defaults to null
  },
  maritalStatus: {
    type: String,
    enum: ['Single', 'Married', 'Divorced', 'Widowed'],
    default: null, // Optional, defaults to null
  },
  bio: {
    type: String,
    default: null, // Optional, defaults to null
  },
  numberOfEmployees: {

    type: Number,
    default: 0, // Optional, defaults to 0

  },
  state: {

    type: String,
    default: null, // Optional, defaults to null

  },
  companyWebsite: {

    type: String,
    default: null, // Optional, defaults to null

  }
  
});

const AdditionalDetails = mongoose.model('AdditionalDetails', additionalDetailsSchema);

export default AdditionalDetails;



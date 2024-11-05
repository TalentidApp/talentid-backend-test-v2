
import mongoose from "mongoose";

const optSchema = new mongoose.Schema({

    firstName:{

        type: String,
        required: true,
    },
    lastName: {

        type: String,
        required: true,
    },
    email: {

        type: String,
        required: true,
        unique: true,

    },
    companyName: {

        type: String,
        required: true,

    },
})

const OptForm = mongoose.model("OptForm",optSchema);

export default OptForm;


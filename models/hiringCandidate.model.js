
import mongoose from "mongoose";

import { hiringCandidateStatus } from "../utils/data.js";

const hiringCandidateSchema = new mongoose.Schema({

    name:{

        type:String,

    },
    email:{

        type:String,
        unique:true
    },
    phoneNo:{

        type:String,

    },
    links:{

        type:Array,
        default:[]
    },

    address:{

        type:String,

    },
    status:{

        type:String,
        enum:Object.values(hiringCandidateStatus),
        default:hiringCandidateStatus.inactive,

    },

    joiningDate:{

        type:Date,

    },
    offerDate:{

        type:Date,

    },

    skills:[{

        type:String
    }],

    experience:{

        type:String,

    },
    educationCollege:{

        type:String,

    },

    educationDegree:{

        type:String,
    },

    resumeLink:{

        type:String,

    }

})

let HiringCandidate =  mongoose.model("HiringCandidate", hiringCandidateSchema);

export default HiringCandidate;


// name: "",
// phone: "",
// email: "",
// address: "",
// offerDate: "",
// joiningDate: "",
// status: "",
// experience: "",
// educationDegree: "",
// educationCollege: "",
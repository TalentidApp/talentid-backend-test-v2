

import User from "../models/user.model.js";
import upload from "../utils/upload.js"

import HiringCandidate from "../models/hiringCandidate.model.js";
import { hiringCandidateStatus } from "../utils/data.js";

import { generateSkillQuestions } from "../utils/generateSkills.js";

const addCandidate = async (req, res) => {

    try {   

        const data = req.body;

        console.log(data);

        if(!data.name || !data.phone || !data.email || !data.offerDate || !data.joiningDate ){

            return res.status(400).json({ message: 'All fields are required.' });

        }

        console.log(data.name ,data.phone,data.email,data.offerDate,data.joiningDate);

        // upload th

        let userId = "";

        // create Hiring candidate 

        const newCandidate = await HiringCandidate.create({

            name: data.name,
            phone: data.phone,
            email: data.email,
            address: data.address || "",
            offerDate: data.offerDate,
            joiningDate: data.joiningDate,
            resumeLink:data.resumeLink || "",
            status: data.status || hiringCandidateStatus.active,
            experience: data.experience || "",
            educationDegree: data.educationDegree || "",
            educationCollege: data.educationCollege || "",
        })


        console.log("new candidate created",newCandidate);

        const updateData = await User.findByIdAndUpdate(userId,{

            $push:{

                HiringCandidate:{

                    _id:newCandidate._id,

                }
            }

        },{new:true});

        if(!updateData){

            return res.status(400).json({ message: 'User not found.' });
        }



        return res.status(200).json({

            message: 'candidate added successfully',
            data:updateData,
            error:null,

        })

    } catch (e) {

        return res.status(500).json({ error: e.message })

    }

}


const generateQuizFromSkills = async(req,res)=>{

    try{

        const {skills} = req.body;

        const responseData = await generateSkillQuestions(skills);

        console.log(responseData);

        return res.status(200).json({

            message: 'Quiz generated successfully',
            data: responseData,
            error: null,
        })

    }catch(e){

        return res.status(500).json({ error: e.message })
    }

}




export {

    addCandidate,
    generateQuizFromSkills
}


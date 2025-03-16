

import HiringCandidate from "../models/hiringCandidate.model.js";
import User from "../models/user.model.js";

import { user_role } from "../utils/data.js";
async function getAllRecruiters(req, res) {
    try {
        const userData = await User.find({
            role: { $nin: [user_role.Sub_Admin, user_role.Super_Admin] } // Exclude these roles
        });

        return res.status(200).json({
            data: userData,
            message: "All Recruiters fetched successfully"
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}



async function getAllCandidates(req,res){

    try{

        const userData = await HiringCandidate.find({});

        return res.status(200).json({
            data: userData,
            message: "All Candidates fetched successfully"
        });

    }catch(error){

        console.log(error)
        return res.status(500).json({message:"Internal Server Error"})
    }
}

export { getAllRecruiters,getAllCandidates };


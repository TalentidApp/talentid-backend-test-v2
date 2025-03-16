

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



async function getAllCandidates(req, res) {

    try {

        const userData = await HiringCandidate.find({});

        return res.status(200).json({
            data: userData,
            message: "All Candidates fetched successfully"
        });

    } catch (error) {

        console.log(error)
        return res.status(500).json({ message: "Internal Server Error" })
    }
}


async function ftechAllAdmin(req, res) {

    try {

        const userData = await User.find(
            { role: { $in: [user_role.Sub_Admin, user_role.Super_Admin] } }
        ).select("fullname email role password");


        return res.status(200).json({
            data: userData,
            message: "All Admin fetched successfully"
        });

    } catch (error) {

        console.log(error)
        return res.status(500).json({ message: error.message })
    }

}


async function createNewAdmin(req, res) {

    try {

        const { fullname, email, password, role } = req.body;

        const user = new User({
            fullname,
            email,
            password,
            role,
            company:"Talent ID"
        });

        await user.save();

        return res.status(200).json({
            message: "Admin created successfully",
            data:user
        });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: error.message })

    }
}



export { getAllRecruiters, getAllCandidates, ftechAllAdmin,createNewAdmin };


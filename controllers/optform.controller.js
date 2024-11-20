import OptForm from "../models/opt.model.js";

const createOptForm = async (req, res) => {
    const { firstName, lastName, email, companyName } = req.body;

    try {
        // Validate required fields
        if (!firstName || !lastName || !email || !companyName) {
            return res.status(400).json({
                message: "All fields are required",
                error: null,
                data: null,
            });
        }

        // Create a new OptForm instance
        const newOptForm = new OptForm({
            firstName,
            lastName,
            email,
            companyName,
        });

        // Save to database
        await newOptForm.save();

        // Return success response
        return res.status(201).json({
            message: "Opt-out form created successfully",
            error: null,
            data: newOptForm,
        });
    } catch (error) {
        // Handle any errors during form creation
        return res.status(500).json({
            message: "An error occurred while creating the opt-out form",
            error: error.message,
            data: null,
        });
    }
};


export {

    createOptForm
};


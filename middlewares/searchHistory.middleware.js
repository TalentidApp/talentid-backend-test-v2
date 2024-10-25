import User from "../models/user.model.js";

const logSearch = async (req, res, next) => {
  try {
    const email = req.query.email;

    if (email) {
      const authenticatedUserId = req.user._id;
      // Save the search operation
      await User.findByIdAndUpdate(authenticatedUserId, {
        $push: {
          searchHistory: {
            emailSearched: email,
            timestamp: new Date(),
          },
        },
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
    console.log("Error in logSearch middleware", error.message);
  }
};

export default logSearch;

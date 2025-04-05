import User from "../models/user.model.js";
import jwt from "jsonwebtoken";

const protectRoute = async (req, res, next) => {
  try {
    console.log("hlo ",);
    const token = req.cookies.token || (req.headers.authorization?.split(" ")[1]);
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    console.log("token value is ",token);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("decoded token ",decoded);

    // const user = await User.findById(decoded.userId).select("-password");

    req.user = decoded;
    
    next();

  } catch (err) {
    res.status(500).json({ message: err.message });
    console.log("Error in signupUser: ", err.message);
  }
};

export default protectRoute;

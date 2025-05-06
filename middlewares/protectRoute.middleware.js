import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const protectRoute = async (req, res, next) => {
  try {
    console.log("Headers:", req.headers);
    console.log("Cookies:", req.cookies);
    console.log("Full Request URL:", req.originalUrl);

    let token = req.cookies.token;
    if (req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
        console.log("Using token from Authorization header:", token);
      }
    }

    if (!token) {
      console.log("No token found in cookies or Authorization header");
      return res.status(401).json({
        success: false,
        message: "Unauthorized - No token provided",
      });
    }

    console.log("Raw Token value is:", token);

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded token:", decoded);
    } catch (verifyError) {
      console.error("Token verification failed:", {
        message: verifyError.message,
        name: verifyError.name,
        expiredAt: verifyError.expiredAt,
      });
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Invalid or expired token",
        error: verifyError.message,
      });
    }

    if (!decoded.id) {
      console.error("Decoded token missing id:", decoded);
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Invalid token payload",
      });
    }

    req.user = decoded;

    if (req.user.role !== "Candidate" || (req.user.role == "Admin" && req.user.email != 'jai@talentid.app')) {
      const user = await User.findById(req.user.id);
      if (!user) {
        console.log("User not found for id:", req.user.id);
        return res.status(404).json({
          success: false,
          message: `User not found ${user} iddd`,
        });
      }

      if (!user.isEmailVerified) {
        console.log("Email not verified for user:", user.email);
        return res.status(403).json({
          success: false,
          message: "Please verify your email to access this feature",
          actionRequired: "verifyEmail",
        });
      }

      if (!user.verifiedDocuments) {
        console.log("Documents not verified for user:", user.email);
        return res.status(403).json({
          success: false,
          message: "Please upload your documents to access this feature",
          actionRequired: "verifyDocuments",
        });
      }
    }

    next();
  } catch (err) {
    console.error("Unexpected error in protectRoute:", {
      message: err.message,
      stack: err.stack,
    });
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};

export default protectRoute;
const protectRoute = async (req, res, next) => {
  try {
    console.log("Headers:", req.headers);
    console.log("Cookies:", req.cookies);
    console.log("Full Request URL:", req.originalUrl);

    const token = req.cookies.token;
    if (!token) {
      console.log("No token found in cookies");
      return res.status(401).json({ message: "Unauthorized - No token" });
    }

    console.log("Raw Token value is:", token);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded token:", decoded);

    req.user = decoded;

    next();
  } catch (err) {
    console.log("Token verification error details:", {
      message: err.message,
      name: err.name,
      expiredAt: err.expiredAt,
    });
    res.status(401).json({ message: "Unauthorized - Invalid token", error: err.message });
  }
};
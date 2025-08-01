// middleware/authUser.mjs
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const authUser = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

export default authUser;

import jwt from "jsonwebtoken";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";

export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

export const sendTokenCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   7 * 24 * 60 * 60 * 1000,
  });
};

export const protect = async (req, res, next) => {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) throw new AppError("Not authenticated. Please log in.", 401);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id).select("-password");

    if (!user)          throw new AppError("User no longer exists.", 401);
    if (!user.isActive) throw new AppError("Account is disabled.", 403);

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError") return next(new AppError("Invalid token.", 401));
    if (err.name === "TokenExpiredError") return next(new AppError("Token expired. Please log in again.", 401));
    next(err);
  }
};

export default protect;
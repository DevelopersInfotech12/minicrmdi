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
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge:   7 * 24 * 60 * 60 * 1000,
  });
};

export const protect = async (req, res, next) => {
  try {
    // 1. Try cookie first
    let token = req.cookies?.token;

    // 2. Try Authorization header (Bearer token)
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    // 3. Try custom header x-auth-token
    if (!token && req.headers["x-auth-token"]) {
      token = req.headers["x-auth-token"];
    }

    if (!token) {
      return next(new AppError("Not authenticated. Please log in.", 401));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      res.cookie("token", "", { httpOnly: true, expires: new Date(0) });
      if (err.name === "TokenExpiredError") {
        return next(new AppError("Session expired. Please log in again.", 401));
      }
      return next(new AppError("Invalid token. Please log in again.", 401));
    }

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      res.cookie("token", "", { httpOnly: true, expires: new Date(0) });
      return next(new AppError("Account not found. Please log in again.", 401));
    }

    if (!user.isActive) {
      return next(new AppError("Account is disabled.", 403));
    }

    req.user = user;
    next();
  } catch (err) {
    next(new AppError("Authentication failed. Please log in.", 401));
  }
};

export default protect;

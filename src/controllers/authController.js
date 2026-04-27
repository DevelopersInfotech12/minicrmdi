import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { generateToken, sendTokenCookie } from "../middleware/auth.js";

// @desc  Register first admin (only works if no admin exists)
// @route POST /api/v1/auth/register
export const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    throw new AppError("Name, email and password are required", 400);

  const adminCount = await User.countDocuments({ role: "admin" });
  if (adminCount > 0)
    throw new AppError("Admin account already exists. Please login.", 400);

  const user = await User.create({ name, email, password, role: "admin" });

  const token = generateToken(user._id);
  sendTokenCookie(res, token);

  sendSuccess(res, 201, "Account created successfully", { user });
};

// @desc  Login with email + password
// @route POST /api/v1/auth/login
export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    throw new AppError("Email and password are required", 400);

  const user = await User.findOne({ email }).select("+password");
  if (!user)
    throw new AppError("Invalid email or password", 401);

  if (!user.password)
    throw new AppError("This account uses Google login. Please sign in with Google.", 400);

  const isMatch = await user.comparePassword(password);
  if (!isMatch)
    throw new AppError("Invalid email or password", 401);

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = generateToken(user._id);
  sendTokenCookie(res, token);

  sendSuccess(res, 200, "Logged in successfully", { user });
};

// @desc  Logout
// @route POST /api/v1/auth/logout
export const logout = (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
  });
  sendSuccess(res, 200, "Logged out successfully");
};

// @desc  Get current user
// @route GET /api/v1/auth/me
export const getMe = (req, res) => {
  sendSuccess(res, 200, "User fetched", { user: req.user });
};

// @desc  Google OAuth callback
export const googleCallback = async (req, res) => {
  if (!req.user) {
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=google_failed`);
  }
  const token = generateToken(req.user._id);
  sendTokenCookie(res, token);
  res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
};
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { generateToken, sendTokenCookie } from "../middleware/auth.js";

// @desc  Register new admin account
// @route POST /api/v1/auth/register
// @access Public — anyone can create their own admin account (data is isolated per account)
export const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    throw new AppError("Name, email and password are required", 400);

  if (password.length < 6)
    throw new AppError("Password must be at least 6 characters", 400);

  const existingUser = await User.findOne({ email });
  if (existingUser)
    throw new AppError("An account with this email already exists. Please login.", 400);

  const user = await User.create({ name, email, password, role: "admin" });

  const token = generateToken(user._id);
  sendTokenCookie(res, token);
  sendSuccess(res, 201, "Account created successfully", { user, token });
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
    throw new AppError("This account was created differently. Please use the correct login method.", 400);

  const isMatch = await user.comparePassword(password);
  if (!isMatch)
    throw new AppError("Invalid email or password", 401);

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = generateToken(user._id);
  sendTokenCookie(res, token);
  sendSuccess(res, 200, "Logged in successfully", { user, token });
};

// @desc  Logout
// @route POST /api/v1/auth/logout
export const logout = (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    expires:  new Date(0),
  });
  sendSuccess(res, 200, "Logged out successfully");
};

// @desc  Get current user
// @route GET /api/v1/auth/me
export const getMe = (req, res) => {
  sendSuccess(res, 200, "User fetched", { user: req.user });
};

// @desc  Update profile
// @route PUT /api/v1/auth/profile
export const updateProfile = async (req, res) => {
  const { name, email } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name, email },
    { new: true, runValidators: true }
  );
  sendSuccess(res, 200, "Profile updated", { user });
};

// @desc  Change password
// @route PUT /api/v1/auth/change-password
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    throw new AppError("Both current and new password are required", 400);
  if (newPassword.length < 6)
    throw new AppError("Password must be at least 6 characters", 400);

  const user = await User.findById(req.user._id).select("+password");
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw new AppError("Current password is incorrect", 401);

  user.password = newPassword;
  await user.save();
  sendSuccess(res, 200, "Password changed successfully");
};

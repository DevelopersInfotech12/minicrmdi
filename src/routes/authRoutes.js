import express from "express";
import {
  register, login, logout, getMe,
  updateProfile, changePassword,
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Public
router.post("/register", register);
router.post("/login",    login);

// Protected
router.post("/logout",         protect, logout);
router.get("/me",              protect, getMe);
router.put("/profile",         protect, updateProfile);
router.put("/change-password", protect, changePassword);

// Google OAuth — disabled
// router.get("/google", ...);
// router.get("/google/callback", ...);

export default router;

import express from "express";
import passport from "../config/passport.js";
import { register, login, logout, getMe, googleCallback } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login",    login);
router.post("/logout",   protect, logout);
router.get("/me",        protect, getMe);

router.get("/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

router.get("/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_failed`
  }),
  googleCallback
);

export default router;

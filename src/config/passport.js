import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";

passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email  = profile.emails?.[0]?.value;
        const avatar = profile.photos?.[0]?.value || null;

        // 1. Find by googleId — existing linked user
        let user = await User.findOne({ googleId: profile.id });
        if (user) {
          user.lastLogin = new Date();
          user.avatar    = avatar || user.avatar;
          await user.save();
          return done(null, user);
        }

        // 2. Find by email and link google account
        if (email) {
          user = await User.findOne({ email });
          if (user) {
            user.googleId  = profile.id;
            user.avatar    = avatar || user.avatar;
            user.lastLogin = new Date();
            await user.save();
            return done(null, user);
          }
        }

        // 3. Only allow ADMIN_EMAIL to create new account via Google
        const allowedEmail = process.env.ADMIN_EMAIL;
        if (!allowedEmail || email !== allowedEmail) {
          return done(null, false, {
            message: "Access denied. Only the admin email can sign in with Google."
          });
        }

        // 4. Create admin user for allowed email
        user = await User.create({
          name:      profile.displayName,
          email:     email,
          googleId:  profile.id,
          avatar,
          role:      "admin",
          lastLogin: new Date(),
        });

        return done(null, user);

      } catch (err) {
        return done(err, null);
      }
    }
  )
);

export default passport;

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";

console.log("Google Callback URL:", process.env.GOOGLE_CALLBACK_URL);

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

        console.log("Google profile email:", email);

        // 1. Find by googleId
        let user = await User.findOne({ googleId: profile.id });
        if (user) {
          user.lastLogin = new Date();
          await user.save();
          return done(null, user);
        }

        // 2. Find by email and link
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

        // 3. Create new admin user (first come = admin)
        user = await User.create({
          name:      profile.displayName,
          email:     email || `${profile.id}@google.com`,
          googleId:  profile.id,
          avatar,
          role:      "admin",
          lastLogin: new Date(),
        });

        console.log("New Google user created:", user.email);
        return done(null, user);

      } catch (err) {
        console.error("Google OAuth error:", err);
        return done(err, null);
      }
    }
  )
);

export default passport;

import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import { findUserByEmail, findUserById } from '../services/authService.js';

passport.use(
  new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
      const user = await findUserByEmail(email);
      // Same message for "no such user" and "wrong password" so attackers can't tell which emails exist
      const invalid = { message: 'Invalid email or password' };

      if (!user) return done(null, false, invalid);
      if (!user.is_active) return done(null, false, { message: 'This account has been deactivated' });

      const passwordMatches = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatches) return done(null, false, invalid);

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

passport.serializeUser((user, done) => done(null, user.user_id));

passport.deserializeUser(async (userId, done) => {
  try {
    const user = await findUserById(userId);
    // false = "session refers to a user who no longer exists / is inactive": treat as logged out
    done(null, user && user.is_active ? user : false);
  } catch (err) {
    done(err);
  }
});

export default passport;
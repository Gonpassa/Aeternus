import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { findByUsername, findByIdPublic, verifyPassword, toPublicUser } from '../db/users';

passport.use(
  new LocalStrategy({ usernameField: 'username' }, async (username, password, done) => {
    try {
      const user = await findByUsername(username);
      if (!user) {
        done(null, false, { message: `Username ${username} not found.` });
        return;
      }
      const isMatch = await verifyPassword(user, password);
      if (!isMatch) {
        done(null, false, { message: 'Invalid password' });
        return;
      }
      done(null, toPublicUser(user));
    } catch (err) {
      done(err);
    }
  }),
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await findByIdPublic(id);
    done(null, user ?? false);
  } catch (err) {
    done(err);
  }
});

export default passport;

import bcrypt from 'bcrypt';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { findByUsername, findByIdPublic, verifyPassword, toPublicUser } from '../db/users';

const GENERIC_AUTH_FAILURE_MESSAGE = 'Invalid username or password';

// A precomputed bcrypt hash (SALT_ROUNDS = 10, matching backend/src/db/users.ts)
// of an arbitrary fixed placeholder. Used to run a dummy bcrypt.compare when the
// username isn't found, so that path takes roughly as long as a real password
// mismatch and doesn't leak account existence via response timing.
const DUMMY_PASSWORD_HASH = '$2b$10$5zJ8ps9vIG6mZP/BZjnK5OAYpvn9FhijkO0LkwEHihd01Bz4WdBsq';

passport.use(
  new LocalStrategy({ usernameField: 'username' }, async (username, password, done) => {
    try {
      const user = await findByUsername(username);
      if (!user) {
        await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
        done(null, false, { message: GENERIC_AUTH_FAILURE_MESSAGE });
        return;
      }
      const isMatch = await verifyPassword(user, password);
      if (!isMatch) {
        done(null, false, { message: GENERIC_AUTH_FAILURE_MESSAGE });
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

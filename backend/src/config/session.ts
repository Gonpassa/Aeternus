import session, { SessionOptions } from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from '../db';
import config from './default';

const PgSession = connectPgSimple(session);

const sessionOptions: SessionOptions = {
  store: new PgSession({
    pool,
    createTableIfMissing: true,
    // The store prunes expired sessions on a timer, which outlives the app that created it.
    // Under jest that timer fires into a pool a finished suite has already ended, and the
    // stray query lands in whichever later suite happens to be awaiting something - a test
    // that times out for reasons that have nothing to do with it. Nothing expires inside a
    // test run, so there is nothing to prune.
    pruneSessionInterval: config.nodeEnv === 'test' ? false : undefined,
  }),
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
};

export default session(sessionOptions);

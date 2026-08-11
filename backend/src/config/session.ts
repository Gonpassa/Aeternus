import session, { SessionOptions } from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from '../db';
import config from './default';

const PgSession = connectPgSimple(session);

const sessionOptions: SessionOptions = {
  store: new PgSession({ pool, createTableIfMissing: true }),
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

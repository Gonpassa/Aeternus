import express from 'express';
import request from 'supertest';
import { sql } from 'drizzle-orm';
import { runMigrations } from '../db/migrate';
import { db, pool } from '../db';
import { createUser } from '../db/users';
import sessionMiddleware from './session';
import passport from './passport';

// Integration test: drives Passport as a black box through a real Express
// request/response cycle (session + passport.initialize/session + the real
// local strategy against a real DB), rather than calling strategy internals
// directly. This is what actually caught the deserializeUser/req.user
// password-hash findings in the final review - a unit test that pokes
// `_verify` in isolation can't observe what `req.user` ends up holding.
describe('passport local strategy (integration)', () => {
  beforeAll(async () => {
    await runMigrations();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE users RESTART IDENTITY CASCADE`);
    await createUser('alice', 'alice@example.com', 'correct-password');
  });

  afterAll(async () => {
    await pool.end();
  });

  const buildApp = (): express.Express => {
    const app = express();
    app.use(express.json());
    app.use(sessionMiddleware);
    app.use(passport.initialize());
    app.use(passport.session());
    app.post('/login', passport.authenticate('local'), (req, res) => {
      res.json({ user: req.user });
    });
    return app;
  };

  it('logs in with valid credentials and never exposes the password hash on req.user', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/login')
      .send({ username: 'alice', password: 'correct-password' });

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual(
      expect.objectContaining({ username: 'alice', email: 'alice@example.com' }),
    );
    expect(response.body.user.password).toBeUndefined();
    expect(Object.keys(response.body.user)).not.toContain('password');
  });
});

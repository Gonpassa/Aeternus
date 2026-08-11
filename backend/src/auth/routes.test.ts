import request, { Response as SupertestResponse } from 'supertest';
import { sql } from 'drizzle-orm';
import { runMigrations } from '../db/migrate';
import { db, pool } from '../db';
import { createUser } from '../db/users';
import { createApp } from '../app';

describe('auth routes (integration)', () => {
  beforeAll(async () => {
    await runMigrations();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE users RESTART IDENTITY CASCADE`);
  });

  afterAll(async () => {
    await pool.end();
  });

  const agent = () => request.agent(createApp());

  describe('POST /api/auth/register', () => {
    it('creates a user, logs them in, and returns 201', async () => {
      const a = agent();
      const res = await a
        .post('/api/auth/register')
        .send({ username: 'alice', email: 'alice@example.com', password: 'abcd' });

      expect(res.status).toBe(201);
      expect(res.body.user).toEqual(
        expect.objectContaining({ username: 'alice', email: 'alice@example.com' }),
      );
      expect(res.body.user.password).toBeUndefined();

      const meRes = await a.get('/api/auth/me');
      expect(meRes.status).toBe(200);
      expect(meRes.body.user.username).toBe('alice');
    });

    it('returns 400 for an invalid email', async () => {
      const res = await agent()
        .post('/api/auth/register')
        .send({ username: 'alice', email: 'not-an-email', password: 'abcd' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('returns 409 for a duplicate username', async () => {
      await createUser('alice', 'alice@example.com', 'abcd');

      const res = await agent()
        .post('/api/auth/register')
        .send({ username: 'alice', email: 'someone-else@example.com', password: 'abcd' });

      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await createUser('alice', 'alice@example.com', 'correct-password');
    });

    it('logs in with valid credentials and returns 200', async () => {
      const res = await agent()
        .post('/api/auth/login')
        .send({ username: 'alice', password: 'correct-password' });

      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe('alice');
    });

    it('returns 401 for an unknown username', async () => {
      const res = await agent()
        .post('/api/auth/login')
        .send({ username: 'nobody', password: 'whatever' });

      expect(res.status).toBe(401);
    });

    it('returns 401 for a wrong password', async () => {
      const res = await agent()
        .post('/api/auth/login')
        .send({ username: 'alice', password: 'wrong-password' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('returns 401 when not logged in', async () => {
      const res = await agent().post('/api/auth/logout');
      expect(res.status).toBe(401);
    });

    it('clears the session for a logged-in user', async () => {
      await createUser('alice', 'alice@example.com', 'correct-password');
      const a = agent();
      await a.post('/api/auth/login').send({ username: 'alice', password: 'correct-password' });

      const logoutRes = await a.post('/api/auth/logout');
      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body).toEqual({ ok: true });

      const meRes: SupertestResponse = await a.get('/api/auth/me');
      expect(meRes.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns 401 when not logged in', async () => {
      const res = await agent().get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });
});

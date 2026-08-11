import express from 'express';
import request from 'supertest';
import sessionMiddleware from './session';
import { pool } from '../db';

describe('session middleware', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('attaches a session object to the request', async () => {
    const app = express();
    app.use(sessionMiddleware);
    app.get('/test', (req, res) => {
      res.json({ hasSession: typeof req.session === 'object' });
    });

    const response = await request(app).get('/test');
    expect(response.body.hasSession).toBe(true);
  });

  it('sets a session cookie once the session is modified', async () => {
    const app = express();
    app.use(sessionMiddleware);
    app.get('/test', (req, res) => {
      (req.session as unknown as Record<string, unknown>).visited = true;
      res.json({ ok: true });
    });

    const response = await request(app).get('/test');
    const cookies = response.headers['set-cookie'];
    expect(cookies).toBeDefined();

    const [cookie] = cookies as unknown as string[];
    expect(cookie).toBeDefined();
    if (!cookie) throw new Error('expected a set-cookie header');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).not.toContain('Secure');

    // express-session serializes maxAge as an absolute `Expires` date rather than
    // a `Max-Age` attribute, so assert the expiry lands ~7 days (604800s) out.
    const expiresMatch = cookie.match(/Expires=([^;]+)/);
    expect(expiresMatch).not.toBeNull();
    const expiresAt = new Date(expiresMatch?.[1] ?? '').getTime();
    const expectedMaxAgeMs = 604800 * 1000;
    const toleranceMs = 5000;
    expect(expiresAt).toBeGreaterThan(Date.now() + expectedMaxAgeMs - toleranceMs);
    expect(expiresAt).toBeLessThan(Date.now() + expectedMaxAgeMs + toleranceMs);
  });
});

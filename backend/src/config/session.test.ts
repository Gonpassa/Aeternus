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
    expect(response.headers['set-cookie']).toBeDefined();
  });
});

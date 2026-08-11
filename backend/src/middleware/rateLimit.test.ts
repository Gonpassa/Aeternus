import express from 'express';
import request from 'supertest';
import { createRateLimiter, registerRateLimiter } from './rateLimit';

describe('createRateLimiter', () => {
  it('allows requests under the limit and blocks the rest within the window', async () => {
    const app = express();
    app.use(createRateLimiter(60_000, 2));
    app.get('/test', (_req, res) => res.json({ ok: true }));

    const first = await request(app).get('/test');
    const second = await request(app).get('/test');
    const third = await request(app).get('/test');

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect(third.body).toEqual({ error: 'Too many requests, please try again later.' });
    expect(third.headers['ratelimit-limit']).toBeDefined();
  });
});

describe('registerRateLimiter', () => {
  it('is stricter than the default limiter used for login (max 5 per window)', async () => {
    const app = express();
    app.use(registerRateLimiter);
    app.get('/test', (_req, res) => res.json({ ok: true }));

    const responses: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      const res = await request(app).get('/test');
      responses.push(res.status);
    }

    expect(responses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(responses[5]).toBe(429);
  });
});

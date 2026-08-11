import express from 'express';
import request from 'supertest';
import { createRateLimiter } from './rateLimit';

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

import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';

export const createRateLimiter = (windowMs: number, max: number): RateLimitRequestHandler =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });

export const loginRateLimiter = createRateLimiter(15 * 60 * 1000, 10);

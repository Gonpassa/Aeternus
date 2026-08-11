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

// Registration is more expensive than login (bcrypt hash + a DB insert) and
// far rarer for a legitimate user, so it gets a stricter limit.
export const registerRateLimiter = createRateLimiter(60 * 60 * 1000, 5);

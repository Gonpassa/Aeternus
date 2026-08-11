import { Router } from 'express';
import { register, login, logout, me } from './controller';
import { loginRateLimiter, registerRateLimiter } from '../middleware/rateLimit';

const router = Router();

router.post('/register', registerRateLimiter, register);
router.post('/login', loginRateLimiter, login);
router.post('/logout', logout);
router.get('/me', me);

export default router;

import { Router } from 'express';
import { ensureAuth } from '../../middleware/auth';
import { listSymbols } from './symbolsController';

const router = Router();

router.use(ensureAuth);

router.get('/', listSymbols);

export default router;

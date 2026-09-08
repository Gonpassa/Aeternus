import { Router } from 'express';
import { ensureAuth } from '../../middleware/auth';
import { listDreams, createDream } from './controller';

const router = Router();

router.use(ensureAuth);

router.get('/', listDreams);
router.post('/', createDream);

export default router;

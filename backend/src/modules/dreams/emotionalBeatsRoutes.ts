import { Router } from 'express';
import { ensureAuth } from '../../middleware/auth';
import { updateEmotionalBeat, deleteEmotionalBeat } from './emotionalBeatsController';

const router = Router();

router.use(ensureAuth);

router.patch('/:id', updateEmotionalBeat);
router.delete('/:id', deleteEmotionalBeat);

export default router;

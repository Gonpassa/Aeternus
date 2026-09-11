import { Router } from 'express';
import { ensureAuth } from '../../middleware/auth';
import {
  listDreams,
  createDream,
  getDream,
  updateDream,
  createAnchor,
  createAnalysisPass,
} from './controller';

const router = Router();

router.use(ensureAuth);

router.get('/', listDreams);
router.post('/', createDream);
router.get('/:dreamId', getDream);
router.patch('/:dreamId', updateDream);
router.post('/:dreamId/anchors', createAnchor);
router.post('/:dreamId/analysis-passes', createAnalysisPass);

export default router;

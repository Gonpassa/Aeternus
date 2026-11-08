import { Router } from 'express';
import { ensureAuth } from '../../middleware/auth';
import { createSource, getSource, listSources } from './sourcesController';

const router = Router();

router.use(ensureAuth);

router.get('/', listSources);
router.post('/', createSource);
router.get('/:sourceId', getSource);

export default router;

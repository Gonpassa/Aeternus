import { Router } from 'express';
import { ensureAuth } from '../../middleware/auth';
import {
  deleteAnchor,
  createEmotionalBeat,
  createSymbolAttachment,
  createAssociation,
} from './anchorsController';

const router = Router();

router.use(ensureAuth);

router.delete('/:anchorId', deleteAnchor);
router.post('/:anchorId/emotional-beats', createEmotionalBeat);
router.post('/:anchorId/symbols', createSymbolAttachment);
router.post('/:anchorId/associations', createAssociation);

export default router;

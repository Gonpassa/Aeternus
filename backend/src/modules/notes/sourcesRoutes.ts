import { Router } from 'express';
import { ensureAuth } from '../../middleware/auth';
import { createSource, getSource, listSources } from './sourcesController';
import { createLiteratureNote } from './notesController';

const router = Router();

router.use(ensureAuth);

router.get('/', listSources);
router.post('/', createSource);
router.get('/:sourceId', getSource);
// Literature note capture, nested because it only happens with a Source open (#68).
router.post('/:sourceId/notes', createLiteratureNote);

export default router;

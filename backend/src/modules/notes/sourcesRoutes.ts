import { Router } from 'express';
import { ensureAuth } from '../../middleware/auth';
import {
  createSource,
  deleteSource,
  getSource,
  listSources,
  updateSource,
} from './sourcesController';
import { createLiteratureNote } from './notesController';

const router = Router();

router.use(ensureAuth);

router.get('/', listSources);
router.post('/', createSource);
router.get('/:sourceId', getSource);
// The PATCH body is the whole Source rather than a partial one: a field left out is cleared,
// not kept, exactly as on the create path (#83).
router.patch('/:sourceId', updateSource);
router.delete('/:sourceId', deleteSource);
// Literature note capture, nested because it only happens with a Source open (#68).
router.post('/:sourceId/notes', createLiteratureNote);

export default router;

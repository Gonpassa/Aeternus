import { Router } from 'express';
import { ensureAuth } from '../../middleware/auth';
import { createPermanentNote, getNoteConnections } from './notesController';

const router = Router();

router.use(ensureAuth);

// Flat rather than nested: a Permanent note belongs to no Source, and the note it was written
// from is one of its Link targets rather than its parent (CONTEXT.md, Permanent note).
router.post('/permanent', createPermanentNote);
// Kind-agnostic on purpose: a connections view belongs to a note, not to a note of one kind.
router.get('/:noteId/connections', getNoteConnections);

export default router;

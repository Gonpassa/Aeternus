import { Router } from 'express';
import { ensureAuth } from '../../middleware/auth';
import {
  createPermanentNote,
  deleteLiteratureNote,
  getNoteConnections,
  updateLiteratureNote,
} from './notesController';

const router = Router();

router.use(ensureAuth);

// Flat rather than nested: a Permanent note belongs to no Source, and the note it was written
// from is one of its Link targets rather than its parent (CONTEXT.md, Permanent note).
router.post('/permanent', createPermanentNote);
// Kind-agnostic on purpose: a connections view belongs to a note, not to a note of one kind.
router.get('/:noteId/connections', getNoteConnections);

// Correcting and deleting a filed note are addressed by the note's own id rather than nested
// under its Source: capture needs a Source open, a correction needs only the note (#83). Both
// kinds share this id space (ADR 0012), so these routes narrow to the Literature kind
// themselves.
//
// The PATCH body is the whole note rather than a partial one: a field left out is cleared, not
// kept, which is how an emptied excerpt is stored as no excerpt (#83). The card always sends
// every field it carries, so there is no partial caller to surprise.
router.patch('/:noteId', updateLiteratureNote);
router.delete('/:noteId', deleteLiteratureNote);

export default router;

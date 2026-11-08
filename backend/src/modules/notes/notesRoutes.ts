import { Router } from 'express';
import { ensureAuth } from '../../middleware/auth';
import { deleteLiteratureNote, updateLiteratureNote } from './notesController';

const router = Router();

router.use(ensureAuth);

// Correcting and deleting a filed note are addressed by the note's own id rather than nested
// under its Source: capture needs a Source open, a correction needs only the note (#83). Both
// kinds share this id space (ADR 0012), so these routes narrow to the Literature kind
// themselves; the Permanent note's own routes arrive with its ticket.
router.patch('/:noteId', updateLiteratureNote);
router.delete('/:noteId', deleteLiteratureNote);

export default router;

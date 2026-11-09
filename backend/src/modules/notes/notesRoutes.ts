import { Router } from 'express';
import { ensureAuth } from '../../middleware/auth';
import { listLinkTargets } from './linkTargetsController';
import {
  createPermanentNote,
  deleteLiteratureNote,
  getNoteConnections,
  updateLiteratureNote,
} from './notesController';
import { listTopicRelatedNotes } from './topicsController';

const router = Router();

router.use(ensureAuth);

// Flat rather than nested: a Permanent note belongs to no Source, and the note it was written
// from is one of its Link targets rather than its parent (CONTEXT.md, Permanent note).
router.post('/permanent', createPermanentNote);
// The browsable panel's two tiers, keyed on the note being linked from rather than on a
// Source, so Review reuses the same question without a fork (#85). Declared ahead of the
// `/:noteId` routes below so a literal segment is never read as an id.
router.get('/link-targets', listLinkTargets);
// Kind-agnostic on purpose: a connections view belongs to a note, not to a note of one kind.
router.get('/:noteId/connections', getNoteConnections);
// The link panel's Topic tier, read about one note: the notes sharing a Topic with it, which a
// Literature note reaches through the Topics it inherits from its Source (#87). Kind-agnostic
// for the same reason the connections view is.
router.get('/:noteId/topic-notes', listTopicRelatedNotes);

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

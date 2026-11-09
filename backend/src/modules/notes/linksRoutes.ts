import { Router } from 'express';
import { ensureAuth } from '../../middleware/auth';
import { createLink, deleteLink, updateLinkReason } from './linksController';

const router = Router();

router.use(ensureAuth);

// A Link has a top-level resource of its own because it belongs to neither of its ends: it is
// a relation between two notes, made and unmade from either side (ADR 0013). The Permanent
// note composer's Links still travel with the note they are created in one transaction with,
// which is why this router has no nesting under /notes.
router.post('/', createLink);
// The reason only - the Link's ends never change, since a Link pointing somewhere else is a
// different connection.
router.patch('/:linkId', updateLinkReason);
router.delete('/:linkId', deleteLink);

export default router;

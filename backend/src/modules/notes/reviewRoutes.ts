import { Router } from 'express';
import { ensureAuth } from '../../middleware/auth';
import { createReviewAnswer, getReviewDueCount, getReviewQueue } from './reviewController';

const router = Router();

router.use(ensureAuth);

// Review has a resource of its own rather than hanging off /notes, because the queue belongs
// to the user's whole corpus rather than to any one note or Source: Review is the other page
// of the module (CONTEXT.md, Review).
router.get('/queue', getReviewQueue);
// The rail badge, read on its own so no page waits on the queue to show one number.
router.get('/due-count', getReviewDueCount);
// Appending an Answer, and deliberately the only write here: there is no PATCH and no DELETE
// on this collection, because the history is append-only (ADR 0011). Clearing the
// open-question flag is not among these either - it is orthogonal to the Answers, no Answer
// resolves it, and it is cleared through the note's own correction endpoint (CONTEXT.md, Open
// question).
router.post('/answers', createReviewAnswer);

export default router;

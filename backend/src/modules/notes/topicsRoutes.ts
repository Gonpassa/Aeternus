import { Router } from 'express';
import { ensureAuth } from '../../middleware/auth';
import { listTopics } from './topicsController';

const router = Router();

router.use(ensureAuth);

// Reading the vocabulary is all this router does: a Topic is created by typing its name on a
// carrier, so there is no create endpoint here, and renaming, merging and deleting are #88.
router.get('/', listTopics);

export default router;

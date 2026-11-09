import { Router } from 'express';
import { ensureAuth } from '../../middleware/auth';
import { deleteTopic, getTopic, listTopics, renameTopic } from './topicsController';

const router = Router();

router.use(ensureAuth);

// A Topic is created by typing its name on a carrier, so there is no create endpoint here.
// What a Topic does take is a place of its own and the vocabulary maintenance that belongs
// where its carriers are already on screen: renaming - which is also the merge - and deleting
// (#88, CONTEXT.md, Topic).
router.get('/', listTopics);
router.get('/:topicId', getTopic);
router.patch('/:topicId', renameTopic);
router.delete('/:topicId', deleteTopic);

export default router;

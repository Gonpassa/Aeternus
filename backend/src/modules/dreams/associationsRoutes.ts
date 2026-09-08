import { Router } from 'express';
import { ensureAuth } from '../../middleware/auth';
import { updateAssociation, deleteAssociation } from './associationsController';

const router = Router();

router.use(ensureAuth);

router.patch('/:id', updateAssociation);
router.delete('/:id', deleteAssociation);

export default router;

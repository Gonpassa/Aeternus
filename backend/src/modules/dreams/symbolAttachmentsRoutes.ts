import { Router } from 'express';
import { ensureAuth } from '../../middleware/auth';
import { deleteSymbolAttachment, createAssociation } from './symbolAttachmentsController';

const router = Router();

router.use(ensureAuth);

router.delete('/:id', deleteSymbolAttachment);
router.post('/:id/associations', createAssociation);

export default router;

import { Router } from 'express';
import { ensureAuth } from '../../middleware/auth';
import { deleteSymbolAttachment } from './symbolAttachmentsController';

const router = Router();

router.use(ensureAuth);

router.delete('/:id', deleteSymbolAttachment);

export default router;

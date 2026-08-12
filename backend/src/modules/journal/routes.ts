import { Router } from 'express';
import { ensureAuth } from '../../middleware/auth';
import {
  listEntries,
  getEntry,
  getEntryByDate,
  getEntriesByRange,
  createEntry,
  updateEntry,
  deleteEntry,
} from './controller';

const router = Router();

router.use(ensureAuth);

router.get('/entries', listEntries);
router.get('/entries/by-date/:date', getEntryByDate);
router.get('/entries/by-range', getEntriesByRange);
router.get('/entries/:id', getEntry);
router.post('/entries', createEntry);
router.put('/entries/:id', updateEntry);
router.delete('/entries/:id', deleteEntry);

export default router;

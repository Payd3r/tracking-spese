import express from 'express';
import {
  getTransfers,
  getTransfer,
  createTransfer,
  deleteTransfer
} from '../controllers/transferController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', getTransfers);
router.get('/:id', getTransfer);
router.post('/', createTransfer);
router.delete('/:id', deleteTransfer);

export default router;



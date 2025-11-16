import express from 'express';
import {
  getAllLoans,
  getLoan,
  createLoan,
  addRepayment,
  closeLoan,
  deleteLoan
} from '../controllers/loanController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', getAllLoans);
router.get('/:id', getLoan);
router.post('/', createLoan);
router.post('/:id/repayments', addRepayment);
router.post('/:id/close', closeLoan);
router.delete('/:id', deleteLoan);

export default router;


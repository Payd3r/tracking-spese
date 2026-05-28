import express from 'express';
import {
  getAllLoans,
  getLoan,
  createLoan,
  validateLoanAdmin,
  convertTransactionToLoan,
  attachRepaymentTransaction,
  addRepayment,
  closeLoan,
  deleteLoan
} from '../controllers/loanController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', getAllLoans);
router.post('/admin/validate', validateLoanAdmin);
router.post('/admin/convert-from-transaction', convertTransactionToLoan);
router.post('/admin/:id/attach-repayment-transaction', attachRepaymentTransaction);
router.get('/:id', getLoan);
router.post('/', createLoan);
router.post('/:id/repayments', addRepayment);
router.post('/:id/close', closeLoan);
router.delete('/:id', deleteLoan);

export default router;


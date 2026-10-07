import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getBankingStatus,
  listAvailableAspsps,
  startBankingAuth,
  exchangeBankingCode,
  syncBankingNow,
  deleteBankingSession,
} from '../controllers/bankingController.js';

const router = Router();

router.use(authMiddleware);

router.get('/status', getBankingStatus);
router.get('/aspsps', listAvailableAspsps);
router.post('/auth', startBankingAuth);
router.post('/exchange', exchangeBankingCode);
router.post('/sync', syncBankingNow);
router.delete('/sessions/:id', deleteBankingSession);

export default router;

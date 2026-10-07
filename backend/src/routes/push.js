import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getVapidKey,
  subscribePush,
  unsubscribePush,
  getPushStatus,
} from '../controllers/pushController.js';

const router = Router();

router.get('/vapid-public-key', authMiddleware, getVapidKey);
router.get('/status', authMiddleware, getPushStatus);
router.post('/subscribe', authMiddleware, subscribePush);
router.delete('/subscribe', authMiddleware, unsubscribePush);

export default router;

import express from 'express';
import { getCurrencies, convert } from '../controllers/currencyController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', getCurrencies);
router.get('/convert', convert);

export default router;



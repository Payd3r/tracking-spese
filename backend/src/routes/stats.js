import express from 'express';
import { getDashboardStats, getCategoryStats } from '../controllers/statsController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/dashboard', getDashboardStats);
router.get('/categories', getCategoryStats);

export default router;



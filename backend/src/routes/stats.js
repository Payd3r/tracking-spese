import express from 'express';
import { getDashboardStats } from '../controllers/statsController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/dashboard', getDashboardStats);

export default router;



import express from 'express';
import {
  getPasskeyStatus,
  generatePasskeyRegisterOptions,
  verifyPasskeyRegistration,
  generatePasskeyLoginOptions,
  verifyPasskeyLogin,
  logout,
  me,
  updateProfile,
} from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Passkey endpoints
router.get('/status', getPasskeyStatus);
router.get('/passkey/register-options', generatePasskeyRegisterOptions);
router.post('/passkey/register-verify', verifyPasskeyRegistration);
router.get('/passkey/login-options', generatePasskeyLoginOptions);
router.post('/passkey/login-verify', verifyPasskeyLogin);

// Authenticated routes
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, me);
router.put('/profile', authMiddleware, updateProfile);

export default router;

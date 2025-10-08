import express from 'express';
import {
  registerPatient,
  registerPractitioner,
  registerAdmin,
  login,
  logout,
  refreshAccessToken,
  changePassword,
  getCurrentUser,
  forgotPassword,
  resetPassword
} from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.post('/register/patient', registerPatient);
router.post('/register/practitioner', registerPractitioner);
router.post('/register/admin', registerAdmin);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.post('/logout', authMiddleware, logout);
router.post('/refresh-token', refreshAccessToken);
router.post('/change-password', authMiddleware, changePassword);
router.get('/me', authMiddleware, getCurrentUser);

export default router;
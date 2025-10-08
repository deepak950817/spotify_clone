import express from 'express';
import {
  recommendSlots,
  confirmBooking,
  cancelSession,
  getSession,
  listSessions,
  forceBookSession,
  reassignPractitioner

} from '../controllers/session.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Session CRUD routes
router.post('/recommend', recommendSlots);
router.post('/confirm', confirmBooking);
router.post('/:Id/cancel', cancelSession);
router.get('/:Id', getSession);
router.get('/', listSessions);
router.post('/force',forceBookSession);
router.post('/:Id/reassign', reassignPractitioner);

export default router;
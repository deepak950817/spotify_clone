import express from 'express';
import {
  getDashboard,
  createPractitioner,
  getAllPractitioners,
  getAllPatients,
  getAllSessions,
  forceBookSession,
  reassignPractitioner,
  getFeedbackReports,
  getPractitionerAnalytics,
  sendBroadcastNotification,
  getAuditLogs
} from '../controllers/admin.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';

const router = express.Router();

// All routes require admin authentication
router.use(authMiddleware);
router.use(roleMiddleware(['admin']));

// Dashboard routes
router.get('/dashboard', getDashboard);

// Practitioner management routes
router.post('/practitioners', createPractitioner);
router.get('/practitioners', getAllPractitioners);

// Patient management routes
router.get('/patients', getAllPatients);

// Session management routes
router.get('/sessions', getAllSessions);
router.post('/sessions/force-book', forceBookSession);  //doubtful
router.patch('/sessions/:sessionId/reassign', reassignPractitioner); //doubtful

// Analytics routes
router.get('/analytics/feedback', getFeedbackReports);
router.get('/analytics/practitioners', getPractitionerAnalytics);

// Notification routes
router.post('/notifications/broadcast', sendBroadcastNotification);

// Audit routes
router.get('/audit-logs', getAuditLogs);

export default router;
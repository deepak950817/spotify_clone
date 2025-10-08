import express from 'express';
import {
  getDashboard,
  createPractitioner,
  getAllPractitioners,
  updatePractitioner,
  deactivatePractitioner,
  getAllPatients,
  updatePatient,
  deactivatePatient,
  getAllSessions,
  forceBookSession,
  reassignPractitioner,
  bulkReschedule,
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
router.put('/practitioners/:practitionerId', updatePractitioner);
router.patch('/practitioners/:practitionerId/deactivate', deactivatePractitioner);

// Patient management routes
router.get('/patients', getAllPatients);
router.put('/patients/:patientId', updatePatient);
router.patch('/patients/:patientId/deactivate', deactivatePatient);

// Session management routes
router.get('/sessions', getAllSessions);
router.post('/sessions/force-book', forceBookSession);
router.patch('/sessions/:sessionId/reassign', reassignPractitioner);
router.post('/sessions/bulk-reschedule', bulkReschedule);

// Analytics routes
router.get('/analytics/feedback', getFeedbackReports);
router.get('/analytics/practitioners', getPractitionerAnalytics);

// Notification routes
router.post('/notifications/broadcast', sendBroadcastNotification);

// Audit routes
router.get('/audit-logs', getAuditLogs);

export default router;
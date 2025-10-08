import express from 'express';
import {
  createSession,
  getSession,
  updateSession,
  cancelSession,
  rescheduleSession,
  completeSession,
  getSessionsByPatient,
  getSessionsByPractitioner,
  getSessionsByCenter,
  getSessionsByDateRange,
  checkConflicts,
  addSessionNotes
} from '../controllers/session.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Session CRUD routes
router.post('/', createSession);
router.get('/:sessionId', getSession);
router.put('/:sessionId', updateSession);
router.patch('/:sessionId/cancel', cancelSession);
router.patch('/:sessionId/reschedule', rescheduleSession);
router.patch('/:sessionId/complete', completeSession);
router.patch('/:sessionId/notes', addSessionNotes);

// Conflict checking
router.post('/check-conflicts', checkConflicts);

// Filtered session routes
router.get('/patient/:patientId', getSessionsByPatient);
router.get('/practitioner/:practitionerId', getSessionsByPractitioner);
router.get('/center/:centerId', getSessionsByCenter);
router.get('/date-range/query', getSessionsByDateRange);

export default router;
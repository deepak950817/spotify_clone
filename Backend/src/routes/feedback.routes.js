import express from 'express';
import {
  createFeedback,
  getAllFeedback,
  getFeedbackById,
  getFeedbackBySession,
  getFeedbackByPractitioner,
  getFeedbackByPatient,
  updateFeedback,
  deleteFeedback,
  getFeedbackSummary,
  analyzeSentiment
} from '../controllers/feedback.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Patient can create and manage their feedback
router.post('/', createFeedback);
router.get('/my-feedback', getAllFeedback);
router.get('/:feedbackId', getFeedbackById);
router.put('/:feedbackId', updateFeedback);
router.delete('/:feedbackId', deleteFeedback);

// Get feedback by various filters
router.get('/session/:sessionId', getFeedbackBySession);
router.get('/practitioner/:practitionerId', getFeedbackByPractitioner);
router.get('/patient/:patientId', getFeedbackByPatient);

// AI analysis
router.get('/:feedbackId/analyze', analyzeSentiment);

// Admin-only analytics
router.get('/analytics/summary', roleMiddleware(['admin']), getFeedbackSummary);

export default router;
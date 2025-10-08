import express from 'express';
import {
  getProfile,
  updateProfile,
  getSpecializations,
  updateSpecializations,
  getWorkingHours,
  updateWorkingHours,
  getUpcomingSessions,
  getCompletedSessions,
  markSessionComplete,
  addSessionOutcome,
  getPatientDetails,
  getAssignedPatients,
  getPerformanceStats,
  getFeedback,
  updateProfileImage,
  updateDurationEstimates
} from '../controllers/practitioner.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';

const router = express.Router();

// All routes require practitioner authentication
router.use(authMiddleware);
router.use(roleMiddleware(['practitioner']));

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.patch('/profile/image', updateProfileImage);

// Specialization routes
router.get('/specializations', getSpecializations);
router.put('/specializations', updateSpecializations);

// Working hours routes
router.get('/working-hours', getWorkingHours);  //sbse phle get krenge
router.put('/working-hours', updateWorkingHours);

// Duration estimates
router.put('/duration-estimates', updateDurationEstimates);

// Session routes
router.get('/sessions/upcoming', getUpcomingSessions);
router.get('/sessions/completed', getCompletedSessions);
router.patch('/sessions/:sessionId/complete', markSessionComplete);
router.patch('/sessions/:sessionId/outcome', addSessionOutcome); //isko itna use nhi krna

// Patient routes
router.get('/patients', getAssignedPatients);
router.get('/patients/:patientId', getPatientDetails);

// Performance routes
router.get('/performance', getPerformanceStats);

// Feedback routes
router.get('/feedback', getFeedback);

export default router;
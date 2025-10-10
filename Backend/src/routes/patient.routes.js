import express from 'express';
import {
  getProfile,
  updateProfile,
  getMedicalHistory,
  updateMedicalHistory,
  getTherapyPreferences,
  updateTherapyPreferences,
  getAvailability,
  updateAvailability,
  getUpcomingSessions,
  getSessionHistory,
  getProgress,
  getNotifications,
  updateProfileImage,
  deactivateAccount,
  activateAccount
} from '../controllers/patient.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';
import { upload } from '../middleware/multer.middleware.js';
const router = express.Router();

// All routes require patient authentication
router.use(authMiddleware);
router.use(roleMiddleware(['patient']));  //dikkat pr hta denge

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.patch('/profile/image', upload.single('profileimage'), updateProfileImage);
router.patch('/deactivate', deactivateAccount);
router.patch('/activate', activateAccount);
// Medical history routes
router.get('/medical-history', getMedicalHistory);
router.put('/medical-history', updateMedicalHistory);

// Therapy preferences routes
router.get('/therapy-preferences', getTherapyPreferences);
router.put('/therapy-preferences', updateTherapyPreferences);

// Availability routes
router.get('/availability', getAvailability);
router.put('/availability', updateAvailability);

// Session routes
router.get('/sessions/upcoming', getUpcomingSessions);
router.get('/sessions/history', getSessionHistory);  //status lena h

// Progress routes
router.get('/progress', getProgress);

// Notification routes
router.get('/notifications', getNotifications);

export default router;
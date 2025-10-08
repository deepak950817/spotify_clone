import express from 'express';
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  sendNotification,
  getNotificationStats,
  sendSessionReminder,
  sendFeedbackRequest,
  clearExpiredNotifications,
  getUnreadCount
} from '../controllers/notification.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// User notification management
router.get('/', getUserNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/:notificationId/read', markAsRead);
router.patch('/read-all', markAllAsRead);
router.delete('/:notificationId', deleteNotification);

// Send notifications (admin and practitioner only)
router.post('/send', roleMiddleware(['admin', 'practitioner']), sendNotification);
router.post('/session-reminder', roleMiddleware(['admin']), sendSessionReminder);
router.post('/feedback-request', roleMiddleware(['admin', 'practitioner']), sendFeedbackRequest);

// Admin-only management
router.get('/stats', roleMiddleware(['admin']), getNotificationStats);
router.delete('/clear-expired', roleMiddleware(['admin']), clearExpiredNotifications);

export default router;
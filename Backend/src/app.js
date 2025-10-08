import express from 'express';
import authRoutes from './routes/auth.routes.js';
import patientRoutes from './routes/patient.routes.js';
import practitionerRoutes from './routes/practitioner.routes.js';
import adminRoutes from './routes/admin.routes.js';
import sessionRoutes from './routes/session.routes.js';
import rescheduleRequestRoutes from './routes/rescheduleRequest.routes.js';
import feedbackRoutes from './routes/feedback.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import auditLogRoutes from './routes/admin.routes.js';

const router = express.Router();

// API routes
router.use('/auth', authRoutes);
router.use('/patients', patientRoutes);
router.use('/practitioners', practitionerRoutes);
router.use('/admin', adminRoutes);
router.use('/sessions', sessionRoutes);
router.use('/reschedule-requests', rescheduleRequestRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/notifications', notificationRoutes);
router.use('/audit-logs', auditLogRoutes);

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Ayursutra API is running',
    timestamp: new Date().toISOString()
  });
});

export default router;
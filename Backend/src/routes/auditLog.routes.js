import express from 'express';
import {
  getAllAuditLogs,
  getAuditLogsByUser,
  getAuditLogsByAction,
  getAuditLogsByDateRange,
  exportAuditLogs,
  getAuditSummary,
  searchAuditLogs
} from '../controllers/auditLog.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Role-based access to audit logs
router.get('/', getAllAuditLogs);
router.get('/search', searchAuditLogs);
router.get('/summary', getAuditSummary);
router.get('/user/:userId', getAuditLogsByUser);
router.get('/action/:action', getAuditLogsByAction);
router.get('/date-range', getAuditLogsByDateRange);

// Admin-only routes
// router.get('/system', roleMiddleware(['admin']), getSystemLogs);
router.get('/export', roleMiddleware(['admin']), exportAuditLogs);

export default router;
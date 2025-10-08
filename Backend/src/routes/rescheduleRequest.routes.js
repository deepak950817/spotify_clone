import express from 'express';
import {
  createRequest,
  getPendingRequests,
  getRequestById,
  approveRequest,
  rejectRequest,
  getRequestsBySession,
  getRequestsByUser,
  addReviewNotes,
  cancelRequest
} from '../controllers/rescheduleRequest.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Patient and practitioner can create requests
router.post('/', createRequest);

// Admin-only routes for approval/rejection
router.patch('/:requestId/approve', roleMiddleware(['admin']), approveRequest);
router.patch('/:requestId/reject', roleMiddleware(['admin']), rejectRequest);
router.patch('/:requestId/notes', roleMiddleware(['admin']), addReviewNotes);

// Get requests (role-based access)
router.get('/pending', getPendingRequests);
router.get('/:requestId', getRequestById);
router.get('/session/:sessionId', getRequestsBySession);
router.get('/user/:userId', getRequestsByUser);

// Cancel own request
router.patch('/:requestId/cancel', cancelRequest);

export default router;
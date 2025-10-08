import express from "express";
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';
import { createCenter,removeCenter,getAvailableCenters, getCurrentCenter, joinCenter, leaveCenter, switchCenter } from "../controllers/center.controller.js";

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware(['patient']));

// ... existing routes ...

// Center management routes
router.get('/available', getAvailableCenters);
router.get('/current', getCurrentCenter);
router.post('/join', joinCenter);
router.post('/leave', leaveCenter);
router.post('/switch', switchCenter);
router.post('/create', createCenter);
router.delete('/remove/:centerId', removeCenter);
export default router;
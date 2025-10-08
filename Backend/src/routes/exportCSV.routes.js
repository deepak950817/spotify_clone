import express from "express";
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';
import { exportCSV } from "../controllers/report.controller.js";
import { feedbackSummary } from "../controllers/report.controller.js";
const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware(['patient']));

router.get('/export', exportCSV);
router.get('/feedback-summary', feedbackSummary);
export default router;
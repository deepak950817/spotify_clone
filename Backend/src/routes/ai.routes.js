// routes/ai.routes.js
import express from 'express';
import  { health, metrics, predictSlots, retrain, testSlot } from '../controllers/ai.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js'; // adjust path if needed

const router = express.Router();

router.get('/health', health);

router.post('/predict_slots', predictSlots);

router.post('/test-slot', testSlot);

router.post('/retrain', authMiddleware, retrain);

router.get('/metrics', authMiddleware, metrics);

export default router;
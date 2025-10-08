// controllers/ai.controller.js
const axios = require('axios');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiResponse } = require('../utils/ApiResponse');
const { ApiError } = require('../utils/ApiError');
const AuditLog = require('../models/AuditLog.models');



const AI_BASE = process.env.AI_SERVICE_URL; // e.g. http://localhost:8000
const AI_RETRAIN_API_KEY = process.env.AI_RETRAIN_API_KEY;

// GET /api/ai/health

exports.health = asyncHandler(async (req, res) => {
  try {
    const r = await axios.get(`${AI_BASE}/health`, { timeout: 3000 });
    return res.status(200).json(new ApiResponse(200, r.data, 'AI service healthy'));
  } catch (err) {
    throw new ApiError(502, 'AI service unreachable');
  }
});

// POST /api/ai/predict_slots
// Proxy endpoint (Node -> FastAPI). Request body forwarded as-is.
exports.predictSlots = asyncHandler(async (req, res) => {
  try {
    const payload = req.body;
    const r = await axios.post(`${AI_BASE}/predict_slots`, payload, { timeout: 15000 });
    return res.status(200).json(new ApiResponse(200, r.data, 'Predictions'));
  } catch (err) {
    console.error('AI predict error:', err?.response?.data || err.message);
    throw new ApiError(502, 'AI predict failed');
  }
});

// POST /api/ai/test-slot
// Simple helper to test a single candidate; useful in development.
exports.testSlot = asyncHandler(async (req, res) => {
  try {
    const payload = { candidates: [req.body] };
    const r = await axios.post(`${AI_BASE}/predict_slots`, payload, { timeout: 8000 });
    return res.status(200).json(new ApiResponse(200, r.data, 'Test prediction'));
  } catch (err) {
    console.error('AI test-slot error:', err?.response?.data || err.message);
    throw new ApiError(502, 'AI test failed');
  }
});

// POST /api/ai/retrain  (admin only)
exports.retrain = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') throw new ApiError(403, 'Admin only');
  try {
    const r = await axios.post(`${AI_BASE}/retrain`, req.body || {}, { timeout: 10000 ,
      headers: { "x-retrain-api-key": AI_RETRAIN_API_KEY }
    });
    await AuditLog.create({
      userId: req.user.id, userModel: 'Admin',
      action: 'update', resourceType: 'AI', description: 'Triggered AI retrain'
    });
    return res.status(200).json(new ApiResponse(200, r.data, 'Retrain triggered'));
  } catch (err) {
    console.error('AI retrain error:', err?.response?.data || err.message);
    throw new ApiError(502, 'AI retrain failed');
  }
});

// GET /api/ai/metrics  (admin only)
exports.metrics = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') throw new ApiError(403, 'Admin only');
  try {
    const r = await axios.get(`${AI_BASE}/metrics`, { timeout: 8000 });
    return res.status(200).json(new ApiResponse(200, r.data, 'AI metrics'));
  } catch (err) {
    console.error('AI metrics error:', err?.response?.data || err.message);
    throw new ApiError(502, 'AI metrics failed');
  }
});

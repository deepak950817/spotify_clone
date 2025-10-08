// controllers/session.controller.js
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiResponse } = require('../utils/ApiResponse');
const { ApiError } = require('../utils/ApiError');
const Session = require('../models/Session.models');
const Practitioner = require('../models/Practitioner.models');
const Patient = require('../models/Patient.models');
const AuditLog = require('../models/AuditLog.models');
const Notification = require('../models/Notification.models');
const axios = require('axios');
const redis = require('../utils/redisClient'); // optional reservation tokens

// POST /api/sessions/recommend
// Generate candidate slots and call AI service for scoring
exports.recommendSlots = asyncHandler(async (req, res) => {
  const { patientId, therapyType, preferredWindows, durationMinutes } = req.body;
  // generate simple candidate slots from practitioner availability (MVP)
  const practitioners = await Practitioner.find({ 'specialization.therapyType': therapyType, isActive: true });
  const now = new Date();
  const candidates = [];
  for (const pr of practitioners) {
    // take next 3 days, sample hours near center of their working hours
    for (let d = 0; d < 3; d++) {
      const day = new Date(now); day.setDate(now.getDate() + d);
      const sampleHours = [10, 14, 16];
      sampleHours.forEach(hour => {
        const start = new Date(day); start.setHours(hour, 0, 0, 0);
        const end = new Date(start.getTime() + (durationMinutes || 60) * 60000);
        candidates.push({
          practitionerId: pr._id.toString(),
          start: start.toISOString(),
          end: end.toISOString(),
          durationMinutes: durationMinutes || pr.durationEstimates?.get(therapyType) || 60
        });
      });
    }
  }

  // call AI microservice (expects features)
  try {
    const payload = { candidates: candidates.map(c => ({
      therapy_duration: c.durationMinutes,
      practitioner_load: 0.5,
      patient_flexibility: 0.8,
      day_of_week: new Date(c.start).getDay(),
      hour_of_day: new Date(c.start).getHours(),
      center_utilization: 0.6
    }))};
    const aiRes = await axios.post(`${process.env.AI_SERVICE_URL}/predict_slots`, payload, { timeout: 5000 });
    const scored = aiRes.data.top_recommendations || [];
    // attach reservation token and return
    const response = scored.map((s, i) => ({ ...candidates[i], predicted_score: s.predicted_score }));
    // optionally store short reservation token
    res.status(200).json(new ApiResponse(200, response, 'Recommendations'));
  } catch (err) {
    // fallback: sort by heuristic
    const heuristic = candidates.map(c => ({ ...c, predicted_score: 0.5 }));
    res.status(200).json(new ApiResponse(200, heuristic, 'Recommendations (heuristic)'));
  }
});

// POST /api/sessions/confirm
exports.confirmBooking = asyncHandler(async (req, res) => {
  const { reservationPayload } = req.body; // expects practitionerId, start, durationMinutes, therapyType, centerId
  const patientId = req.user.id;
  const start = new Date(reservationPayload.start);
  const end = new Date(start.getTime() + (reservationPayload.durationMinutes || 60)*60000);
  // conflict check
  const conflict = await Session.findOne({ practitionerId: reservationPayload.practitionerId, $or: [
    { scheduledStart: { $lt: end }, scheduledEnd: { $gt: start } }
  ]});
  if (conflict) throw new ApiError(409, 'Slot no longer available');
  const session = await Session.create({
    patientId, practitionerId: reservationPayload.practitionerId, centerId: reservationPayload.centerId,
    therapyType: reservationPayload.therapyType, scheduledStart: start, scheduledEnd: end,
    durationMinutes: reservationPayload.durationMinutes || 60, createdBy: 'AI'
  });
  await AuditLog.create({ userId: patientId, userModel: 'Patient', action: 'create', resourceType: 'Session', resourceId: session._id, description: 'Session booked (AI)' });
  await Notification.insertMany([
    { userId: session.patientId, userModel: 'Patient', title: 'Booking confirmed', message: `Your session at ${start}` },
    { userId: session.practitionerId, userModel: 'Practitioner', title: 'New session', message: `You have a session at ${start}` }
  ]);
  res.status(201).json(new ApiResponse(201, session, 'Booked'));
});

// GET /api/sessions/:id
exports.getSession = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const s = await Session.findById(id).populate('patientId practitionerId');
  if (!s) throw new ApiError(404, 'Not found');
  // permission: patient/practitioner/admin can view as applicable
  if (req.user.role === 'patient' && s.patientId._id.toString() !== req.user.id) throw new ApiError(403, 'Forbidden');
  if (req.user.role === 'practitioner' && s.practitionerId._id.toString() !== req.user.id) throw new ApiError(403, 'Forbidden');
  res.status(200).json(new ApiResponse(200, s));
});

// GET /api/sessions (general listing - admin)
exports.listAll = asyncHandler(async (req, res) => {
  const sessions = await Session.find().populate('patientId practitionerId');
  res.status(200).json(new ApiResponse(200, sessions));
});

// // controllers/session.controller.js
// const { asyncHandler } = require('../utils/asyncHandler');
// const { ApiResponse } = require('../utils/ApiResponse');
// const { ApiError } = require('../utils/ApiError');
// const Session = require('../models/Session.models');
// const Practitioner = require('../models/Practitioner.models');
// const Patient = require('../models/Patient.models');
// const AuditLog = require('../models/AuditLog.models');
// const Notification = require('../models/Notification.models');
// const axios = require('axios');
// const redis = require('../utils/redisClient'); // optional reservation tokens

// // POST /api/sessions/recommend
// // Generate candidate slots and call AI service for scoring
// exports.recommendSlots = asyncHandler(async (req, res) => {
//   const { patientId, therapyType, preferredWindows, durationMinutes } = req.body;
//   // generate simple candidate slots from practitioner availability (MVP)
//   const practitioners = await Practitioner.find({ 'specialization.therapyType': therapyType, isActive: true });
//   const now = new Date();
//   const candidates = [];
//   for (const pr of practitioners) {
//     // take next 3 days, sample hours near center of their working hours
//     for (let d = 0; d < 3; d++) {
//       const day = new Date(now); day.setDate(now.getDate() + d);
//       const sampleHours = [10, 14, 16];
//       sampleHours.forEach(hour => {
//         const start = new Date(day); start.setHours(hour, 0, 0, 0);
//         const end = new Date(start.getTime() + (durationMinutes || 60) * 60000);
//         candidates.push({
//           practitionerId: pr._id.toString(),
//           start: start.toISOString(),
//           end: end.toISOString(),
//           durationMinutes: durationMinutes || pr.durationEstimates?.get(therapyType) || 60
//         });
//       });
//     }
//   }

//   // call AI microservice (expects features)
//   try {
//     const payload = { candidates: candidates.map(c => ({
//       therapy_duration: c.durationMinutes,
//       practitioner_load: 0.5,
//       patient_flexibility: 0.8,
//       day_of_week: new Date(c.start).getDay(),
//       hour_of_day: new Date(c.start).getHours(),
//       center_utilization: 0.6
//     }))};
//     const aiRes = await axios.post(`${process.env.AI_SERVICE_URL}/predict_slots`, payload, { timeout: 5000 });
//     const scored = aiRes.data.top_recommendations || [];
//     // attach reservation token and return
//     const response = scored.map((s, i) => ({ ...candidates[i], predicted_score: s.predicted_score }));
//     // optionally store short reservation token
//     res.status(200).json(new ApiResponse(200, response, 'Recommendations'));
//   } catch (err) {
//     // fallback: sort by heuristic
//     const heuristic = candidates.map(c => ({ ...c, predicted_score: 0.5 }));
//     res.status(200).json(new ApiResponse(200, heuristic, 'Recommendations (heuristic)'));
//   }
// });

// // POST /api/sessions/confirm
// exports.confirmBooking = asyncHandler(async (req, res) => {
//   const { reservationPayload } = req.body; // expects practitionerId, start, durationMinutes, therapyType, centerId
//   const patientId = req.user.id;
//   const start = new Date(reservationPayload.start);
//   const end = new Date(start.getTime() + (reservationPayload.durationMinutes || 60)*60000);
//   // conflict check
//   const conflict = await Session.findOne({ practitionerId: reservationPayload.practitionerId, $or: [
//     { scheduledStart: { $lt: end }, scheduledEnd: { $gt: start } }
//   ]});
//   if (conflict) throw new ApiError(409, 'Slot no longer available');
//   const session = await Session.create({
//     patientId, practitionerId: reservationPayload.practitionerId, centerId: reservationPayload.centerId,
//     therapyType: reservationPayload.therapyType, scheduledStart: start, scheduledEnd: end,
//     durationMinutes: reservationPayload.durationMinutes || 60, createdBy: 'AI'
//   });
//   await AuditLog.create({ userId: patientId, userModel: 'Patient', action: 'create', resourceType: 'Session', resourceId: session._id, description: 'Session booked (AI)' });
//   await Notification.insertMany([
//     { userId: session.patientId, userModel: 'Patient', title: 'Booking confirmed', message: `Your session at ${start}` },
//     { userId: session.practitionerId, userModel: 'Practitioner', title: 'New session', message: `You have a session at ${start}` }
//   ]);
//   res.status(201).json(new ApiResponse(201, session, 'Booked'));
// });

// // GET /api/sessions/:id
// exports.getSession = asyncHandler(async (req, res) => {
//   const id = req.params.id;
//   const s = await Session.findById(id).populate('patientId practitionerId');
//   if (!s) throw new ApiError(404, 'Not found');
//   // permission: patient/practitioner/admin can view as applicable
//   if (req.user.role === 'patient' && s.patientId._id.toString() !== req.user.id) throw new ApiError(403, 'Forbidden');
//   if (req.user.role === 'practitioner' && s.practitionerId._id.toString() !== req.user.id) throw new ApiError(403, 'Forbidden');
//   res.status(200).json(new ApiResponse(200, s));
// });

// // GET /api/sessions (general listing - admin)
// exports.listAll = asyncHandler(async (req, res) => {
//   const sessions = await Session.find().populate('patientId practitionerId');
//   res.status(200).json(new ApiResponse(200, sessions));
// });


// controllers/session.controller.js
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiResponse } = require('../utils/ApiResponse');
const { ApiError } = require('../utils/ApiError');
const axios = require('axios');
const crypto = require('crypto');

const Session = require('../models/Session.models');
const Practitioner = require('../models/Practitioner.models');
const Patient = require('../models/Patient.models');
const AuditLog = require('../models/AuditLog.models');
const Notification = require('../models/Notification.models');
const RescheduleRequest = require('../models/RescheduleRequest.models');

const AI_BASE = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Simple in-memory reservation store for demo (TTL based).
// In production use Redis (recommended) for cross-process reservations.
const reservations = new Map(); // token -> {payload, expiresAt}
const RESERVATION_TTL_MS = 2 * 60 * 1000; // 2 minutes

function createReservationToken(payload) {
  const token = crypto.randomBytes(16).toString('hex');
  reservations.set(token, { payload, expiresAt: Date.now() + RESERVATION_TTL_MS });
  return token;
}
function getReservation(token) {
  const entry = reservations.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { reservations.delete(token); return null; }
  return entry.payload;
}
function deleteReservation(token) { reservations.delete(token); }

// Helper: minimal conflict check (practitioner)
async function hasConflict(practitionerId, start, end, excludeSessionId = null) {
  const q = {
    practitionerId,
    $or: [
      { scheduledStart: { $lt: end }, scheduledEnd: { $gt: start } }
    ],
    status: { $in: ['booked', 'confirmed', 'rescheduled'] }
  };
  if (excludeSessionId) q._id = { $ne: excludeSessionId };
  const conflict = await Session.findOne(q).lean();
  return !!conflict;
}

// POST /api/sessions/recommend
exports.recommendSlots = asyncHandler(async (req, res) => {
  const { therapyType, preferredDays = 3, durationMinutes, preferredHours } = req.body;
  // 1) Find practitioners who can do the therapy
  const practitioners = await Practitioner.find({
    'specialization.therapyType': therapyType,
    isActive: true
  }).lean();

  if (!practitioners.length) return res.status(200).json(new ApiResponse(200, [], 'No practitioners available'));

  // 2) Generate candidate slots (basic heuristic: next N days * sample hours)
  const now = new Date();
  const candidates = [];

  for (const pr of practitioners) {
    // Use practitioner.workingHours if available; fallback to sample hours
    const sampleHours = Array.isArray(preferredHours) && preferredHours.length ? preferredHours : [9, 11, 14, 16];
    for (let d = 0; d < (preferredDays || 3); d++) {
      const day = new Date(now); day.setDate(now.getDate() + d);
      for (const hour of sampleHours) {
        const start = new Date(day);
        start.setHours(hour, 0, 0, 0);
        if (start < now) continue;
        const dur = durationMinutes || (pr.durationEstimates && pr.durationEstimates.get && pr.durationEstimates.get(therapyType)) || (pr.durationEstimates && pr.durationEstimates[therapyType]) || 60;
        const end = new Date(start.getTime() + dur * 60000);
        // quick conflict filter: do not propose slots that immediately conflict
        const conflict = await Session.findOne({
          practitionerId: pr._id,
          scheduledStart: { $lt: end },
          scheduledEnd: { $gt: start },
          status: { $in: ['booked', 'confirmed', 'rescheduled'] }
        }).lean();
        if (conflict) continue;
        candidates.push({
          practitionerId: pr._id.toString(),
          practitionerName: pr.name,
          start: start.toISOString(),
          end: end.toISOString(),
          durationMinutes: dur,
          centerId: pr.centerId ? pr.centerId.toString() : null
        });
      }
    }
  }

  if (!candidates.length) return res.status(200).json(new ApiResponse(200, [], 'No candidate slots'));

  // 3) Call AI service to score/rank candidates
  try {
    const payload = { candidates: candidates.map(c => ({
      practitionerId: c.practitionerId,
      start: c.start,
      durationMinutes: c.durationMinutes,
      dayOfWeek: new Date(c.start).getDay(),
      hourOfDay: new Date(c.start).getHours()
      // include any other features you want (practitioner load, patient availability, etc.)
    })) };

    const aiResp = await axios.post(`${AI_BASE}/predict_slots`, payload, { timeout: 10000 });
    const ranked = aiResp.data && (aiResp.data.recommendations || aiResp.data.top_recommendations || aiResp.data) ;

    // Match AI scores to candidates; assume same order (or map by practitioner+start)
    const scored = candidates.map(c => {
      // try to find a matching item in ranked by practitionerId+start
      const match = Array.isArray(ranked)
        ? ranked.find(r => (r.practitionerId === c.practitionerId && new Date(r.start).toISOString() === new Date(c.start).toISOString()))
        : null;
      return {
        ...c,
        score: match ? (match.score || match.predicted_score || match.probability || 0) : 0.5
      };
    });

    // 4) Create a reservation token for each candidate set (frontend can ask to confirm using that token)
    // We'll return the top N candidates and a reservationToken for the selected candidate (frontend sends token + candidate index to confirm)
    const top = scored.sort((a, b) => b.score - a.score).slice(0, 10);

    // Store full top array as a reservation payload keyed by token
    const reservationToken = createReservationToken({ top, createdBy: req.user ? req.user.id : null });
    return res.status(200).json(new ApiResponse(200, { top, reservationToken }, 'Recommendations'));
  } catch (err) {
    console.error('AI call failed:', err?.response?.data || err.message);
    // fallback: return heuristic scored candidates
    const top = candidates.map(c => ({ ...c, score: 0.5 })).slice(0, 10);
    const reservationToken = createReservationToken({ top, createdBy: req.user ? req.user.id : null });
    return res.status(200).json(new ApiResponse(200, { top, reservationToken }, 'Recommendations (fallback)'));
  }
});

// POST /api/sessions/confirm
// body: { reservationToken, candidateIndex } OR full payload { practitionerId, start, durationMinutes, therapyType, centerId }
exports.confirmBooking = asyncHandler(async (req, res) => {
  const patientId = req.user && req.user.id;
  if (!patientId) throw new ApiError(401, 'Login required');

  let practitionerId, startISO, durationMinutes, therapyType, centerId;

  if (req.body.reservationToken) {
    const payload = getReservation(req.body.reservationToken);
    if (!payload) throw new ApiError(410, 'Reservation expired or invalid');
    const idx = Number(req.body.candidateIndex) || 0;
    const candidate = payload.top && payload.top[idx];
    if (!candidate) throw new ApiError(400, 'Invalid candidate index');
    practitionerId = candidate.practitionerId;
    startISO = candidate.start;
    durationMinutes = candidate.durationMinutes;
    centerId = candidate.centerId;
    // optional therapyType if candidate has it
    therapyType = candidate.therapyType;
    // delete reservation to avoid double-book
    deleteReservation(req.body.reservationToken);
  } else {
    ({ practitionerId, startISO, durationMinutes, therapyType, centerId } = req.body);
    if (!practitionerId || !startISO) throw new ApiError(400, 'Missing required fields');
  }

  const start = new Date(startISO);
  const end = new Date(start.getTime() + (durationMinutes || 60) * 60000);

  // Final conflict check (atomic enough for our level)
  const conflict = await hasConflict(practitionerId, start, end);
  if (conflict) throw new ApiError(409, 'Slot no longer available');

  // Create session
  const session = await Session.create({
    patientId,
    practitionerId,
    therapyType,
    centerId,
    scheduledStart: start,
    scheduledEnd: end,
    durationMinutes: durationMinutes || 60,
    status: 'booked',
    createdBy: 'Patient' // or 'AI' if reservation came from AI
  });

  await AuditLog.create({
    userId: patientId, userModel: 'Patient',
    action: 'create', resourceType: 'Session', resourceId: session._id,
    description: 'Booked session (via AI)'
  });

  // Notifications
  await Notification.insertMany([
    { userId: patientId, userModel: 'Patient', title: 'Booking confirmed', message: `Your session is at ${start.toISOString()}`, type: 'booking_confirmation' },
    { userId: practitionerId, userModel: 'Practitioner', title: 'New session assigned', message: `New session at ${start.toISOString()}`, type: 'booking_confirmation' }
  ]);

  return res.status(201).json(new ApiResponse(201, session, 'Session confirmed'));
});

// GET /api/sessions/:id
exports.getSession = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const s = await Session.findById(id).populate('patientId practitionerId');
  if (!s) throw new ApiError(404, 'Session not found');

  // permission checks: patient can view own, practitioner own, admin center-wide
  if (req.user.role === 'patient' && s.patientId._id.toString() !== req.user.id) throw new ApiError(403, 'Forbidden');
  if (req.user.role === 'practitioner' && s.practitionerId._id.toString() !== req.user.id) throw new ApiError(403, 'Forbidden');

  return res.status(200).json(new ApiResponse(200, s));
});

// GET /api/sessions  (admin - filterable)
exports.listSessions = asyncHandler(async (req, res) => {
  const { start, end, practitionerId, patientId, centerId, status, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (start || end) filter.scheduledStart = {};
  if (start) filter.scheduledStart.$gte = new Date(start);
  if (end) filter.scheduledStart.$lte = new Date(end);
  if (practitionerId) filter.practitionerId = practitionerId;
  if (patientId) filter.patientId = patientId;
  if (centerId) filter.centerId = centerId;
  if (status) filter.status = status;

  // If not admin, restrict: practitioner -> own sessions; patient -> own sessions
  if (req.user.role === 'practitioner') filter.practitionerId = req.user.id;
  if (req.user.role === 'patient') filter.patientId = req.user.id;

  const sessions = await Session.find(filter)
    .populate('patientId practitionerId')
    .sort({ scheduledStart: 1 })
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit));

  const total = await Session.countDocuments(filter);
  res.status(200).json(new ApiResponse(200, { sessions, total }));
});

// POST /api/sessions/:id/cancel (patient or admin)
exports.cancelSession = asyncHandler(async (req, res) => {
  const sessionId = req.params.id;
  const session = await Session.findById(sessionId);
  if (!session) throw new ApiError(404, 'Session not found');

  // permission: patient-owner or admin
  if (req.user.role === 'patient' && session.patientId.toString() !== req.user.id) throw new ApiError(403, 'Forbidden');

  session.status = 'cancelled';
  session.cancelReason = req.body.reason || 'Cancelled';
  session.cancelledBy = req.user.id;
  session.cancelledAt = new Date();
  await session.save();

  await AuditLog.create({
    userId: req.user.id, userModel: req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1),
    action: 'cancel', resourceType: 'Session', resourceId: session._id, description: 'Session cancelled'
  });

  // notify both sides
  await Notification.insertMany([
    { userId: session.patientId, userModel: 'Patient', title: 'Session cancelled', message: `Session cancelled`, type: 'cancellation' },
    { userId: session.practitionerId, userModel: 'Practitioner', title: 'Session cancelled', message: `Session cancelled`, type: 'cancellation' }
  ]);

  res.status(200).json(new ApiResponse(200, session, 'Cancelled'));
});

// Admin-only: POST /api/sessions/force (force-book)
exports.forceBookSession = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') throw new ApiError(403, 'Admin only');
  const { patientId, practitionerId, startISO, durationMinutes = 60, therapyType, centerId } = req.body;
  if (!patientId || !practitionerId || !startISO) throw new ApiError(400, 'Missing required fields');

  const start = new Date(startISO);
  const end = new Date(start.getTime() + (durationMinutes) * 60000);

  // Admin override: optionally skip conflict check, but we still warn if there is a conflict
  const conflict = await Session.findOne({
    practitionerId,
    scheduledStart: { $lt: end },
    scheduledEnd: { $gt: start },
    status: { $in: ['booked', 'confirmed', 'rescheduled'] }
  }).lean();

  // Create session regardless (force)
  const session = await Session.create({
    patientId, practitionerId, centerId, therapyType, scheduledStart: start, scheduledEnd: end, durationMinutes, status: 'booked', createdBy: 'Admin'
  });

  await AuditLog.create({
    userId: req.user.id, userModel: 'Admin', action: 'create', resourceType: 'Session', resourceId: session._id, description: 'Force booked session', details: { conflict: !!conflict }
  });

  await Notification.insertMany([
    { userId: patientId, userModel: 'Patient', title: 'Session booked by admin', message: `Session at ${start.toISOString()}` },
    { userId: practitionerId, userModel: 'Practitioner', title: 'Session assigned (admin)', message: `Session at ${start.toISOString()}` }
  ]);

  return res.status(201).json(new ApiResponse(201, { session, conflict: !!conflict }, 'Force booked'));
});

// Admin-only: POST /api/sessions/:id/reassign
exports.reassignPractitioner = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') throw new ApiError(403, 'Admin only');
  const sessionId = req.params.id;
  const { newPractitionerId } = req.body;
  const session = await Session.findById(sessionId);
  if (!session) throw new ApiError(404, 'Session not found');

  const prev = session.practitionerId;
  session.practitionerId = newPractitionerId;
  await session.save();

  await AuditLog.create({
    userId: req.user.id, userModel: 'Admin', action: 'update', resourceType: 'Session', resourceId: session._id, description: 'Reassigned practitioner', details: { from: prev, to: newPractitionerId }
  });

  // notify previous and new practitioner + patient
  await Notification.insertMany([
    { userId: prev, userModel: 'Practitioner', title: 'Session reassigned', message: `A session has been reassigned` },
    { userId: newPractitionerId, userModel: 'Practitioner', title: 'New session assigned', message: `You have been assigned a session` },
    { userId: session.patientId, userModel: 'Patient', title: 'Practitioner reassigned', message: `Your session practitioner was changed` }
  ]);

  res.status(200).json(new ApiResponse(200, session, 'Reassigned'));
});

export const addSessionNotes = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { notes } = req.body;

  const session = await Session.findOne({
    _id: sessionId,
    $or: [
      { practitionerId: req.user._id },
      { patientId: req.user._id },
      ...(req.user.role === 'admin' ? [{}] : [])
    ]
  });

  if (!session) throw new ApiError(404, 'Session not found or access denied');

  const updatedSession = await Session.findByIdAndUpdate(
    sessionId,
    { $set: { notes } },
    { new: true }
  );

  await AuditLog.create({
    userId: req.user._id,
    userModel: req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1),
    action: 'update',
    resourceType: 'Session',
    resourceId: sessionId,
    description: 'Session notes added/updated',
    ipAddress: req.ip
  });

  res.status(200).json(
    new ApiResponse(200, updatedSession, "Session notes updated successfully")
  );
});

// // controllers/admin.controller.js
// const { asyncHandler } = require('../utils/asyncHandler');
// const { ApiResponse } = require('../utils/ApiResponse');
// const { ApiError } = require('../utils/ApiError');
// const Patient = require('../models/Patient.models');
// const Practitioner = require('../models/Practitioner.models');
// const Session = require('../models/Session.models');
// const RescheduleRequest = require('../models/RescheduleRequest.models');
// const AuditLog = require('../models/AuditLog.models');
// const Notification = require('../models/Notification.models');
// const Feedback = require('../models/Feedback.models');
// const axios = require('axios');

// // --- Center management (assumes Center model exists) ---
// const Center = require('../models/Center.models'); // optional - create if missing

// // GET /api/admin/centers/:id/overview
// exports.centerOverview = asyncHandler(async (req, res) => {
//   const centerId = req.params.id;
//   // ensure admin only manages their center: check req.user.role/centerId in real app
//   const totalSessions = await Session.countDocuments({ centerId });
//   const upcoming = await Session.countDocuments({ centerId, scheduledStart: { $gte: new Date() }, status: 'booked' });
//   const activePractitioners = await Practitioner.countDocuments({ centerId, isActive: true });
//   const avgRating = await Feedback.aggregate([
//     { $match: { } },
//     { $group: { _id: null, avg: { $avg: "$ratings.overall" } } }
//   ]);
//   res.status(200).json(new ApiResponse(200, {
//     totalSessions, upcoming, activePractitioners, avgRating: avgRating[0]?.avg || 0
//   }));
// });

// // PUT /api/admin/centers/:id/settings
// exports.updateCenterSettings = asyncHandler(async (req, res) => {
//   const centerId = req.params.id;
//   const updates = req.body;
//   const center = await Center.findByIdAndUpdate(centerId, updates, { new: true });
//   if (!center) throw new ApiError(404, 'Center not found');
//   await AuditLog.create({ userId: req.user.id, userModel: 'Admin', action: 'update', resourceType: 'Center', resourceId: center._id, description: 'Updated center settings' });
//   res.status(200).json(new ApiResponse(200, center, 'Updated'));
// });

// // Practitioner management: POST /api/admin/practitioners
// exports.createPractitioner = asyncHandler(async (req, res) => {
//   const body = req.body;
//   const p = await Practitioner.create(body);
//   await AuditLog.create({ userId: req.user.id, userModel: 'Admin', action: 'create', resourceType: 'Practitioner', resourceId: p._id, description: 'Admin created practitioner' });
//   res.status(201).json(new ApiResponse(201, p, 'Practitioner added'));
// });

// // DELETE /api/admin/practitioners/:id
// exports.deletePractitioner = asyncHandler(async (req, res) => {
//   const id = req.params.id;
//   const removed = await Practitioner.findByIdAndDelete(id);
//   if (!removed) throw new ApiError(404, 'Practitioner not found');
//   await AuditLog.create({ userId: req.user.id, userModel: 'Admin', action: 'delete', resourceType: 'Practitioner', resourceId: removed._id, description: 'Removed practitioner' });
//   res.status(200).json(new ApiResponse(200, removed, 'Practitioner removed'));
// });

// // POST /api/admin/patients
// exports.createPatient = asyncHandler(async (req, res) => {
//   const body = req.body;
//   const p = await Patient.create(body);
//   await AuditLog.create({ userId: req.user.id, userModel: 'Admin', action: 'create', resourceType: 'Patient', resourceId: p._id, description: 'Admin created patient' });
//   res.status(201).json(new ApiResponse(201, p, 'Patient added'));
// });

// // --- Scheduling management ---

// // GET /api/admin/sessions
// exports.listSessions = asyncHandler(async (req, res) => {
//   const { start, end, practitionerId, status, centerId } = req.query;
//   const filter = {};
//   if (start || end) filter.scheduledStart = {};
//   if (start) filter.scheduledStart.$gte = new Date(start);
//   if (end) filter.scheduledStart.$lte = new Date(end);
//   if (practitionerId) filter.practitionerId = practitionerId;
//   if (status) filter.status = status;
//   if (centerId) filter.centerId = centerId;
//   const sessions = await Session.find(filter).populate('patientId practitionerId').sort({ scheduledStart: 1 });
//   res.status(200).json(new ApiResponse(200, sessions));
// });

// // POST /api/admin/sessions/:id/reschedule
// exports.rescheduleSession = asyncHandler(async (req, res) => {
//   const sessionId = req.params.id;
//   const { newStart } = req.body;
//   const session = await Session.findById(sessionId);
//   if (!session) throw new ApiError(404, 'Session not found');
//   const previousStart = session.scheduledStart;
//   session.scheduledStart = new Date(newStart);
//   session.scheduledEnd = new Date(session.scheduledStart.getTime() + session.durationMinutes*60000);
//   session.status = 'rescheduled';
//   session.rescheduleHistory = session.rescheduleHistory || [];
//   session.rescheduleHistory.push({
//     previousStart, previousEnd: session.scheduledEnd, newStart: session.scheduledStart, newEnd: session.scheduledEnd,
//     reason: req.body.reason || 'Admin override', approvedBy: req.user.id, approvedAt: new Date()
//   });
//   await session.save();
//   await AuditLog.create({ userId: req.user.id, userModel: 'Admin', action: 'reschedule', resourceType: 'Session', resourceId: session._id, description: 'Rescheduled by admin' });
//   // notify patient & practitioner
//   await Notification.create({ userId: session.patientId, userModel: 'Patient', title: 'Session rescheduled', message: `Your session was rescheduled to ${session.scheduledStart}`, type: 'cancellation', channel: 'in_app' });
//   await Notification.create({ userId: session.practitionerId, userModel: 'Practitioner', title: 'Session rescheduled', message: `Session rescheduled to ${session.scheduledStart}`, type: 'system_alert', channel: 'in_app' });
//   res.status(200).json(new ApiResponse(200, session, 'Session rescheduled'));
// });

// // POST /api/admin/sessions/:id/cancel
// exports.cancelSession = asyncHandler(async (req, res) => {
//   const sessionId = req.params.id;
//   const session = await Session.findById(sessionId);
//   if (!session) throw new ApiError(404, 'Session not found');
//   session.status = 'cancelled';
//   session.cancelReason = req.body.reason || 'Cancelled by admin';
//   session.cancelledBy = req.user.id;
//   session.cancelledByModel = 'Admin';
//   session.cancelledAt = new Date();
//   await session.save();
//   await AuditLog.create({ userId: req.user.id, userModel: 'Admin', action: 'cancel', resourceType: 'Session', resourceId: session._id, description: 'Admin cancelled session' });
//   await Notification.insertMany([
//     { userId: session.patientId, userModel: 'Patient', title: 'Session cancelled', message: 'Your session was cancelled by admin', type: 'cancellation' },
//     { userId: session.practitionerId, userModel: 'Practitioner', title: 'Session cancelled', message: 'A session was cancelled', type: 'cancellation' }
//   ]);
//   res.status(200).json(new ApiResponse(200, session, 'Session cancelled'));
// });

// // POST /api/admin/sessions/:id/reassign
// exports.reassignSession = asyncHandler(async (req, res) => {
//   const sessionId = req.params.id;
//   const { newPractitionerId } = req.body;
//   const session = await Session.findById(sessionId);
//   if (!session) throw new ApiError(404, 'Session not found');
//   session.practitionerId = newPractitionerId;
//   await session.save();
//   await AuditLog.create({ userId: req.user.id, userModel: 'Admin', action: 'update', resourceType: 'Session', resourceId: session._id, description: 'Reassigned practitioner' });
//   res.status(200).json(new ApiResponse(200, session, 'Reassigned'));
// });

// // POST /api/admin/sessions/force
// exports.forceBook = asyncHandler(async (req, res) => {
//   const { patientId, practitionerId, startISO, durationMinutes, therapyType, centerId } = req.body;
//   const start = new Date(startISO);
//   const end = new Date(start.getTime() + (durationMinutes || 60) * 60000);
//   const session = await Session.create({ patientId, practitionerId, centerId, therapyType, scheduledStart: start, scheduledEnd: end, durationMinutes: durationMinutes || 60, status: 'booked', createdBy: 'Admin' });
//   await AuditLog.create({ userId: req.user.id, userModel: 'Admin', action: 'create', resourceType: 'Session', resourceId: session._id, description: 'Force booked session' });
//   await Notification.insertMany([
//     { userId: patientId, userModel: 'Patient', title: 'Session booked by admin', message: `A session has been scheduled at ${start}` },
//     { userId: practitionerId, userModel: 'Practitioner', title: 'Session assigned', message: `You have a new session at ${start}` }
//   ]);
//   res.status(201).json(new ApiResponse(201, session, 'Force booked'));
// });

// // POST /api/admin/sessions/bulk-reschedule
// exports.bulkReschedule = asyncHandler(async (req, res) => {
//   const { from, to, shiftMinutes } = req.body; // shiftMinutes: +/- minutes to move
//   const fromDate = new Date(from), toDate = new Date(to);
//   const sessions = await Session.find({ scheduledStart: { $gte: fromDate, $lte: toDate } });
//   const updates = [];
//   for (const s of sessions) {
//     const prev = s.scheduledStart;
//     s.scheduledStart = new Date(s.scheduledStart.getTime() + (shiftMinutes || 0)*60000);
//     s.scheduledEnd = new Date(s.scheduledEnd.getTime() + (shiftMinutes || 0)*60000);
//     s.status = 'rescheduled';
//     s.rescheduleHistory = s.rescheduleHistory || [];
//     s.rescheduleHistory.push({ previousStart: prev, previousEnd: s.scheduledEnd, newStart: s.scheduledStart, newEnd: s.scheduledEnd, reason: 'Bulk reschedule', approvedBy: req.user.id, approvedAt: new Date() });
//     await s.save();
//     updates.push(s);
//   }
//   await AuditLog.create({ userId: req.user.id, userModel: 'Admin', action: 'update', resourceType: 'Session', description: `Bulk rescheduled ${updates.length} sessions` });
//   res.status(200).json(new ApiResponse(200, { count: updates.length }, 'Bulk reschedule completed'));
// });

// // Analytics endpoints etc.
// exports.practitionerAnalytics = asyncHandler(async (req, res) => {
//   const practitionerId = req.params.id;
//   const total = await Session.countDocuments({ practitionerId });
//   const completed = await Session.countDocuments({ practitionerId, status: 'completed' });
//   const avgRating = await Feedback.aggregate([
//     { $match: { practitionerId: require('mongoose').Types.ObjectId(practitionerId) } },
//     { $group: { _id: null, avg: { $avg: "$ratings.overall" } } }
//   ]);
//   res.status(200).json(new ApiResponse(200, { total, completed, avgRating: avgRating[0]?.avg || 0 }));
// });

// // GET /api/admin/audit-logs
// exports.getAuditLogs = asyncHandler(async (req, res) => {
//   const { limit = 200 } = req.query;
//   const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(parseInt(limit));
//   res.status(200).json(new ApiResponse(200, logs));
// });

// // POST /api/admin/notifications/broadcast
// exports.broadcastNotification = asyncHandler(async (req, res) => {
//   const { title, message, role = 'Patient', channel = 'in_app', priority='medium' } = req.body;
//   const Model = role === 'Patient' ? Patient : Practitioner;
//   const users = await Model.find({}, '_id');
//   const docs = users.map(u => ({ userId: u._id, userModel: role, title, message, type: 'system_alert', channel, priority }));
//   await Notification.insertMany(docs);
//   await AuditLog.create({ userId: req.user.id, userModel: 'Admin', action: 'create', resourceType: 'Notification', description: `Broadcast to ${role}` });
//   res.status(200).json(new ApiResponse(200, { count: docs.length }, 'Broadcast queued'));
// });

// // POST /api/admin/ai/retrain
// exports.triggerAiRetrain = asyncHandler(async (req, res) => {
//   try {
//     const url = process.env.AI_SERVICE_URL + '/retrain';
//     const r = await axios.post(url);
//     await AuditLog.create({ userId: req.user.id, userModel: 'Admin', action: 'update', resourceType: 'AI', description: 'Triggered AI retrain' });
//     res.status(200).json(new ApiResponse(200, r.data, 'AI retrain triggered'));
//   } catch (err) {
//     throw new ApiError(500, 'AI retrain failed');
//   }
// });

// // GET /api/admin/ai/metrics
// exports.getAiMetrics = asyncHandler(async (req, res) => {
//   try {
//     const r = await axios.get(`${process.env.AI_SERVICE_URL}/metrics`);
//     res.status(200).json(new ApiResponse(200, r.data));
//   } catch (err) {
//     throw new ApiError(502, 'AI service unreachable');
//   }
// });


// controllers/admin.controller.js
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiResponse } = require('../utils/ApiResponse');
const { ApiError } = require('../utils/ApiError');
const mongoose = require('mongoose');
const axios = require('axios');

const Patient = require('../models/Patient.models');
const Practitioner = require('../models/Practitioner.models');
const Session = require('../models/Session.models');
const AuditLog = require('../models/AuditLog.models');
const Notification = require('../models/Notification.models');
const Feedback = require('../models/Feedback.models');
const RescheduleRequest = require('../models/RescheduleRequest.models');
const Center = require('../models/Center.models'); // optional - create if you have one

const AI_BASE = process.env.AI_SERVICE_URL;

// Helper: verify admin belongs to center (if multi-center)
async function ensureAdminForCenter(adminUser, centerId) {
  if (!adminUser) throw new ApiError(401, 'Unauthorized');
  // super_admin bypass
  if (adminUser.role === 'super_admin') return;
  if (!adminUser.centerId || adminUser.centerId.toString() !== centerId.toString()) {
    throw new ApiError(403, 'Admin not permitted for this center');
  }
}

// GET /api/admin/dashboard
exports.getDashboard = asyncHandler(async (req, res) => {
  const centerId = req.user.centerId;
  // basic KPIs
  const [totalPatients, totalPractitioners, todayBookings, upcomingSessions, avgFeedback] = await Promise.all([
    Patient.countDocuments({ centerId }),
    Practitioner.countDocuments({ centerId, isActive: true }),
    Session.countDocuments({ centerId, createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } }),
    Session.countDocuments({ centerId, scheduledStart: { $gte: new Date() }, status: 'booked' }),
    Feedback.aggregate([
      { $match: { /* optionally filter by center via session join */ } },
      { $group: { _id: null, avg: { $avg: '$ratings.overall' } } }
    ]).then(r => (r[0]?.avg || 0))
  ]);

  res.status(200).json(new ApiResponse(200, {
    totalPatients, totalPractitioners, todayBookings, upcomingSessions, avgFeedback
  }));
});

// GET /api/admin/centers/:id/overview
exports.getCenterOverview = asyncHandler(async (req, res) => {
  const centerId = req.params.id;
  await ensureAdminForCenter(req.user, centerId);

  const [sessionsCount, booked, completed, cancelled, activePractitioners] = await Promise.all([
    Session.countDocuments({ centerId }),
    Session.countDocuments({ centerId, status: 'booked' }),
    Session.countDocuments({ centerId, status: 'completed' }),
    Session.countDocuments({ centerId, status: 'cancelled' }),
    Practitioner.countDocuments({ centerId, isActive: true })
  ]);

  res.status(200).json(new ApiResponse(200, {
    sessionsCount, booked, completed, cancelled, activePractitioners
  }));
});

// PUT /api/admin/centers/:id/settings
exports.updateCenterSettings = asyncHandler(async (req, res) => {
  const centerId = req.params.id;
  await ensureAdminForCenter(req.user, centerId);
  const updates = req.body;
  const center = await Center.findByIdAndUpdate(centerId, updates, { new: true });
  if (!center) throw new ApiError(404, 'Center not found');
  await AuditLog.create({ userId: req.user.id, userModel: 'Admin', action: 'update', resourceType: 'Center', resourceId: center._id, description: 'Updated center settings' });
  res.status(200).json(new ApiResponse(200, center, 'Center updated'));
});

// GET /api/admin/practitioners
exports.getAllPractitioners = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, active } = req.query;
  const filter = {};
  if (req.user.centerId) filter.centerId = req.user.centerId;
  if (active !== undefined) filter.isActive = active === 'true';
  const practitioners = await Practitioner.find(filter).limit(Number(limit)).skip((Number(page)-1)*Number(limit));
  const total = await Practitioner.countDocuments(filter);
  res.status(200).json(new ApiResponse(200, { practitioners, total }));
});

// PUT /api/admin/practitioners/:id
exports.updatePractitioner = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const updates = req.body;
  const pr = await Practitioner.findById(id);
  if (!pr) throw new ApiError(404, 'Practitioner not found');
  if (req.user.centerId && pr.centerId && pr.centerId.toString() !== req.user.centerId.toString()) throw new ApiError(403, 'Not your practitioner');
  Object.assign(pr, updates);
  await pr.save();
  await AuditLog.create({ userId: req.user.id, userModel: 'Admin', action: 'update', resourceType: 'Practitioner', resourceId: pr._id, description: 'Updated practitioner' });
  res.status(200).json(new ApiResponse(200, pr, 'Practitioner updated'));
});

// POST /api/admin/practitioners/:id/deactivate
exports.deactivatePractitioner = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const pr = await Practitioner.findById(id);
  if (!pr) throw new ApiError(404, 'Practitioner not found');
  pr.isActive = false;
  await pr.save();
  await AuditLog.create({ userId: req.user.id, userModel: 'Admin', action: 'update', resourceType: 'Practitioner', resourceId: pr._id, description: 'Deactivated practitioner' });
  res.status(200).json(new ApiResponse(200, pr, 'Practitioner deactivated'));
});

// GET /api/admin/patients
exports.getAllPatients = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const filter = {};
  if (req.user.centerId) filter.centerId = req.user.centerId;
  const patients = await Patient.find(filter).limit(Number(limit)).skip((Number(page)-1)*Number(limit));
  const total = await Patient.countDocuments(filter);
  res.status(200).json(new ApiResponse(200, { patients, total }));
});

// PUT /api/admin/patients/:id
exports.updatePatient = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const updates = req.body;
  const p = await Patient.findById(id);
  if (!p) throw new ApiError(404, 'Patient not found');
  if (req.user.centerId && p.centerId && p.centerId.toString() !== req.user.centerId.toString()) throw new ApiError(403, 'Not your patient');
  Object.assign(p, updates);
  await p.save();
  await AuditLog.create({ userId: req.user.id, userModel: 'Admin', action: 'update', resourceType: 'Patient', resourceId: p._id, description: 'Updated patient' });
  res.status(200).json(new ApiResponse(200, p, 'Patient updated'));
});

// POST /api/admin/patients/:id/deactivate
exports.deactivatePatient = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const p = await Patient.findById(id);
  if (!p) throw new ApiError(404, 'Patient not found');
  p.isActive = false;
  await p.save();
  await AuditLog.create({ userId: req.user.id, userModel: 'Admin', action: 'update', resourceType: 'Patient', resourceId: p._id, description: 'Deactivated patient' });
  res.status(200).json(new ApiResponse(200, p, 'Patient deactivated'));
});

// GET /api/admin/sessions
exports.getAllSessions = asyncHandler(async (req, res) => {
  const { start, end, practitionerId, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (req.user.centerId) filter.centerId = req.user.centerId;
  if (start || end) filter.scheduledStart = {};
  if (start) filter.scheduledStart.$gte = new Date(start);
  if (end) filter.scheduledStart.$lte = new Date(end);
  if (practitionerId) filter.practitionerId = practitionerId;
  const sessions = await Session.find(filter).populate('patientId practitionerId').limit(Number(limit)).skip((Number(page)-1)*Number(limit)).sort({ scheduledStart: 1 });
  const total = await Session.countDocuments(filter);
  res.status(200).json(new ApiResponse(200, { sessions, total }));
});

// POST /api/admin/sessions/force
exports.forceBookSession = asyncHandler(async (req, res) => {
  // reuse session.controller.forceBookSession logic or implement inline
  const { patientId, practitionerId, startISO, durationMinutes = 60, therapyType, centerId } = req.body;
  const start = new Date(startISO);
  const end = new Date(start.getTime() + durationMinutes * 60000);
  const session = await Session.create({ patientId, practitionerId, scheduledStart: start, scheduledEnd: end, durationMinutes, therapyType, centerId: centerId || req.user.centerId, status: 'booked', createdBy: 'Admin' });
  await AuditLog.create({ userId: req.user.id, userModel: 'Admin', action: 'create', resourceType: 'Session', resourceId: session._id, description: 'Force booked session' });
  await Notification.insertMany([
    { userId: patientId, userModel: 'Patient', title: 'Admin booked session', message: `Session at ${start.toISOString()}` },
    { userId: practitionerId, userModel: 'Practitioner', title: 'Assigned by admin', message: `Session at ${start.toISOString()}` }
  ]);
  res.status(201).json(new ApiResponse(201, session, 'Force booked'));
});

// POST /api/admin/sessions/:id/reassign
exports.reassignPractitioner = asyncHandler(async (req, res) => {
  const sessionId = req.params.id;
  const { newPractitionerId } = req.body;
  const session = await Session.findById(sessionId);
  if (!session) throw new ApiError(404, 'Session not found');
  session.practitionerId = newPractitionerId;
  await session.save();
  await AuditLog.create({ userId: req.user.id, userModel: 'Admin', action: 'update', resourceType: 'Session', resourceId: session._id, description: 'Reassigned practitioner' });
  await Notification.insertMany([
    { userId: session.patientId, userModel: 'Patient', title: 'Practitioner changed', message: 'Your practitioner was changed' },
    { userId: newPractitionerId, userModel: 'Practitioner', title: 'New session assigned', message: 'You have a new session' }
  ]);
  res.status(200).json(new ApiResponse(200, session, 'Reassigned'));
});

// GET /api/admin/practitioners/:id/analysis
exports.getPractitionerAnalysis = asyncHandler(async (req, res) => {
  const practitionerId = req.params.id;
  // number of sessions, avg rating, utilization (simple)
  const total = await Session.countDocuments({ practitionerId });
  const completed = await Session.countDocuments({ practitionerId, status: 'completed' });
  const ratings = await Feedback.aggregate([
    { $match: { practitionerId: mongoose.Types.ObjectId(practitionerId) } },
    { $group: { _id: null, avg: { $avg: '$ratings.overall' }, count: { $sum: 1 } } }
  ]);
  res.status(200).json(new ApiResponse(200, {
    total, completed, avgRating: ratings[0]?.avg || 0, ratingCount: ratings[0]?.count || 0
  }));
});

// POST /api/admin/notifications/broadcast
exports.sendBroadcastNotification = asyncHandler(async (req, res) => {
  const { title, message, target = ['patients'], channel = 'in_app' } = req.body;
  const docs = [];
  if (target.includes('patients')) {
    const patients = await Patient.find({ centerId: req.user.centerId, isActive: true }).select('_id');
    patients.forEach(p => docs.push({ userId: p._id, userModel: 'Patient', title, message, channel, type: 'system_alert' }));
  }
  if (target.includes('practitioners')) {
    const practitioners = await Practitioner.find({ centerId: req.user.centerId, isActive: true }).select('_id');
    practitioners.forEach(p => docs.push({ userId: p._id, userModel: 'Practitioner', title, message, channel, type: 'system_alert' }));
  }
  if (!docs.length) throw new ApiError(400, 'No recipients');
  await Notification.insertMany(docs);
  await AuditLog.create({ userId: req.user.id, userModel: 'Admin', action: 'create', resourceType: 'Notification', description: 'Broadcast notification' });
  res.status(200).json(new ApiResponse(200, { count: docs.length }, 'Broadcast queued'));
});

// GET /api/admin/audit-logs
exports.getAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  // Admins can view logs for their center. If super_admin maybe view all
  const filter = {};
  if (req.user.role !== 'super_admin' && req.user.centerId) {
    // find users belonging to this center (approx): admins/practitioners/patients with centerId
    // For performance you may store centerId in AuditLog or query differently
    filter.$or = [
      { 'details.centerId': req.user.centerId },
      { resourceType: 'Session' } // minimal fallback
    ];
  }
  const logs = await AuditLog.find(filter).sort({ timestamp: -1 }).limit(Number(limit)).skip((Number(page)-1)*Number(limit));
  const total = await AuditLog.countDocuments(filter);
  res.status(200).json(new ApiResponse(200, { logs, total }));
});

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
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import Admin from '../models/Admin.models.js';
import Patient from '../models/Patient.models.js';
import Practitioner from '../models/Practitioner.models.js';
import Session from '../models/Session.models.js';
import Feedback from '../models/Feedback.models.js';
import AuditLog from '../models/AuditLog.models.js';
import Notification from '../models/Notification.models.js';

export const getDashboard = asyncHandler(async (req, res) => {
  const { centerId } = req.user;

  const [
    totalPatients,
    totalPractitioners,
    totalSessions,
    upcomingSessions,
    recentFeedbacks,
    monthlyStats
  ] = await Promise.all([
    Patient.countDocuments({ centerIdisActive: true }),
    Practitioner.countDocuments({ centerId, isActive: true }),
    Session.countDocuments({ centerId }),
    Session.countDocuments({ 
      centerId, 
      scheduledStart: { $gte: new Date() },
      status: { $in: ['booked', 'confirmed'] }
    }),
    Feedback.find()
      .populate('patientId', 'name')
      .populate('practitionerId', 'name')
      .sort({ createdAt: -1 })
      .limit(5),
    Session.aggregate([
      { $match: { centerId, scheduledStart: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$scheduledStart" } },
          sessions: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ])
  ]);

  const dashboardStats = {
    overview: {
      totalPatients,
      totalPractitioners,
      totalSessions,
      upcomingSessions,
      completionRate: totalSessions > 0 ? ((totalSessions - upcomingSessions) / totalSessions) * 100 : 0
    },
    recentFeedbacks,
    monthlyStats
  };

  res.status(200).json(
    new ApiResponse(200, dashboardStats, "Dashboard stats fetched successfully")
  );
});

export const createPractitioner = asyncHandler(async (req, res) => {
  const { centerId } = req.user;
  const practitionerData = { ...req.body, centerId };

  const existingPractitioner = await Practitioner.findOne({ 
    $or: [{ email: practitionerData.email }, { phone: practitionerData.phone }] 
  });
  if (existingPractitioner) throw new ApiError(400, 'Practitioner with this email or phone already exists');

  const practitioner = await Practitioner.create(practitionerData);

  await AuditLog.create({
    userId: req.user._id,
    userModel: 'Admin',
    action: 'create',
    centerId: centerId,
    resourceType: 'Practitioner',
    resourceId: practitioner._id,
    description: 'Practitioner created by admin',
    ipAddress: req.ip
  });

  const createdPractitioner = await Practitioner.findById(practitioner._id)
    .select('-passwordHash -refreshToken');

  res.status(201).json(
    new ApiResponse(201, createdPractitioner, "Practitioner created successfully")
  );
});

export const getAllPractitioners = asyncHandler(async (req, res) => {
  const { centerId } = req.user;
  const { page = 1, limit = 10, status } = req.query;

  const filter = { centerId };
  if (status === 'active') filter.isActive = true;
  if (status === 'inactive') filter.isActive = false;

  const practitioners = await Practitioner.find(filter)
    .select('-passwordHash -refreshToken')
    .populate('centerId', 'name')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Practitioner.countDocuments(filter);

  res.status(200).json(
    new ApiResponse(200, {
      practitioners,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    }, "Practitioners fetched successfully")
  );
});

export const getAllPatients = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search } = req.query;

  const filter = { centerId: req.user.centerId, isActive: true };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }

  const patients = await Patient.find(filter)
    .select('-passwordHash -refreshToken')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Patient.countDocuments(filter);

  res.status(200).json(
    new ApiResponse(200, {
      patients,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    }, "Patients fetched successfully")
  );
});


export const getAllSessions = asyncHandler(async (req, res) => {
  const { centerId } = req.user;
  const { page = 1, limit = 10, date, status, practitionerId } = req.query;

  const filter = { centerId };
  if (date) {
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    filter.scheduledStart = { $gte: startDate, $lte: endDate };
  }
  if (status) filter.status = status;
  if (practitionerId) filter.practitionerId = practitionerId;

  const sessions = await Session.find(filter)
    .populate('patientId', 'name phone')
    .populate('practitionerId', 'name specialization')
    .sort({ scheduledStart: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Session.countDocuments(filter);

  res.status(200).json(
    new ApiResponse(200, {
      sessions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    }, "Sessions fetched successfully")
  );
});

export const forceBookSession = asyncHandler(async (req, res) => {
  const { centerId } = req.user;
  const sessionData = { ...req.body, centerId, conflictChecked: true };

  const session = await Session.create(sessionData);

  await AuditLog.create({
    userId: req.user._id,
    userModel: 'Admin',
    action: 'create',
    resourceType: 'Session',
    centerId: centerId,
    resourceId: session._id,
    description: 'Session force booked by admin',
    details: sessionData,
    ipAddress: req.ip
  });

  const createdSession = await Session.findById(session._id)
    .populate('patientId', 'name phone')
    .populate('practitionerId', 'name specialization');

  res.status(201).json(
    new ApiResponse(201, createdSession, "Session force booked successfully")
  );
});

export const reassignPractitioner = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { practitionerId } = req.body;

  const session = await Session.findOneAndUpdate(
    { _id: sessionId, centerId: req.user.centerId },
    { practitionerId },
    { new: true, runValidators: true }
  )
    .populate('patientId', 'name phone')
    .populate('practitionerId', 'name specialization');

  if (!session) throw new ApiError(404, 'Session not found');

  await AuditLog.create({
    userId: req.user._id,
    userModel: 'Admin',
    action: 'update',
    resourceType: 'Session',
    resourceId: sessionId,
    centerId: req.user.centerId,
    description: 'Practitioner reassigned by admin',
    details: { newPractitionerId: practitionerId },
    ipAddress: req.ip
  });

  res.status(200).json(
    new ApiResponse(200, session, "Practitioner reassigned successfully")
  );
});

export const getFeedbackReports = asyncHandler(async (req, res) => {
  const { centerId } = req.user;
  const { days = 30 } = req.query;

  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const feedbacks = await Feedback.aggregate([
    {
      $lookup: {
        from: 'sessions',
        localField: 'sessionId',
        foreignField: '_id',
        as: 'session'
      }
    },
    { $unwind: '$session' },
    { $match: { 'session.centerId': centerId, createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: '$practitionerId',
        averageRating: { $avg: '$ratings.overall' },
        totalFeedbacks: { $sum: 1 },
        ratingsBreakdown: {
          $push: {
            overall: '$ratings.overall',
            professionalism: '$ratings.professionalism',
            effectiveness: '$ratings.effectiveness'
          }
        }
      }
    },
    {
      $lookup: {
        from: 'practitioners',
        localField: '_id',
        foreignField: '_id',
        as: 'practitioner'
      }
    },
    { $unwind: '$practitioner' },
    {
      $project: {
        practitionerName: '$practitioner.name',
        averageRating: { $round: ['$averageRating', 2] },
        totalFeedbacks: 1,
        ratingsBreakdown: 1
      }
    }
  ]);

  res.status(200).json(
    new ApiResponse(200, feedbacks, "Feedback reports fetched successfully")
  );
});

export const getPractitionerAnalytics = asyncHandler(async (req, res) => {
  const { centerId } = req.user;
  const { practitionerId, days = 30 } = req.query;

  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const filter = { 
    centerId,
    scheduledStart: { $gte: startDate }
  };
  if (practitionerId) filter.practitionerId = practitionerId;

  const analytics = await Session.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$practitionerId',
        totalSessions: { $sum: 1 },
        completedSessions: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
        cancelledSessions: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
        averageSessionDuration: { $avg: '$durationMinutes' },
        uniquePatients: { $addToSet: '$patientId' }
      }
    },
    {
      $lookup: {
        from: 'practitioners',
        localField: '_id',
        foreignField: '_id',
        as: 'practitioner'
      }
    },
    { $unwind: '$practitioner' },
    {
      $project: {
        practitionerName: '$practitioner.name',
        totalSessions: 1,
        completedSessions: 1,
        cancelledSessions: 1,
        completionRate: { $round: [{ $multiply: [{ $divide: ['$completedSessions', '$totalSessions'] }, 100] }, 2] },
        averageSessionDuration: { $round: ['$averageSessionDuration', 2] },
        uniquePatientsCount: { $size: '$uniquePatients' }
      }
    }
  ]);

  res.status(200).json(
    new ApiResponse(200, analytics, "Practitioner analytics fetched successfully")
  );
});

export const sendBroadcastNotification = asyncHandler(async (req, res) => {
  const { title, message, targetUsers, type, channel, priority } = req.body;

  let users = [];
  const userModels = [];

  if (targetUsers.includes('patients')) {
    const patients = await Patient.find({ isActive: true }).select('_id');
    users = [...users, ...patients];
    userModels.push('Patient');
  }

  if (targetUsers.includes('practitioners')) {
    const practitioners = await Practitioner.find({ 
      centerId: req.user.centerId, 
      isActive: true 
    }).select('_id');
    users = [...users, ...practitioners];
    userModels.push('Practitioner');
  }

  if (targetUsers.includes('admins')) {
    const admins = await Admin.find({ 
      centerId: req.user.centerId, 
      isActive: true 
    }).select('_id');
    users = [...users, ...admins];
    userModels.push('Admin');
  }

  if (users.length === 0) {
    throw new ApiError(400, 'No users found for the specified target groups');
  }

  const notificationPromises = users.map(user => 
    Notification.create({
      userId: user._id,
      userModel: user.constructor.modelName,
      title,
      message,
      type: type || 'system_alert',
      channel: channel || 'in_app',
      priority: priority || 'medium',
      sentAt: new Date()
    })
  );

  const notifications = await Promise.all(notificationPromises);

  await AuditLog.create({
    userId: req.user._id,
    userModel: 'Admin',
    action: 'create',
    resourceType: 'Notification',
    description: 'Broadcast notification sent',
    centerId: req.user.centerId,
    details: { 
      targetUsers, 
      userModels, 
      recipientCount: users.length,
      type,
      channel 
    },
    ipAddress: req.ip
  });

  res.status(201).json(
    new ApiResponse(201, { 
      sentCount: notifications.length,
      targetGroups: targetUsers,
      userModels 
    }, "Broadcast notification sent successfully")
  );
});

export const getAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, action, userModel, startDate, endDate } = req.query;

  const filter = {centerId: req.user.centerId };
  if (action) filter.action = action;
  if (userModel) filter.userModel = userModel;
  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = new Date(startDate);
    if (endDate) filter.timestamp.$lte = new Date(endDate);
  }

  const auditLogs = await AuditLog.find(filter)
    .populate('userId', 'name email')
    .sort({ timestamp: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await AuditLog.countDocuments(filter);

  res.status(200).json(
    new ApiResponse(200, {
      auditLogs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    }, "Audit logs fetched successfully")
  );
});
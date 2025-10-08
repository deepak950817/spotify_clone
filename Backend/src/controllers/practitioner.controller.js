// // controllers/practitioner.controller.js
// const { asyncHandler } = require('../utils/asyncHandler');
// const { ApiResponse } = require('../utils/ApiResponse');
// const { ApiError } = require('../utils/ApiError');
// const Session = require('../models/Session.models');
// const Feedback = require('../models/Feedback.models');
// const Practitioner = require('../models/Practitioner.models');
// const Patient = require('../models/Patient.models');
// const AuditLog = require('../models/AuditLog.models');
// const Notification = require('../models/Notification.models');

// // GET /api/practitioners/:id
// exports.getProfile = asyncHandler(async (req, res) => {
//   const id = req.params.id;
//   if (req.user.role === 'practitioner' && req.user.id !== id) throw new ApiError(403, 'Forbidden');
//   const practitioner = await Practitioner.findById(id).lean();
//   if (!practitioner) throw new ApiError(404, 'Practitioner not found');
//   res.status(200).json(new ApiResponse(200, practitioner));
// });

// // PUT /api/practitioners/:id
// exports.updateProfile = asyncHandler(async (req, res) => {
//   const id = req.params.id;
//   if (req.user.role !== 'admin' && req.user.id !== id) throw new ApiError(403, 'Forbidden');
//   const practitioner = await Practitioner.findByIdAndUpdate(id, req.body, { new: true });
//   await AuditLog.create({ userId: req.user.id, userModel: req.user.role.charAt(0).toUpperCase()+req.user.role.slice(1), action: 'update', resourceType: 'Practitioner', resourceId: id, description: 'Updated practitioner' });
//   res.status(200).json(new ApiResponse(200, practitioner));
// });

// // GET /api/practitioners/:id/sessions
// exports.getMySessions = asyncHandler(async (req, res) => {
//   const id = req.params.id;
//   if (req.user.role === 'practitioner' && req.user.id !== id) throw new ApiError(403, 'Forbidden');
//   const sessions = await Session.find({ practitionerId: id }).populate('patientId');
//   res.status(200).json(new ApiResponse(200, sessions));
// });

// // POST /api/sessions/:id/complete
// exports.completeSession = asyncHandler(async (req, res) => {
//   const sessionId = req.params.id;
//   const session = await Session.findById(sessionId);
//   if (!session) throw new ApiError(404, 'Session not found');
//   if (session.practitionerId.toString() !== req.user.id && req.user.role !== 'admin') throw new ApiError(403, 'Forbidden');
//   session.status = 'completed';
//   session.outcome = session.outcome || {};
//   session.outcome.notes = req.body.notes;
//   session.outcome.completedOnTime = req.body.completedOnTime ?? true;
//   session.outcome.feedbackScore = session.outcome.feedbackScore || null;
//   await session.save();
//   await AuditLog.create({ userId: req.user.id, userModel: 'Practitioner', action: 'update', resourceType: 'Session', resourceId: session._id, description: 'Completed session' });
//   await Notification.create({ userId: session.patientId, userModel: 'Patient', title: 'Session completed', message: 'Your session was marked completed' });
//   res.status(200).json(new ApiResponse(200, session, 'Session completed'));
// });

// // POST /api/sessions/:id/outcome
// exports.addOutcome = asyncHandler(async (req, res) => {
//   const sessionId = req.params.id;
//   const session = await Session.findById(sessionId);
//   if (!session) throw new ApiError(404, 'Session not found');
//   if (session.practitionerId.toString() !== req.user.id && req.user.role !== 'admin') throw new ApiError(403, 'Forbidden');
//   session.outcome = { ...session.outcome, ...req.body };
//   await session.save();
//   await AuditLog.create({ userId: req.user.id, userModel: 'Practitioner', action: 'update', resourceType: 'Session', resourceId: session._id, description: 'Added session outcome' });
//   res.status(200).json(new ApiResponse(200, session, 'Outcome saved'));
// });

// // GET /api/practitioners/:id/patient-basic/:patientId
// exports.getPatientBasic = asyncHandler(async (req, res) => {
//   const practitionerId = req.params.id;
//   const patientId = req.params.patientId;
//   if (req.user.role === 'practitioner' && req.user.id !== practitionerId) throw new ApiError(403, 'Forbidden');
//   // Only return limited fields
//   const patient = await Patient.findById(patientId, 'name age gender medicalHistory profileImage');
//   if (!patient) throw new ApiError(404, 'Patient not found');
//   res.status(200).json(new ApiResponse(200, patient));
// });

// // GET /api/practitioners/:id/analytics
// exports.getAnalytics = asyncHandler(async (req, res) => {
//   const id = req.params.id;
//   if (req.user.role === 'practitioner' && req.user.id !== id) throw new ApiError(403, 'Forbidden');
//   const total = await Session.countDocuments({ practitionerId: id });
//   const completed = await Session.countDocuments({ practitionerId: id, status: 'completed' });
//   const avgRating = await Feedback.aggregate([
//     { $match: { practitionerId: require('mongoose').Types.ObjectId(id) } },
//     { $group: { _id: null, avg: { $avg: '$ratings.overall' } } }
//   ]);
//   res.status(200).json(new ApiResponse(200, { total, completed, avgRating: avgRating[0]?.avg || 0 }));
// });

// // GET /api/practitioners/:id/feedbacks
// exports.getFeedbacks = asyncHandler(async (req, res) => {
//   const id = req.params.id;
//   if (req.user.role === 'practitioner' && req.user.id !== id) throw new ApiError(403, 'Forbidden');
//   const feedbacks = await Feedback.find({ practitionerId: id }).sort({ createdAt: -1 });
//   res.status(200).json(new ApiResponse(200, feedbacks));
// });



import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import Practitioner from '../models/Practitioner.models.js';
import Session from '../models/Session.models.js';
import Patient from '../models/Patient.models.js';
import Feedback from '../models/Feedback.models.js';
import AuditLog from '../models/AuditLog.models.js';

export const getProfile = asyncHandler(async (req, res) => {
  const practitioner = await Practitioner.findById(req.user._id)
    .select('-passwordHash -refreshToken')
    .populate('centerId', 'name address');

  if (!practitioner) throw new ApiError(404, 'Practitioner not found');

  res.status(200).json(
    new ApiResponse(200, practitioner, "Practitioner profile fetched successfully")
  );
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, bio, languages } = req.body;

  const practitioner = await Practitioner.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(bio && { bio }),
        ...(languages && { languages })
      }
    },
    { new: true, runValidators: true }
  ).select('-passwordHash -refreshToken');

  await AuditLog.create({
    userId: practitioner._id,
    userModel: 'Practitioner',
    action: 'update',
    centerId: practitioner.centerId,
    resourceType: 'Practitioner',
    resourceId: practitioner._id,
    description: 'Practitioner profile updated',
    details: req.body,
    ipAddress: req.ip
  });

  res.status(200).json(
    new ApiResponse(200, practitioner, "Practitioner profile updated successfully")
  );
});

export const getSpecializations = asyncHandler(async (req, res) => {
  const practitioner = await Practitioner.findById(req.user._id)
    .select('specialization');

  res.status(200).json(
    new ApiResponse(200, practitioner.specialization, "Specializations fetched successfully")
  );
});

export const updateSpecializations = asyncHandler(async (req, res) => {
  const { specialization } = req.body;

  const practitioner = await Practitioner.findByIdAndUpdate(
    req.user._id,
    { specialization },
    { new: true, runValidators: true }
  ).select('specialization');

  await AuditLog.create({
    userId: practitioner._id,
    userModel: 'Practitioner',
    action: 'update',
    centerId: practitioner.centerId,  
    resourceType: 'Specialization',
    resourceId: practitioner._id,
    description: 'Specializations updated',
    ipAddress: req.ip
  });

  res.status(200).json(
    new ApiResponse(200, practitioner.specialization, "Specializations updated successfully")
  );
});

export const getWorkingHours = asyncHandler(async (req, res) => {
  const practitioner = await Practitioner.findById(req.user._id)
    .select('workingHours');

  res.status(200).json(
    new ApiResponse(200, practitioner.workingHours, "Working hours fetched successfully")
  );
});

export const updateWorkingHours = asyncHandler(async (req, res) => {
  const { workingHours } = req.body;

  const practitioner = await Practitioner.findByIdAndUpdate(
    req.user._id,
    { workingHours },
    { new: true, runValidators: true }
  ).select('workingHours');

  await AuditLog.create({
    userId: practitioner._id,
    userModel: 'Practitioner',
    action: 'update',
    centerId: practitioner.centerId,  
    resourceType: 'WorkingHours',
    resourceId: practitioner._id,
    description: 'Working hours updated',
    ipAddress: req.ip
  });

  res.status(200).json(
    new ApiResponse(200, practitioner.workingHours, "Working hours updated successfully")
  );
});

export const getUpcomingSessions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const sessions = await Session.find({
    practitionerId: req.user._id,
    scheduledStart: { $gte: new Date() },
    status: { $in: ['booked', 'confirmed'] }
  })
    .populate('patientId', 'name gender dateOfBirth')
    .populate('centerId', 'name address')
    .sort({ scheduledStart: 1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Session.countDocuments({
    practitionerId: req.user._id,
    scheduledStart: { $gte: new Date() },
    status: { $in: ['booked', 'confirmed'] }
  });

  res.status(200).json(
    new ApiResponse(200, {
      sessions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    }, "Upcoming sessions fetched successfully")
  );
});

export const getCompletedSessions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const sessions = await Session.find({
    practitionerId: req.user._id,
    status: 'completed'
  })
    .populate('patientId', 'name gender')
    .populate('centerId', 'name address')
    .sort({ scheduledStart: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Session.countDocuments({
    practitionerId: req.user._id,
    status: 'completed'
  });

  res.status(200).json(
    new ApiResponse(200, {
      sessions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    }, "Completed sessions fetched successfully")
  );
});

export const markSessionComplete = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { outcome } = req.body;
//session ka kya outcome nikla
  const session = await Session.findOne({
    _id: sessionId,
    practitionerId: req.user._id
  });

  if (!session) throw new ApiError(404, 'Session not found');
  if (session.status === 'completed') throw new ApiError(400, 'Session already completed');

  session.status = 'completed';
  session.outcome = outcome;
  await session.save();

  await AuditLog.create({
    userId: req.user._id,
    userModel: 'Practitioner',
    action: 'update',
    centerId: session.centerId,
    resourceType: 'Session',
    resourceId: session._id,
    description: 'Session marked as completed',
    ipAddress: req.ip
  });

  res.status(200).json(
    new ApiResponse(200, session, "Session marked as completed successfully")
  );
});

export const addSessionOutcome = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { outcome } = req.body;

  const session = await Session.findOneAndUpdate(
    {
      _id: sessionId,
      practitionerId: req.user._id,
      status: 'completed'
    },
    { outcome },
    { new: true, runValidators: true }
  );

  if (!session) throw new ApiError(404, 'Session not found or not completed');

  await AuditLog.create({
    userId: req.user._id,
    userModel: 'Practitioner',
    action: 'update',
    centerId: session.centerId,
    resourceType: 'Session',
    resourceId: session._id,
    description: 'Session outcome added',
    ipAddress: req.ip
  });

  res.status(200).json(
    new ApiResponse(200, session, "Session outcome added successfully")
  );
});

export const getPatientDetails = asyncHandler(async (req, res) => {
  const { patientId } = req.params;

  const patient = await Patient.findById(patientId)
    .select('name gender dateOfBirth medicalHistory therapyPreferences profileImage');

  if (!patient) throw new ApiError(404, 'Patient not found');

  res.status(200).json(
    new ApiResponse(200, patient, "Patient details fetched successfully")
  );
});

export const getAssignedPatients = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const sessions = await Session.find({
    practitionerId: req.user._id,
    status: { $in: ['booked', 'confirmed', 'completed'] }
  })
    .populate('patientId', 'name gender dateOfBirth phone')
    .sort({ scheduledStart: -1 });

  const uniquePatients = sessions.reduce((acc, session) => {
    if (session.patientId && !acc.find(p => p._id.toString() === session.patientId._id.toString())) {
      acc.push(session.patientId);
    }
    return acc;
  }, []);

  const paginatedPatients = uniquePatients.slice((page - 1) * limit, page * limit);

  res.status(200).json(
    new ApiResponse(200, {
      patients: paginatedPatients,
      totalPages: Math.ceil(uniquePatients.length / limit),
      currentPage: page,
      total: uniquePatients.length
    }, "Assigned patients fetched successfully")
  );
});

export const getPerformanceStats = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const sessions = await Session.find({
    practitionerId: req.user._id,
    scheduledStart: { $gte: startDate }
  });

  const completedSessions = sessions.filter(s => s.status === 'completed');
  const feedbacks = await Feedback.find({ practitionerId: req.user._id });

  const stats = {
    totalSessions: sessions.length,
    completedSessions: completedSessions.length,
    completionRate: sessions.length > 0 ? (completedSessions.length / sessions.length) * 100 : 0,
    averageRating: feedbacks.length > 0 
      ? feedbacks.reduce((sum, f) => sum + f.ratings.overall, 0) / feedbacks.length 
      : 0,
    totalPatients: new Set(sessions.map(s => s.patientId?.toString())).size,
    therapyDistribution: sessions.reduce((acc, session) => {
      acc[session.therapyType] = (acc[session.therapyType] || 0) + 1;
      return acc;
    }, {}),
    weeklyWorkload: Array.from({ length: 7 }, (_, i) => {
      const daySessions = sessions.filter(s => 
        s.scheduledStart.getDay() === i
      );
      return {
        day: i,
        sessions: daySessions.length
      };
    })
  };

  res.status(200).json(
    new ApiResponse(200, stats, "Performance stats fetched successfully")
  );
});

export const getFeedback = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const feedbacks = await Feedback.find({ practitionerId: req.user._id })
    .populate('patientId', 'name')
    .populate('sessionId', 'therapyType scheduledStart')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Feedback.countDocuments({ practitionerId: req.user._id });

  res.status(200).json(
    new ApiResponse(200, {
      feedbacks,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    }, "Feedback fetched successfully")
  );
});

export const updateProfileImage = asyncHandler(async (req, res) => {
  if (!req.file?.path) {
    throw new ApiError(400, "Profile image is required");
  }

  // Fetch practitioner
  const practitioner = await Practitioner.findById(req.user._id);
  if (!practitioner) {
    throw new ApiError(404, "Practitioner not found");
  }

  // ✅ Delete old Cloudinary image if exists
  if (practitioner.profileImage?.url) {
    try {
      await deleteImageOnCloudinary(practitioner.profileImage.url);
    } catch (err) {
      console.warn("⚠️ Failed to delete old Cloudinary image:", err.message);
    }
  }

  // ✅ Upload new image
  const uploadRes = await uploadOnCloudinary(req.file.path, "image");

  if (!uploadRes?.secure_url) {
    throw new ApiError(500, "Image upload failed");
  }

  // ✅ Update practitioner document
  practitioner.profileImage = {
    url: uploadRes.secure_url,
    publicId: uploadRes.public_id,
  };

  await practitioner.save();

  // ✅ Log this action
  await AuditLog.create({
    userId: practitioner._id,
    userModel: "Practitioner",
    role: "Practitioner",
    action: "update",
    centerId: practitioner.centerId,
    resourceType: "Practitioner",
    resourceId: practitioner._id,
    description: "Profile image updated",
    ipAddress: req.ip,
  });

  // ✅ Respond success
  return res.status(200).json(
    new ApiResponse(200, practitioner.profileImage, "Profile image updated successfully")
  );
});

export const updateDurationEstimates = asyncHandler(async (req, res) => {
  const { durationEstimates } = req.body;

  const practitioner = await Practitioner.findByIdAndUpdate(
    req.user._id,
    { durationEstimates },
    { new: true }
  ).select('durationEstimates');

  await AuditLog.create({
    userId: practitioner._id,
    userModel: 'Practitioner',
    action: 'update',
    centerId: practitioner.centerId,
    resourceType: 'Practitioner',
    resourceId: practitioner._id,
    description: 'Duration estimates updated',
    ipAddress: req.ip
  });

  res.status(200).json(
    new ApiResponse(200, practitioner.durationEstimates, "Duration estimates updated successfully")
  );
});
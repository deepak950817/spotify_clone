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
import Patient from '../models/Patient.models.js';
import Session from '../models/Session.models.js';
import AuditLog from '../models/AuditLog.models.js';
import Notification from '../models/Notification.models.js';

export const getProfile = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.user._id)
    .select('-passwordHash -refreshToken');

  if (!patient) throw new ApiError(404, 'Patient not found');

  res.status(200).json(
    new ApiResponse(200, patient, "Patient profile fetched successfully")
  );
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, gender, dateOfBirth, address, emergencyContact } = req.body;

  const patient = await Patient.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(gender && { gender }),
        ...(dateOfBirth && { dateOfBirth }),
        ...(address && { address }),
        ...(emergencyContact && { emergencyContact })
      }
    },
    { new: true, runValidators: true }
  ).select('-passwordHash -refreshToken');

  await AuditLog.create({
    userId: patient._id,
    userModel: 'Patient',
    action: 'update',
    resourceType: 'Patient',
    resourceId: patient._id,
    description: 'Patient profile updated',
    details: req.body,
    ipAddress: req.ip
  });

  res.status(200).json(
    new ApiResponse(200, patient, "Patient profile updated successfully")
  );
});

export const getMedicalHistory = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.user._id)
    .select('medicalHistory');

  res.status(200).json(
    new ApiResponse(200, patient.medicalHistory, "Medical history fetched successfully")
  );
});

export const updateMedicalHistory = asyncHandler(async (req, res) => {
  const { medicalHistory } = req.body;

  const patient = await Patient.findByIdAndUpdate(
    req.user._id,
    { medicalHistory },
    { new: true, runValidators: true }
  ).select('medicalHistory');

  await AuditLog.create({
    userId: patient._id,
    userModel: 'Patient',
    action: 'update',
    centerId: patient.centerId,
    resourceType: 'MedicalHistory',
    resourceId: patient._id,
    description: 'Medical history updated',
    ipAddress: req.ip
  });

  res.status(200).json(
    new ApiResponse(200, patient.medicalHistory, "Medical history updated successfully")
  );
});

export const getTherapyPreferences = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.user._id)
    .select('therapyPreferences');

  res.status(200).json(
    new ApiResponse(200, patient.therapyPreferences, "Therapy preferences fetched successfully")
  );
});

export const updateTherapyPreferences = asyncHandler(async (req, res) => {
  const { therapyPreferences } = req.body;

  const patient = await Patient.findByIdAndUpdate(
    req.user._id,
    { therapyPreferences },
    { new: true, runValidators: true }
  ).select('therapyPreferences');

  await AuditLog.create({
    userId: patient._id,
    userModel: 'Patient',
    centerId: patient.centerId,
    action: 'update',
    resourceType: 'TherapyPreferences',
    resourceId: patient._id,
    description: 'Therapy preferences updated',
    ipAddress: req.ip
  });

  res.status(200).json(
    new ApiResponse(200, patient.therapyPreferences, "Therapy preferences updated successfully")
  );
});

export const getAvailability = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.user._id)
    .select('availability');

  res.status(200).json(
    new ApiResponse(200, patient.availability, "Availability fetched successfully")
  );
});
//hamesha update se phle get krege phir option denge phir krwayege
export const updateAvailability = asyncHandler(async (req, res) => {
  const { availability } = req.body;

  const patient = await Patient.findByIdAndUpdate(
    req.user._id,
    { availability },
    { new: true, runValidators: true }
  ).select('availability');

  await AuditLog.create({
    userId: patient._id,
    userModel: 'Patient',
    action: 'update',
    centerId: patient.centerId,
    resourceType: 'Availability',
    resourceId: patient._id,
    description: 'Availability updated',
    ipAddress: req.ip
  });

  res.status(200).json(
    new ApiResponse(200, patient.availability, "Availability updated successfully")
  );
});

export const getUpcomingSessions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const sessions = await Session.find({
    patientId: req.user._id,
    scheduledStart: { $gte: new Date() },
    status: { $in: ['booked', 'confirmed'] }
  })
    .populate('practitionerId', 'name specialization')
    .populate('centerId', 'name address')
    .sort({ scheduledStart: 1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Session.countDocuments({
    patientId: req.user._id,
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

export const getSessionHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  const filter = { patientId: req.user._id };
  if (status) filter.status = status;

  const sessions = await Session.find(filter)
    .populate('practitionerId', 'name specialization ratings')
    .populate('centerId', 'name address')
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
    }, "Session history fetched successfully")
  );
});

export const getProgress = asyncHandler(async (req, res) => {
  const sessions = await Session.find({
    patientId: req.user._id,
    status: 'completed'
  })
    .select('therapyType scheduledStart outcome')
    .sort({ scheduledStart: 1 });

  const progress = {
    totalSessions: sessions.length,
    therapiesCompleted: [...new Set(sessions.map(s => s.therapyType))],
    completionRate: sessions.filter(s => s.outcome?.completedOnTime).length / sessions.length || 0,
    sessionTimeline: sessions.map(session => ({
      date: session.scheduledStart,
      therapy: session.therapyType,
      completedOnTime: session.outcome?.completedOnTime,
      feedbackScore: session.outcome?.feedbackScore
    }))
  };

  res.status(200).json(
    new ApiResponse(200, progress, "Patient progress fetched successfully")
  );
});

export const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, read } = req.query; //read mtlb option denge read true to hme read wali denge vrna unread wali

  const filter = {
    userId: req.user._id,
    userModel: 'Patient'
  };
  if (read !== undefined) {
    filter.status = read ? 'read' : { $in: ['sent', 'delivered'] };
  } 

  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Notification.countDocuments(filter);
  const unreadCount = await Notification.countDocuments({
    userId: req.user._id,
    userModel: 'Patient',
    status: { $in: ['sent', 'delivered'] }
  });

  res.status(200).json(
    new ApiResponse(200, {
      notifications,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      unreadCount
    }, "Notifications fetched successfully")
  );
});

export const updateProfileImage = asyncHandler(async (req, res) => {
  if (!req.file?.path) {
    throw new ApiError(400, "Profile image is required");
  }

  // Fetch patient from DB
  const patient = await Patient.findById(req.user._id);
  if (!patient) {
    throw new ApiError(404, "Patient not found");
  }

  // If existing image URL is present → delete from Cloudinary first
  if (patient.profileImage?.url) {
    try {
      await deleteImageOnCloudinary(patient.profileImage.url);
    } catch (err) {
      console.warn("⚠️ Failed to delete old Cloudinary image:", err.message);
    }
  }

  //Upload new image to Cloudinary
  const uploadRes = await uploadOnCloudinary(req.file.path, "image");

  if (!uploadRes?.secure_url) {
    throw new ApiError(500, "Image upload failed");
  }

  //Update DB
  patient.profileImage = {
    url: uploadRes.secure_url,
    publicId: uploadRes.public_id,
  };

  await patient.save();

  // Log the update
  await AuditLog.create({
    userId: patient._id,
    userModel: "Patient",
    role: "Patient",
    centerId: patient.centerId,
    action: "update",
    resourceType: "Patient",
    resourceId: patient._id,
    description: "Profile image updated",
    ipAddress: req.ip,
  });

  // Return success response
  return res
    .status(200)
    .json(new ApiResponse(200, patient.profileImage, "Profile image updated successfully"));
});
export const deactivateAccount = asyncHandler(async (req, res) => {
  const patient = await Patient.findByIdAndUpdate(
    req.user._id,
    { isActive: false },
    { new: true }
  ).select('-passwordHash -refreshToken');

  await AuditLog.create({
    userId: patient._id,
    userModel: 'Patient',
    action: 'update',
    centerId: patient.centerId,
    resourceType: 'Patient',
    resourceId: patient._id,
    description: 'Account deactivated',
    ipAddress: req.ip
  });

  res.status(200).json(
    new ApiResponse(200, patient, "Account deactivated successfully")
  );
});

//feedback wala bhi dalna hai
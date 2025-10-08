import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import RescheduleRequest from '../models/RescheduleRequest.model.js';
import Session from '../models/Session.models.js';
import AuditLog from '../models/AuditLog.models.js';
import Notification from '../models/Notification.models.js';

export const createRequest = asyncHandler(async (req, res) => {
  const { sessionId, newDate, reason } = req.body;

  const session = await Session.findById(sessionId);
  if (!session) throw new ApiError(404, 'Session not found');

  // Check permissions
  if (req.user.role === 'patient' && session.patientId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Access denied');
  }
  if (req.user.role === 'practitioner' && session.practitionerId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Access denied');
  }

  // Check if there's already a pending request for this session
  const existingRequest = await RescheduleRequest.findOne({
    session: sessionId,
    status: 'Pending'
  });

  if (existingRequest) {
    throw new ApiError(400, 'A pending reschedule request already exists for this session');
  }

  // Calculate new end time
  const newEnd = new Date(newDate);
  newEnd.setMinutes(newEnd.getMinutes() + session.durationMinutes);

  // Check for conflicts
  const conflictingSession = await Session.findOne({
    practitionerId: session.practitionerId,
    _id: { $ne: sessionId },
    scheduledStart: { $lt: newEnd },
    scheduledEnd: { $gt: newDate },
    status: { $in: ['booked', 'confirmed'] }
  });

  if (conflictingSession) {
    throw new ApiError(409, 'Practitioner is not available at the requested time');
  }

  const rescheduleRequest = await RescheduleRequest.create({
    session: sessionId,
    requestedBy: req.user._id,
    requestedByRole: req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1),
    oldDate: session.scheduledStart,
    newDate: newDate,
    reason: reason
  });

  // Create notification for admin
  await Notification.create({
    userId: session.practitionerId, // Notify practitioner about the request
    userModel: 'Practitioner',
    title: 'Reschedule Request Received',
    message: `A reschedule request has been submitted for your ${session.therapyType} session`,
    type: 'system_alert',
    channel: 'in_app',
    data: { requestId: rescheduleRequest._id, sessionId }
  });

  await AuditLog.create({
    userId: req.user._id,
    userModel: req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1),
    action: 'create',
    resourceType: 'RescheduleRequest',
    resourceId: rescheduleRequest._id,
    description: 'Reschedule request created',
    details: { sessionId, newDate, reason },
    ipAddress: req.ip
  });

  const createdRequest = await RescheduleRequest.findById(rescheduleRequest._id)
    .populate('session', 'therapyType scheduledStart patientId practitionerId')
    .populate('requestedBy', 'name');

  res.status(201).json(
    new ApiResponse(201, createdRequest, "Reschedule request created successfully")
  );
});

export const getPendingRequests = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  // Admin can see all pending requests for their center
  let filter = { status: 'Pending' };
  
  if (req.user.role === 'admin') {
    // Get sessions from admin's center
    const centerSessions = await Session.find({ centerId: req.user.centerId }).select('_id');
    const sessionIds = centerSessions.map(session => session._id);
    filter.session = { $in: sessionIds };
  } else if (req.user.role === 'practitioner') {
    // Practitioners can see requests for their sessions
    const practitionerSessions = await Session.find({ practitionerId: req.user._id }).select('_id');
    const sessionIds = practitionerSessions.map(session => session._id);
    filter.session = { $in: sessionIds };
  } else if (req.user.role === 'patient') {
    // Patients can see their own requests
    filter.requestedBy = req.user._id;
  }

  const requests = await RescheduleRequest.find(filter)
    .populate({
      path: 'session',
      populate: [
        { path: 'patientId', select: 'name phone' },
        { path: 'practitionerId', select: 'name specialization' }
      ]
    })
    .populate('requestedBy', 'name')
    .populate('reviewedBy', 'name')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await RescheduleRequest.countDocuments(filter);

  res.status(200).json(
    new ApiResponse(200, {
      requests,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    }, "Pending requests fetched successfully")
  );
});

export const getRequestById = asyncHandler(async (req, res) => {
  const { requestId } = req.params;

  const request = await RescheduleRequest.findById(requestId)
    .populate({
      path: 'session',
      populate: [
        { path: 'patientId', select: 'name phone' },
        { path: 'practitionerId', select: 'name specialization' },
        { path: 'centerId', select: 'name' }
      ]
    })
    .populate('requestedBy', 'name email')
    .populate('reviewedBy', 'name');

  if (!request) throw new ApiError(404, 'Reschedule request not found');

  // Check permissions
  if (req.user.role === 'patient' && request.requestedBy._id.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Access denied');
  }
  if (req.user.role === 'practitioner') {
    const session = await Session.findById(request.session._id);
    if (session.practitionerId.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Access denied');
    }
  }

  res.status(200).json(
    new ApiResponse(200, request, "Reschedule request fetched successfully")
  );
});

export const approveRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { reviewNotes } = req.body;

  if (req.user.role !== 'admin') {
    throw new ApiError(403, 'Only admins can approve reschedule requests');
  }

  const request = await RescheduleRequest.findById(requestId)
    .populate('session');

  if (!request) throw new ApiError(404, 'Reschedule request not found');
  if (request.status !== 'Pending') throw new ApiError(400, 'Request already processed');

  // Update session with new timing
  const session = await Session.findByIdAndUpdate(
    request.session._id,
    {
      scheduledStart: request.newDate,
      scheduledEnd: new Date(request.newDate.getTime() + request.session.durationMinutes * 60000),
      status: 'rescheduled'
    },
    { new: true }
  );

  // Update request status
  request.status = 'Approved';
  request.reviewedBy = req.user._id;
  request.reviewNotes = reviewNotes;
  request.respondedAt = new Date();
  await request.save();

  // Create notifications
  await Promise.all([
    Notification.create({
      userId: request.session.patientId,
      userModel: 'Patient',
      title: 'Reschedule Request Approved',
      message: `Your reschedule request for ${request.session.therapyType} has been approved. New time: ${request.newDate.toLocaleString()}`,
      type: 'update',
      channel: 'in_app'
    }),
    Notification.create({
      userId: request.session.practitionerId,
      userModel: 'Practitioner',
      title: 'Reschedule Request Approved',
      message: `A session reschedule has been approved. New time: ${request.newDate.toLocaleString()}`,
      type: 'update',
      channel: 'in_app'
    })
  ]);

  await AuditLog.create({
    userId: req.user._id,
    userModel: 'Admin',
    action: 'update',
    resourceType: 'RescheduleRequest',
    resourceId: requestId,
    description: 'Reschedule request approved',
    details: { reviewNotes, newDate: request.newDate },
    ipAddress: req.ip
  });

  const updatedRequest = await RescheduleRequest.findById(requestId)
    .populate({
      path: 'session',
      populate: [
        { path: 'patientId', select: 'name phone' },
        { path: 'practitionerId', select: 'name specialization' }
      ]
    })
    .populate('reviewedBy', 'name');

  res.status(200).json(
    new ApiResponse(200, updatedRequest, "Reschedule request approved successfully")
  );
});

export const rejectRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { reviewNotes } = req.body;

  if (req.user.role !== 'admin') {
    throw new ApiError(403, 'Only admins can reject reschedule requests');
  }

  const request = await RescheduleRequest.findById(requestId);
  if (!request) throw new ApiError(404, 'Reschedule request not found');
  if (request.status !== 'Pending') throw new ApiError(400, 'Request already processed');

  request.status = 'Rejected';
  request.reviewedBy = req.user._id;
  request.reviewNotes = reviewNotes;
  request.respondedAt = new Date();
  await request.save();

  // Create notification for requester
  const session = await Session.findById(request.session).populate('patientId practitionerId');
  
  await Notification.create({
    userId: request.requestedBy,
    userModel: request.requestedByRole,
    title: 'Reschedule Request Rejected',
    message: `Your reschedule request for ${session.therapyType} has been rejected.`,
    type: 'system_alert',
    channel: 'in_app',
    data: { reviewNotes }
  });

  await AuditLog.create({
    userId: req.user._id,
    userModel: 'Admin',
    action: 'update',
    resourceType: 'RescheduleRequest',
    resourceId: requestId,
    description: 'Reschedule request rejected',
    details: { reviewNotes },
    ipAddress: req.ip
  });

  const updatedRequest = await RescheduleRequest.findById(requestId)
    .populate({
      path: 'session',
      populate: [
        { path: 'patientId', select: 'name phone' },
        { path: 'practitionerId', select: 'name specialization' }
      ]
    })
    .populate('reviewedBy', 'name');

  res.status(200).json(
    new ApiResponse(200, updatedRequest, "Reschedule request rejected successfully")
  );
});

export const getRequestsBySession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const session = await Session.findById(sessionId);
  if (!session) throw new ApiError(404, 'Session not found');

  // Check permissions
  if (req.user.role === 'patient' && session.patientId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Access denied');
  }
  if (req.user.role === 'practitioner' && session.practitionerId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Access denied');
  }

  const requests = await RescheduleRequest.find({ session: sessionId })
    .populate('requestedBy', 'name')
    .populate('reviewedBy', 'name')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await RescheduleRequest.countDocuments({ session: sessionId });

  res.status(200).json(
    new ApiResponse(200, {
      requests,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    }, "Session reschedule requests fetched successfully")
  );
});

export const getRequestsByUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 10, status } = req.query;

  // Check permissions
  if (req.user.role === 'patient' && userId !== req.user._id.toString()) {
    throw new ApiError(403, 'Access denied');
  }

  const filter = { requestedBy: userId };
  if (status) filter.status = status;

  const requests = await RescheduleRequest.find(filter)
    .populate({
      path: 'session',
      populate: [
        { path: 'patientId', select: 'name phone' },
        { path: 'practitionerId', select: 'name specialization' }
      ]
    })
    .populate('reviewedBy', 'name')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await RescheduleRequest.countDocuments(filter);

  res.status(200).json(
    new ApiResponse(200, {
      requests,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    }, "User reschedule requests fetched successfully")
  );
});

export const addReviewNotes = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { reviewNotes } = req.body;

  if (req.user.role !== 'admin') {
    throw new ApiError(403, 'Only admins can add review notes');
  }

  const request = await RescheduleRequest.findByIdAndUpdate(
    requestId,
    { reviewNotes },
    { new: true, runValidators: true }
  )
    .populate({
      path: 'session',
      populate: [
        { path: 'patientId', select: 'name phone' },
        { path: 'practitionerId', select: 'name specialization' }
      ]
    })
    .populate('reviewedBy', 'name');

  if (!request) throw new ApiError(404, 'Reschedule request not found');

  await AuditLog.create({
    userId: req.user._id,
    userModel: 'Admin',
    action: 'update',
    resourceType: 'RescheduleRequest',
    resourceId: requestId,
    description: 'Review notes added to reschedule request',
    details: { reviewNotes },
    ipAddress: req.ip
  });

  res.status(200).json(
    new ApiResponse(200, request, "Review notes added successfully")
  );
});

export const cancelRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;

  const request = await RescheduleRequest.findById(requestId);
  if (!request) throw new ApiError(404, 'Reschedule request not found');

  // Check permissions - only requester can cancel their own pending request
  if (request.requestedBy.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Access denied');
  }

  if (request.status !== 'Pending') {
    throw new ApiError(400, 'Cannot cancel a processed request');
  }

  const cancelledRequest = await RescheduleRequest.findByIdAndUpdate(
    requestId,
    { status: 'Cancelled' },
    { new: true }
  );

  await AuditLog.create({
    userId: req.user._id,
    userModel: req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1),
    action: 'update',
    resourceType: 'RescheduleRequest',
    resourceId: requestId,
    description: 'Reschedule request cancelled by requester',
    ipAddress: req.ip
  });

  res.status(200).json(
    new ApiResponse(200, cancelledRequest, "Reschedule request cancelled successfully")
  );
});
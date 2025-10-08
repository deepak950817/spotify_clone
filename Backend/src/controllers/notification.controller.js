// // controllers/notification.controller.js
// const { asyncHandler } = require('../utils/asyncHandler');
// const { ApiResponse } = require('../utils/ApiResponse');
// const { ApiError } = require('../utils/ApiError');
// const Notification = require('../models/Notification.models');
// const AuditLog = require('../models/AuditLog.models');

// // GET /api/notifications (list for logged-in user)
// exports.listNotifications = asyncHandler(async (req, res) => {
//   const userId = req.user.id;
//   const notifs = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(200);
//   res.status(200).json(new ApiResponse(200, notifs));
// });

// // POST /api/notifications/mark-read
// exports.markRead = asyncHandler(async (req, res) => {
//   const { ids } = req.body; // array of notification ids
//   if (!Array.isArray(ids)) throw new ApiError(400, 'ids array required');
//   await Notification.updateMany({ _id: { $in: ids }, userId: req.user.id }, { status: 'read', isRead: true });
//   res.status(200).json(new ApiResponse(200, {}, 'Marked read'));
// });

// // POST /api/admin/notifications/templates (CRUD for admin templates - simple)
// exports.createTemplate = asyncHandler(async (req, res) => {
//   // Implement persistent templates if you have model; simple placeholder:
//   await AuditLog.create({ userId: req.user.id, userModel: 'Admin', action: 'create', resourceType: 'NotificationTemplate', description: 'Created template' });
//   res.status(201).json(new ApiResponse(201, {}, 'Template created (stub)'));
// });

import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import Notification from '../models/Notification.models.js';
import Patient from '../models/Patient.models.js';
import Practitioner from '../models/Practitioner.models.js';
import Admin from '../models/Admin.models.js';
import AuditLog from '../models/AuditLog.models.js';

export const getUserNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, read, type } = req.query;

  const filter = {
    userId: req.user._id,
    userModel: req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1)
  };

  if (read !== undefined) {
    filter.status = read ? 'read' : { $in: ['sent', 'delivered'] };
  }

  if (type) {
    filter.type = type;
  }

  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Notification.countDocuments(filter);
  
  // Count unread notifications
  const unreadCount = await Notification.countDocuments({
    userId: req.user._id,
    userModel: req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1),
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

export const markAsRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  const notification = await Notification.findOne({
    _id: notificationId,
    userId: req.user._id,
    userModel: req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1)
  });

  if (!notification) throw new ApiError(404, 'Notification not found');

  notification.status = 'read';
  notification.readAt = new Date();
  await notification.save();

  res.status(200).json(
    new ApiResponse(200, notification, "Notification marked as read")
  );
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    {
      userId: req.user._id,
      userModel: req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1),
      status: { $in: ['sent', 'delivered'] }
    },
    {
      status: 'read',
      readAt: new Date()
    }
  );

  await AuditLog.create({
    userId: req.user._id,
    userModel: req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1),
    action: 'update',
    resourceType: 'Notification',
    description: 'All notifications marked as read',
    ipAddress: req.ip
  });

  res.status(200).json(
    new ApiResponse(200, { modifiedCount: result.modifiedCount }, "All notifications marked as read")
  );
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    userId: req.user._id,
    userModel: req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1)
  });

  if (!notification) throw new ApiError(404, 'Notification not found');

  await AuditLog.create({
    userId: req.user._id,
    userModel: req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1),
    action: 'delete',
    resourceType: 'Notification',
    resourceId: notificationId,
    description: 'Notification deleted',
    ipAddress: req.ip
  });

  res.status(200).json(
    new ApiResponse(200, null, "Notification deleted successfully")
  );
});

export const sendNotification = asyncHandler(async (req, res) => {
  const { userId, userModel, title, message, type, channel, priority, data } = req.body;

  // Validate userModel
  if (!['Patient', 'Practitioner', 'Admin'].includes(userModel)) {
    throw new ApiError(400, 'Invalid user model');
  }

  // Check if user exists
  let user;
  switch (userModel) {
    case 'Patient':
      user = await Patient.findById(userId);
      break;
    case 'Practitioner':
      user = await Practitioner.findById(userId);
      break;
    case 'Admin':
      user = await Admin.findById(userId);
      break;
  }

  if (!user) throw new ApiError(404, 'User not found');

  const notification = await Notification.create({
    userId,
    userModel,
    title,
    message,
    type: type || 'system_alert',
    channel: channel || 'in_app',
    priority: priority || 'medium',
    data,
    sentAt: new Date()
  });

  await AuditLog.create({
    userId: req.user._id,
    userModel: req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1),
    action: 'create',
    resourceType: 'Notification',
    resourceId: notification._id,
    description: 'Notification sent to user',
    details: { targetUser: userId, userModel, type },
    ipAddress: req.ip
  });

  res.status(201).json(
    new ApiResponse(201, notification, "Notification sent successfully")
  );
});

export const sendBroadcastNotification = asyncHandler(async (req, res) => {
  const { title, message, targetUsers, type, channel, priority } = req.body;

  if (req.user.role !== 'admin') {
    throw new ApiError(403, 'Only admins can send broadcast notifications');
  }

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

export const getNotificationStats = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  let filter = {
    createdAt: { $gte: startDate }
  };

  // For non-admin users, only show their own stats
  if (req.user.role !== 'admin') {
    filter.userId = req.user._id;
    filter.userModel = req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1);
  }

  // For admins, show stats for their center
  if (req.user.role === 'admin') {
    const centerUsers = await getCenterUserIds(req.user.centerId);
    filter.userId = { $in: centerUsers };
  }

  const stats = await Notification.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalNotifications: { $sum: 1 },
        readNotifications: { $sum: { $cond: [{ $eq: ["$status", "read"] }, 1, 0] } },
        deliveredNotifications: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } },
        failedNotifications: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
        byType: {
          $push: {
            type: "$type",
            status: "$status"
          }
        },
        byChannel: {
          $push: {
            channel: "$channel",
            status: "$status"
          }
        },
        byUserModel: {
          $push: {
            userModel: "$userModel",
            status: "$status"
          }
        }
      }
    }
  ]);

  const notificationStats = stats[0] || {
    totalNotifications: 0,
    readNotifications: 0,
    deliveredNotifications: 0,
    failedNotifications: 0,
    byType: [],
    byChannel: [],
    byUserModel: []
  };

  // Calculate type distribution
  const typeDistribution = {};
  notificationStats.byType.forEach(item => {
    if (!typeDistribution[item.type]) {
      typeDistribution[item.type] = { total: 0, read: 0, delivered: 0, failed: 0 };
    }
    typeDistribution[item.type].total++;
    if (item.status === 'read') typeDistribution[item.type].read++;
    if (item.status === 'delivered') typeDistribution[item.type].delivered++;
    if (item.status === 'failed') typeDistribution[item.type].failed++;
  });

  // Calculate channel distribution
  const channelDistribution = {};
  notificationStats.byChannel.forEach(item => {
    if (!channelDistribution[item.channel]) {
      channelDistribution[item.channel] = { total: 0, read: 0, delivered: 0, failed: 0 };
    }
    channelDistribution[item.channel].total++;
    if (item.status === 'read') channelDistribution[item.channel].read++;
    if (item.status === 'delivered') channelDistribution[item.channel].delivered++;
    if (item.status === 'failed') channelDistribution[item.channel].failed++;
  });

  // Calculate user model distribution
  const userModelDistribution = {};
  notificationStats.byUserModel.forEach(item => {
    if (!userModelDistribution[item.userModel]) {
      userModelDistribution[item.userModel] = { total: 0, read: 0, delivered: 0, failed: 0 };
    }
    userModelDistribution[item.userModel].total++;
    if (item.status === 'read') userModelDistribution[item.userModel].read++;
    if (item.status === 'delivered') userModelDistribution[item.userModel].delivered++;
    if (item.status === 'failed') userModelDistribution[item.userModel].failed++;
  });

  const result = {
    overview: {
      total: notificationStats.totalNotifications,
      read: notificationStats.readNotifications,
      delivered: notificationStats.deliveredNotifications,
      failed: notificationStats.failedNotifications,
      readRate: notificationStats.totalNotifications > 0 
        ? (notificationStats.readNotifications / notificationStats.totalNotifications) * 100 
        : 0
    },
    typeDistribution,
    channelDistribution,
    userModelDistribution,
    period: `${days} days`
  };

  res.status(200).json(
    new ApiResponse(200, result, "Notification statistics fetched successfully")
  );
});

export const sendSessionReminder = asyncHandler(async (req, res) => {
  const { sessionId, patientId, practitionerId, therapyType, sessionTime } = req.body;

  // This would typically be called by a cron job, but we expose it for manual triggering
  if (req.user.role !== 'admin') {
    throw new ApiError(403, 'Only admins can manually send session reminders');
  }

  // Send reminder to patient
  const patientNotification = await Notification.create({
    userId: patientId,
    userModel: 'Patient',
    title: 'Session Reminder',
    message: `Reminder: Your ${therapyType} session is scheduled for ${sessionTime}`,
    type: 'session_reminder',
    channel: 'in_app',
    priority: 'medium',
    data: { sessionId, reminderType: '24_hours_before' },
    sentAt: new Date()
  });

  // Send reminder to practitioner
  const practitionerNotification = await Notification.create({
    userId: practitionerId,
    userModel: 'Practitioner',
    title: 'Session Reminder',
    message: `You have a ${therapyType} session scheduled for ${sessionTime}`,
    type: 'session_reminder',
    channel: 'in_app',
    priority: 'medium',
    data: { sessionId },
    sentAt: new Date()
  });

  await AuditLog.create({
    userId: req.user._id,
    userModel: 'Admin',
    action: 'create',
    resourceType: 'Notification',
    description: 'Session reminders sent manually',
    details: { sessionId, patientId, practitionerId },
    ipAddress: req.ip
  });

  res.status(200).json(
    new ApiResponse(200, { 
      patientNotification,
      practitionerNotification 
    }, "Session reminders sent successfully")
  );
});

export const sendFeedbackRequest = asyncHandler(async (req, res) => {
  const { sessionId, patientId, practitionerId, therapyType } = req.body;

  if (req.user.role !== 'admin' && req.user.role !== 'practitioner') {
    throw new ApiError(403, 'Only admins and practitioners can send feedback requests');
  }

  const feedbackNotification = await Notification.create({
    userId: patientId,
    userModel: 'Patient',
    title: 'Share Your Feedback',
    message: `How was your ${therapyType} session? We'd love to hear your feedback!`,
    type: 'feedback_request',
    channel: 'in_app',
    priority: 'medium',
    data: { sessionId, practitionerId },
    sentAt: new Date()
  });

  await AuditLog.create({
    userId: req.user._id,
    userModel: req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1),
    action: 'create',
    resourceType: 'Notification',
    resourceId: feedbackNotification._id,
    description: 'Feedback request sent',
    details: { sessionId, patientId },
    ipAddress: req.ip
  });

  res.status(200).json(
    new ApiResponse(200, feedbackNotification, "Feedback request sent successfully")
  );
});

export const clearExpiredNotifications = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(403, 'Only admins can clear expired notifications');
  }

  const result = await Notification.deleteMany({
    expiresAt: { $lt: new Date() }
  });

  await AuditLog.create({
    userId: req.user._id,
    userModel: 'Admin',
    action: 'delete',
    resourceType: 'Notification',
    description: 'Expired notifications cleared',
    details: { deletedCount: result.deletedCount },
    ipAddress: req.ip
  });

  res.status(200).json(
    new ApiResponse(200, { deletedCount: result.deletedCount }, "Expired notifications cleared successfully")
  );
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const unreadCount = await Notification.countDocuments({
    userId: req.user._id,
    userModel: req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1),
    status: { $in: ['sent', 'delivered'] }
  });

  res.status(200).json(
    new ApiResponse(200, { unreadCount }, "Unread count fetched successfully")
  );
});

// Helper function to get center user IDs for admin stats
const getCenterUserIds = async (centerId) => {
  const [patients, practitioners, admins] = await Promise.all([
    Patient.find({}).select('_id'),
    Practitioner.find({ centerId }).select('_id'),
    Admin.find({ centerId }).select('_id')
  ]);

  return [
    ...patients.map(p => p._id),
    ...practitioners.map(p => p._id),
    ...admins.map(a => a._id)
  ];
};
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'userModel'
  },
  role: {
    type: String,
    required: true,
    enum: ['Patient', 'Practitioner', 'Admin']
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['session_reminder', 'booking_confirmation', 'cancellation', 'feedback_request', 'system_alert', 'promotional'],
    required: true
  },
  channel: {
    type: String,
    enum: ['email', 'sms', 'push', 'in_app'],
    default: 'in_app'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed'],
    default: 'sent'
  },
  expiresAt: Date
}, {
  timestamps: true
});

notificationSchema.index({ userId: 1, status: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ scheduledFor: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
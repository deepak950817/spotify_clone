const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
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
  action: {
    type: String,
    required: true,
    enum: ['create', 'read', 'update', 'delete', 'login', 'logout', 'password_change']
  },
  resourceType: {
    type: String,
    required: true
  },
  resourceId: mongoose.Schema.Types.ObjectId,
  description: String,

  ipAddress: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
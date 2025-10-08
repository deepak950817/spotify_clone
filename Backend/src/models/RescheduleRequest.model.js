const mongoose = require('mongoose');

const rescheduleRequestSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'requestedByModel'
  },
  requestedByModel: {
    type: String,
    required: true,
    enum: ['Patient', 'Practitioner']
  },
  requestedTo: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'requestedToModel'
  },
  requestedToModel: {
    type: String,
    required: true,
    enum: ['Patient', 'Practitioner']
  },
  originalTiming: {
    start: Date,
    end: Date
  },
  requestedTiming: {
    start: Date,
    end: Date
  },
  reason: String,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
}, {
  timestamps: true
});

rescheduleRequestSchema.index({ sessionId: 1 });
rescheduleRequestSchema.index({ requestedBy: 1 });
rescheduleRequestSchema.index({ status: 1 });
rescheduleRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('RescheduleRequest', rescheduleRequestSchema);
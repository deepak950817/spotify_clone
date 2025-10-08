import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  practitionerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Practitioner',
    required: true
  },
  centerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center',
    required: true
  },
  therapyType: {
    type: String,
    required: true
  },
  scheduledStart: {
    type: Date,
    required: true
  },
  scheduledEnd: {
    type: Date,
    required: true
  },
  durationMinutes: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['booked', 'completed', 'cancelled', 'rescheduled'],
    default: 'booked'
  },
  outcome: {
    completedOnTime: Boolean,
    feedbackScore: Number,
    notes: String
  },
  rescheduleHistory: [{
    previousStart: Date,
    previousEnd: Date,
    newStart: Date,
    newEnd: Date,
    reason: String,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    approvedAt: Date
  }],
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'cancelledByModel'
  },
  cancelledByModel: {
    type: String,
    enum: ['Patient', 'Practitioner', 'Admin']
  },
  cancelReason: String,
  cancelledAt: Date,
  aiMetadata: {
    recommendedByAI: { type: Boolean, default: false },
    confidenceScore: Number,
    schedulerNotes: String
  },
  conflictChecked: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Helpful indexes
sessionSchema.index({ practitionerId: 1, scheduledStart: 1 });
sessionSchema.index({ patientId: 1 });
sessionSchema.index({ centerId: 1 });
sessionSchema.index({ status: 1 });

export default mongoose.model('Session', sessionSchema);

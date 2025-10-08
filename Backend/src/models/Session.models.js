const mongoose = require('mongoose');

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
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Session', sessionSchema);
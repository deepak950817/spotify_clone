const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true
  },
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
  ratings: {
    overall: { type: Number, min: 1, max: 5, required: true },
    professionalism: { type: Number, min: 1, max: 5 },
    cleanliness: { type: Number, min: 1, max: 5 },
    effectiveness: { type: Number, min: 1, max: 5 },
    communication: { type: Number, min: 1, max: 5 }
  },
  comments: {
    strengths: String,
    improvements: String,
    additionalComments: String
  },
  tags: [String], // NLP extracted keywords
}, {
  timestamps: true
});

feedbackSchema.index({ sessionId: 1 });
feedbackSchema.index({ practitionerId: 1 });
feedbackSchema.index({ patientId: 1 });
feedbackSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
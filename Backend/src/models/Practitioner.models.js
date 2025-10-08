const mongoose = require('mongoose');

const practitionerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Practitioner name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    index:true,
    lowercase: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required']
  },
  passwordHash: {
    type: String,
    required: [true, 'Password hash is required']
  },
  role: {
    type: String,
    default: 'practitioner',
    enum: ['practitioner']
  },
  specialization: [{
    therapyType: String,
    index:true,
    yearsOfExperience: Number,
    certification: String,
    hourlyRate: Number
  }],
  experienceYears: {
    type: Number,
    min: 0,
    required: true
  },
  qualifications: [{
    degree: String,
    institution: String,
    year: Number,
    certificateUrl: String
  }],
  workingHours: [{
    dayOfWeek: { type: Number, min: 0, max: 6 },
    startTime: String,
    endTime: String,
    isActive: { type: Boolean, default: true }
  }],
  maxPatientsPerDay: {
    type: Number,
    default: 10,
    min: 1
  },
  durationEstimates: {
    type: Map,
    of: Number // therapyType -> duration in minutes
  },
  centerId: {
    type: mongoose.Schema.Types.ObjectId,
    index:true,
    ref: 'Center',
    required: true
  },
  bio: {
    type: String,
    maxlength: 500
  },
  languages: [{
    type: String,
    default: ['English', 'Hindi']
  }],
  ratings: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },
  profileImage: {
    url: String,
    publicId: String
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});



module.exports = mongoose.model('Practitioner', practitionerSchema);
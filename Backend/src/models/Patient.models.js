const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Patient name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    index: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    index: true,
    required: [true, 'Phone number is required'],
    match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number']
  },
  passwordHash: {
    type: String,
    required: [true, 'Password hash is required']
  },
  role: {
    type: String,
    default: 'patient',
    enum: ['patient']
  },
  gender: {
    type: String,
    required: true,
    enum: ['male', 'female', 'other']
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  medicalHistory: [{
    condition: String,
    diagnosisDate: Date,
    severity: { type: String, enum: ['low', 'medium', 'high'] },
    notes: String,
    isActive: { type: Boolean, default: true }
  }],
  therapyPreferences: [{
    therapyType: String,
    proficiencyLevel: { type: String, enum: ['beginner', 'intermediate', 'advanced'] }
  }],
  availability: [{
    dayOfWeek: { type: Number, index: true, min: 0, max: 6 }, // 0-Sunday, 1-Monday, etc.
    startTime: String, // HH:MM format
    endTime: String,
    isActive: { type: Boolean, default: true }
  }],
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' }
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },
  timezone: {
    type: String,
    default: 'Asia/Kolkata'
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

//  Indexes for better query performance
// patientSchema.index({ email: 1 });
// patientSchema.index({ phone: 1 });
// patientSchema.index({ 'availability.dayOfWeek': 1 });

module.exports = mongoose.model('Patient', patientSchema);
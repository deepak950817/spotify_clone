import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { userMethodsPlugin } from './UserMethods.js';

const practitionerSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Practitioner name is required'], trim: true },
  email: { type: String, required: [true, 'Email is required'], unique: true, index: true, lowercase: true },
  phone: { type: String, required: [true, 'Phone number is required'] },
  passwordHash: { type: String, required: [true, 'Password hash is required'] },
  role: { type: String, enum: ['practitioner'], default: 'practitioner' },
  specialization: [{
    therapyType: { type: String, index: true },
    yearsOfExperience: Number,
    certification: String,
    hourlyRate: Number
  }],
  experienceYears: { type: Number, min: 0, required: true },
  qualifications: [{
    degree: String,
    institution: String,
    year: Number,
    certificateUrl: String
  }],
  workingHours: {
  type: [{
    dayOfWeek: { type: Number, min: 0, max: 6 },
    startTime: String,
    endTime: String,
    isActive: { type: Boolean, default: true }
  }],
  validate: {
    validator: function(hours) {
      // Validate that for each item, endTime > startTime
      return hours.every(h =>
        !h.startTime || !h.endTime || h.startTime < h.endTime
      );
    },
    message: 'endTime must be greater than startTime for all days'
  }
}
,
  maxPatientsPerDay: { type: Number, default: 10, min: 1 },
  durationEstimates: { type: Map, of: Number }, 
  // durationEstimates: {
  //   "Abhyanga": 60,
  //   "Shirodhara": 45,
  //   "Nasya": 30
  // }
  // therapyType -> duration in minutes
  centerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Center', required: true, index: true },
  bio: { type: String, maxlength: 500 },
  languages: [{ type: String, default: ['English', 'Hindi'] }],
  ratings: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },
  profileImage: { url: String, publicId: String },
  refreshToken: { type: String, default: null },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});


practitionerSchema.methods.updateAverageRating = async function (newRating) {
  const total = this.ratings.average * this.ratings.count + newRating;
  this.ratings.count += 1;
  this.ratings.average = total / this.ratings.count;
  await this.save();
};

// Helpful indexes
practitionerSchema.index({ 'workingHours.dayOfWeek': 1, isActive: 1 });

practitionerSchema.plugin(userMethodsPlugin);

export default mongoose.model('Practitioner', practitionerSchema);

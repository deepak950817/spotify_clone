import mongoose from 'mongoose';
import { userMethodsPlugin } from './UserMethods.js';

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Admin name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    index:true
  },
  passwordHash: {
    type: String,
    required: [true, 'Password hash is required']
  },
  role: {
    type: String,
    default: 'admin',
    enum: ['admin', 'super_admin']
  },
  centerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center',
    required: true,
    index:true
  },
  permissions: [{
    module: String, // e.g., 'patients', 'practitioners', 'sessions'
    actions: [String] // e.g., ['create', 'read', 'update', 'delete']
  }],
  contactNumber: String,
  refreshToken: { type: String, default: null },
  profileImage: {
    url: String,
    publicId: String
  },
  lastLogin: Date,
  loginHistory: [{
    ipAddress: String,
    userAgent: String,
    timestamp: { type: Date, default: Date.now }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});


// attach shared auth methods
adminSchema.plugin(userMethodsPlugin);
export default mongoose.model('Admin', adminSchema);
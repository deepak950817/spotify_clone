import mongoose from 'mongoose';

const centerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Center name is required'],
    unique: true,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' }
  },
  contact: {
    phone: String,
    email: String
  },
  operatingHours: [{
    dayOfWeek: Number,
    openTime: String,
    closeTime: String,
    isOpen: Boolean
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.model('Center', centerSchema);
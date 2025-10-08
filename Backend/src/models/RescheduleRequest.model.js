const mongoose = require('mongoose');

const rescheduleRequestSchema = new mongoose.Schema({
  session: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Session", 
    required: true 
  },
  requestedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true 
  },
  requestedByRole: { 
    type: String, 
    enum: ["Patient", "Practitioner"], 
    required: true 
  },
  oldDate: { 
    type: Date, 
    required: true 
  },
  newDate: { 
    type: Date, 
    required: true 
  },
  reason: { 
    type: String 
  },
  status: { 
    type: String, 
    enum: ["Pending", "Approved", "Rejected"], 
    default: "Pending" 
  },
  reviewedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Admin" 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('RescheduleRequest', rescheduleRequestSchema);
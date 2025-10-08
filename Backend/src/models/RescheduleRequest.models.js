import mongoose from 'mongoose';

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
    type: String,
    maxlength: 300 
  },
  reviewNotes: { 
    type: String, 
    maxlength: 300 
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
  auditId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "AuditLog" 
  }
}, {
  timestamps: true
});

// Helpful indexes for filtering
rescheduleRequestSchema.index({ status: 1 });
rescheduleRequestSchema.index({ session: 1 });
rescheduleRequestSchema.index({ requestedBy: 1 });

export default mongoose.model("RescheduleRequest", rescheduleRequestSchema);

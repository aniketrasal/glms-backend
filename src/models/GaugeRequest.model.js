import mongoose from 'mongoose';

const gaugeRequestSchema = new mongoose.Schema({
  requestNo: { type: String, required: true, unique: true },
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  requesterName: { type: String, required: true },
  requesterEmail: { type: String },
  department: { type: String, required: true },
  gaugeType: { type: String, required: true },
  specificGaugeId: { type: String },
  assignedGaugeId: { type: String },      // set by admin on approval
  assignedGaugeName: { type: String },    // set by admin on approval
  purpose: { type: String, required: true },
  machine: { type: String },
  workOrder: { type: String },
  requiredFrom: { type: Date, required: true },
  requiredUntil: { type: Date, required: true },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Cancelled', 'Issued', 'ReturnRequested', 'Returned'],
    default: 'Pending'
  },
  issueId: { type: mongoose.Schema.Types.ObjectId, ref: 'GaugeIssue' },
  approverName: { type: String },
  approvedAt: { type: Date },
  rejectionReason: { type: String }
}, { timestamps: true });

export const GaugeRequest = mongoose.model('GaugeRequest', gaugeRequestSchema);

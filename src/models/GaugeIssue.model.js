import mongoose from 'mongoose';

const gaugeIssueSchema = new mongoose.Schema({
  issueNo: { type: String, required: true, unique: true },
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'GaugeRequest' },
  gaugeId: { type: String, required: true, index: true },
  gaugeName: { type: String, required: true },
  holderName: { type: String, required: true, index: true },
  employeeId: { type: String, required: true },
  department: { type: String, required: true },
  machine: { type: String, required: true },
  issuedBy: { type: String, required: true },
  issuedAt: { type: Date, default: Date.now },
  authorizedReturnAt: { type: Date, required: true },
  actualReturnAt: { type: Date },
  status: { type: String, enum: ['Active', 'Returned', 'Overdue', 'Lost'], default: 'Active' },
  escalationLevel: { type: Number, default: 0 },
  returnInspectionResult: { type: String, enum: ['OK', 'Minor Damage', 'Major Damage', 'Needs Calibration'] },
  notes: { type: String }
}, { timestamps: true });

export const GaugeIssue = mongoose.model('GaugeIssue', gaugeIssueSchema);

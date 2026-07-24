import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  user: { type: String, required: true },
  entity: { type: String, required: true },
  details: { type: String },
  ip: { type: String },
  timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);

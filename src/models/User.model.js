import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true, index: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    enum: ['super_admin', 'quality_admin', 'production_user', 'maintenance_user', 'process_engineer', 'calibration_team'],
    default: 'production_user'
  },
  department: { type: String, required: true },
  badgeQrCode: { type: String },
  activeGaugeCount: { type: Number, default: 0 },
  isRestricted: { type: Boolean, default: false },
  restrictedReason: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const User = mongoose.model('User', userSchema);

import mongoose from 'mongoose';

const gaugeSchema = new mongoose.Schema({
  gaugeId: { type: String, required: true, unique: true, index: true },
  assetNumber: { type: String },
  serialNumber: { type: String, required: true, unique: true },
  partNumber: { type: String },
  name: { type: String, required: true },
  category: { type: String, required: true },
  make: { type: String },
  model: { type: String },
  range: { type: String },
  resolution: { type: String },
  accuracy: { type: String },
  unit: { type: String, default: 'mm' },
  
  purchaseDate: { type: Date },
  purchaseCost: { type: Number },
  warrantyExpiry: { type: Date },

  status: {
    type: String,
    enum: [
      'Available', 'Reserved', 'Requested', 'Approved', 'Issued', 'In Use',
      'Transferred', 'Returned', 'Under Inspection', 'Calibration Due',
      'Under Calibration', 'Under Maintenance', 'Maintenance', 'Damaged', 'Retired',
      'Missing', 'Blocked', 'Overdue'
    ],
    default: 'Available',
    index: true
  },
  condition: { type: String, enum: ['New', 'Good', 'Fair', 'Poor'], default: 'Good' },
  
  homeLocation: { type: String },
  currentLocation: { type: String },
  currentHolder: { type: String },
  department: { type: String },
  machine: { type: String },

  qrCode: { type: String, unique: true },
  barcode: { type: String },

  calibrationFrequencyDays: { type: Number, default: 180 },
  lastCalibrationDate: { type: Date },
  nextCalibrationDue: { type: Date, index: true },
  calibrationStatus: { type: String, enum: ['Valid', 'Due Soon', 'Overdue', 'Under Calibration', 'N/A'], default: 'Valid' },

  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

gaugeSchema.index({ gaugeId: 'text', name: 'text', serialNumber: 'text', partNumber: 'text' });

export const Gauge = mongoose.model('Gauge', gaugeSchema);

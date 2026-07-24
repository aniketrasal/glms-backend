import { Gauge } from '../models/Gauge.model.js';
import { AuditLog } from '../models/AuditLog.model.js';
import { generateGaugeId } from '../utils/gaugeIdGenerator.js';
import QRCode from 'qrcode';

export const getGauges = async (req, res) => {
  try {
    const { q, category, status } = req.query;
    const filter = { isDeleted: { $ne: true } };

    if (q) {
      filter.$or = [
        { gaugeId: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } },
        { serialNumber: { $regex: q, $options: 'i' } },
        { partNumber: { $regex: q, $options: 'i' } },
        { currentHolder: { $regex: q, $options: 'i' } },
      ];
    }
    if (category && category !== 'All') {
      filter.category = category;
    }
    if (status && status !== 'All') {
      filter.status = status;
    }

    const gauges = await Gauge.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: gauges.length, data: gauges });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getGaugeById = async (req, res) => {
  try {
    const gauge = await Gauge.findById(req.params.id);
    if (!gauge) {
      // Try by gaugeId just in case
      const gaugeById = await Gauge.findOne({ gaugeId: req.params.id });
      if (!gaugeById) return res.status(404).json({ success: false, message: 'Gauge not found' });
      return res.json({ success: true, data: gaugeById });
    }
    res.json({ success: true, data: gauge });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createGauge = async (req, res) => {
  try {
    const body = req.body;
    const newId = generateGaugeId(body.category);
    const qrData = await QRCode.toDataURL(newId);

    const nextCal = new Date();
    const freq = Number(body.calibrationFrequencyDays) || 180;
    nextCal.setDate(nextCal.getDate() + freq);

    const gauge = new Gauge({
      gaugeId: newId,
      name: body.name,
      category: body.category,
      make: body.make,
      model: body.model,
      serialNumber: body.serialNumber,
      partNumber: body.partNumber,
      range: body.range,
      resolution: body.resolution,
      unit: body.unit || 'mm',
      purchaseCost: Number(body.purchaseCost) || 0,
      purchaseDate: body.purchaseDate || new Date(),
      homeLocation: body.homeLocation || 'Bldg A / Quality Store',
      currentLocation: body.homeLocation || 'Bldg A / Quality Store',
      status: 'Available',
      condition: body.condition || 'New',
      calibrationFrequencyDays: freq,
      lastCalibrationDate: new Date(),
      nextCalibrationDue: nextCal,
      calibrationStatus: 'Valid',
      qrCode: newId,
      barcode: body.barcode || newId,
    });

    await gauge.save();

    // Log action
    await AuditLog.create({
      action: 'GAUGE_CREATED',
      user: req.user ? `${req.user.name} (${req.user.role})` : 'System',
      entity: newId,
      details: `Registered new gauge: ${body.name}`,
      ip: req.ip || '127.0.0.1',
    });

    res.status(201).json({ success: true, data: gauge });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateGaugeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const gauge = await Gauge.findById(id);
    if (!gauge) return res.status(404).json({ success: false, message: 'Gauge not found' });

    gauge.status = status;
    await gauge.save();

    // Log action
    await AuditLog.create({
      action: 'STATUS_CHANGED',
      user: req.user ? `${req.user.name} (${req.user.role})` : 'System',
      entity: gauge.gaugeId,
      details: `Status changed to ${status}. Reason: ${reason || 'N/A'}`,
      ip: req.ip || '127.0.0.1',
    });

    res.json({ success: true, data: gauge });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteGauge = async (req, res) => {
  try {
    const { id } = req.params;
    const gauge = await Gauge.findById(id);
    if (!gauge) return res.status(404).json({ success: false, message: 'Gauge not found' });

    gauge.isDeleted = true;
    gauge.status = 'Retired';
    await gauge.save();

    // Log action
    await AuditLog.create({
      action: 'GAUGE_REMOVED',
      user: req.user ? `${req.user.name} (${req.user.role})` : 'System',
      entity: gauge.gaugeId,
      details: `Removed gauge from system`,
      ip: req.ip || '127.0.0.1',
    });

    res.json({ success: true, message: 'Gauge successfully retired/deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getGaugeByQr = async (req, res) => {
  try {
    const { qrCode } = req.params;
    const gauge = await Gauge.findOne({ $or: [{ gaugeId: qrCode }, { qrCode: qrCode }], isDeleted: { $ne: true } });
    if (!gauge) return res.status(404).json({ success: false, message: 'Gauge not found for scanned QR code' });
    res.json({ success: true, data: gauge });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadCalibrationCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const { certificateNo, calibrationDate, result } = req.body;

    const gauge = await Gauge.findById(id);
    if (!gauge) return res.status(404).json({ success: false, message: 'Gauge not found' });

    const calDate = new Date(calibrationDate);
    const nextCal = new Date(calDate);
    nextCal.setDate(nextCal.getDate() + (gauge.calibrationFrequencyDays || 180));

    gauge.lastCalibrationDate = calDate;
    gauge.nextCalibrationDue = nextCal;
    gauge.calibrationStatus = result === 'Fail' ? 'N/A' : 'Valid';
    if (result === 'Fail') {
      gauge.status = 'Damaged';
    } else {
      gauge.status = 'Available';
    }
    await gauge.save();

    // Log action
    await AuditLog.create({
      action: 'CALIBRATION_COMPLETED',
      user: req.user ? `${req.user.name} (${req.user.role})` : 'System',
      entity: gauge.gaugeId,
      details: `Calibration certificate #${certificateNo} uploaded. Result: ${result}`,
      ip: req.ip || '127.0.0.1',
    });

    res.json({ success: true, data: gauge });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

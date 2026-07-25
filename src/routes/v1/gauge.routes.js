import express from 'express';
import multer from 'multer';
import path from 'path';
import { getGauges, getGaugeById, createGauge, updateGaugeStatus, getGaugeByQr, deleteGauge, uploadCalibrationCertificate } from '../../controllers/gauge.controller.js';
import { protect } from '../../middleware/auth.middleware.js';

const router = express.Router();

// Multer — store PDF in memory, max 10MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only PDF and image files are allowed'));
  }
});

router.route('/')
  .get(protect, getGauges)
  .post(protect, createGauge);

router.get('/scan/:qrCode', protect, getGaugeByQr);

router.route('/:id')
  .get(protect, getGaugeById)
  .delete(protect, deleteGauge);

router.patch('/:id/status', protect, updateGaugeStatus);
router.post('/:id/calibration', protect, uploadCalibrationCertificate);

// Document upload — stores file as base64 in gauge document array
router.post('/:id/documents', protect, upload.single('file'), async (req, res) => {
  try {
    const { Gauge } = await import('../../models/Gauge.model.js');
    const { AuditLog } = await import('../../models/AuditLog.model.js');
    const gauge = await Gauge.findById(req.params.id);
    if (!gauge) return res.status(404).json({ success: false, message: 'Gauge not found' });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const doc = {
      name: req.body.name || req.file.originalname,
      type: req.body.docType || 'Calibration Certificate',
      mimeType: req.file.mimetype,
      data: req.file.buffer.toString('base64'),
      uploadedAt: new Date(),
      uploadedBy: req.user?.name || 'Admin',
      size: req.file.size,
    };

    if (!gauge.documents) gauge.documents = [];
    gauge.documents.push(doc);
    gauge.markModified('documents');
    await gauge.save();

    await AuditLog.create({
      action: 'DOCUMENT_UPLOADED',
      user: req.user?.name || 'Admin',
      entity: gauge.gaugeId,
      details: `Document uploaded: ${doc.name} (${doc.type})`,
      ip: req.ip || '127.0.0.1',
    });

    res.json({ success: true, message: 'Document uploaded successfully', data: { name: doc.name, type: doc.type, uploadedAt: doc.uploadedAt, size: doc.size } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get documents list for a gauge
router.get('/:id/documents', protect, async (req, res) => {
  try {
    const { Gauge } = await import('../../models/Gauge.model.js');
    const gauge = await Gauge.findById(req.params.id).select('documents gaugeId');
    if (!gauge) return res.status(404).json({ success: false, message: 'Gauge not found' });
    // Return metadata only (no base64 data)
    const docs = (gauge.documents || []).map((d, i) => ({
      index: i, name: d.name, type: d.type, mimeType: d.mimeType,
      uploadedAt: d.uploadedAt, uploadedBy: d.uploadedBy, size: d.size
    }));
    res.json({ success: true, data: docs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Download a specific document
router.get('/:id/documents/:index', protect, async (req, res) => {
  try {
    const { Gauge } = await import('../../models/Gauge.model.js');
    const gauge = await Gauge.findById(req.params.id).select('documents gaugeId name');
    if (!gauge) return res.status(404).json({ success: false, message: 'Gauge not found' });
    const doc = gauge.documents?.[req.params.index];
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    const buffer = Buffer.from(doc.data, 'base64');
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${doc.name}"`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

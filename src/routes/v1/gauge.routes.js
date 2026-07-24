import express from 'express';
import { getGauges, getGaugeById, createGauge, updateGaugeStatus, getGaugeByQr, deleteGauge, uploadCalibrationCertificate } from '../../controllers/gauge.controller.js';
import { protect } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getGauges)
  .post(protect, createGauge);

router.get('/scan/:qrCode', protect, getGaugeByQr);

router.route('/:id')
  .get(protect, getGaugeById)
  .delete(protect, deleteGauge);

router.patch('/:id/status', protect, updateGaugeStatus);
router.post('/:id/calibration', protect, uploadCalibrationCertificate);

export default router;

import express from 'express';
import {
  getRequests, createRequest, createPublicRequest,
  trackRequest, approveRequest, rejectRequest,
  confirmPickupByQr, initiateReturn
} from '../../controllers/request.controller.js';
import { protect } from '../../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.post('/public', createPublicRequest);
router.get('/track/:code', trackRequest);
router.post('/confirm-pickup', confirmPickupByQr);          // borrower scans QR
router.patch('/initiate-return/:requestNo', initiateReturn); // borrower clicks Return

// Protected routes
router.route('/')
  .get(protect, getRequests)
  .post(protect, createRequest);

router.patch('/:id/approve', protect, approveRequest);
router.patch('/:id/reject', protect, rejectRequest);

export default router;

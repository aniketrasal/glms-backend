import express from 'express';
import { getIssues, createIssue, returnIssue, getOverdueIssues, sendManualReminder, findIssueByGauge, sendReturnAlert } from '../../controllers/issue.controller.js';
import { protect } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getIssues)
  .post(protect, createIssue);

router.get('/overdue', protect, getOverdueIssues);
router.get('/find/:identifier', protect, findIssueByGauge);  // scan gauge to find active issue
router.post('/:id/remind', protect, sendManualReminder);
router.post('/:id/return-alert', protect, sendReturnAlert);  // send email alert to borrower
router.patch('/:id/return', protect, returnIssue);

export default router;

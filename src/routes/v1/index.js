import express from 'express';
import authRoutes from './auth.routes.js';
import gaugeRoutes from './gauge.routes.js';
import requestRoutes from './request.routes.js';
import issueRoutes from './issue.routes.js';
import userRoutes from './user.routes.js';
import { getDashboardOverview, getRecentActivities } from '../../controllers/analytics.controller.js';
import { AuditLog } from '../../models/AuditLog.model.js';
import { protect } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/gauges', gaugeRoutes);
router.use('/requests', requestRoutes);
router.use('/issues', issueRoutes);
router.use('/users', userRoutes);

// Analytics
router.get('/analytics/overview', getDashboardOverview);
router.get('/analytics/recent-activity', getRecentActivities);

// Audit Logs Route
router.get('/audit-logs', protect, async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ timestamp: -1 });
    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

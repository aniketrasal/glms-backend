import { Gauge } from '../models/Gauge.model.js';
import { GaugeIssue } from '../models/GaugeIssue.model.js';
import { GaugeRequest } from '../models/GaugeRequest.model.js';
import { AuditLog } from '../models/AuditLog.model.js';

export const getDashboardOverview = async (req, res) => {
  try {
    const totalGauges = await Gauge.countDocuments({ isDeleted: { $ne: true } });
    const available = await Gauge.countDocuments({ status: 'Available', isDeleted: { $ne: true } });
    const issued = await Gauge.countDocuments({ status: 'Issued', isDeleted: { $ne: true } });
    
    // For overdue issues, query from GaugeIssue
    const overdueCount = await GaugeIssue.countDocuments({
      status: { $in: ['Active', 'Overdue'] },
      authorizedReturnAt: { $lt: new Date() },
      actualReturnAt: null
    });
    
    const calibrationDue = await Gauge.countDocuments({ status: 'Calibration Due', isDeleted: { $ne: true } });
    const underCalibration = await Gauge.countDocuments({ status: 'Under Calibration', isDeleted: { $ne: true } });
    const damaged = await Gauge.countDocuments({ status: 'Damaged', isDeleted: { $ne: true } });
    const missing = await Gauge.countDocuments({ status: 'Missing', isDeleted: { $ne: true } });

    res.json({
      success: true,
      data: {
        totalGauges,
        available,
        issued,
        overdue: overdueCount,
        calibrationDue,
        underCalibration,
        damaged,
        missing
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getRecentActivities = async (req, res) => {
  try {
    const activities = await AuditLog.find().sort({ timestamp: -1 }).limit(10);
    
    // Map backend audit logs to frontend layout format
    const mapped = activities.map(act => {
      let icon = '📋';
      let color = 'info';
      if (act.action.includes('ISSUED')) { icon = '↗'; color = 'info'; }
      else if (act.action.includes('RETURNED')) { icon = '↩'; color = 'success'; }
      else if (act.action.includes('DAMAGE')) { icon = '⚠'; color = 'danger'; }
      else if (act.action.includes('CALIBRATION')) { icon = '🎯'; color = 'calibration'; }
      else if (act.action.includes('ESCALATION')) { icon = '⚠️'; color = 'warning'; }

      // Time formatting relative
      const diffMs = new Date() - new Date(act.timestamp);
      const diffMins = Math.floor(diffMs / 60000);
      let timeText = 'Just now';
      if (diffMins > 0 && diffMins < 60) timeText = `${diffMins}m ago`;
      else if (diffMins >= 60 && diffMins < 1440) timeText = `${Math.floor(diffMins / 60)}h ago`;
      else if (diffMins >= 1440) timeText = `${Math.floor(diffMins / 1440)}d ago`;

      return {
        id: act._id,
        type: act.action.toLowerCase(),
        icon,
        gaugeId: act.entity,
        text: act.action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '),
        detail: act.details,
        time: timeText,
        color
      };
    });

    res.json({ success: true, data: mapped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

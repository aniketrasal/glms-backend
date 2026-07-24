import { GaugeIssue } from '../models/GaugeIssue.model.js';
import { GaugeRequest } from '../models/GaugeRequest.model.js';
import { Gauge } from '../models/Gauge.model.js';
import { AuditLog } from '../models/AuditLog.model.js';
import { emailService } from '../services/email.service.js';

export const getIssues = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status && status !== 'all' ? { status } : {};
    const issues = await GaugeIssue.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: issues.length, data: issues });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin manually creates an issue (without QR scan flow)
export const createIssue = async (req, res) => {
  try {
    const { gaugeId, requestId, holderName, employeeId, department, machine, expectedReturnDate } = req.body;

    const gauge = await Gauge.findOne({ $or: [{ _id: gaugeId }, { gaugeId }] });
    if (!gauge) return res.status(404).json({ success: false, message: 'Gauge not found' });
    if (!['Available', 'Approved', 'Reserved'].includes(gauge.status)) {
      return res.status(400).json({ success: false, message: `Gauge is currently ${gauge.status}` });
    }

    const issueNo = `ISS-${Date.now().toString().slice(-6)}`;
    const issue = new GaugeIssue({
      issueNo, gaugeId: gauge.gaugeId, gaugeName: gauge.name,
      holderName, employeeId, department, machine,
      issuedBy: req.user.name,
      authorizedReturnAt: expectedReturnDate || new Date(Date.now() + 8 * 3600000),
      requestId: requestId || null,
    });
    await issue.save();

    gauge.status = 'Issued';
    gauge.currentHolder = holderName;
    gauge.department = department;
    gauge.machine = machine;
    await gauge.save();

    if (requestId) {
      await GaugeRequest.findByIdAndUpdate(requestId, { status: 'Issued', issueId: issue._id });
    }

    await AuditLog.create({
      action: 'GAUGE_ISSUED', user: req.user.name, entity: gauge.gaugeId,
      details: `Issued to ${holderName} for machine ${machine}`, ip: req.ip || '127.0.0.1',
    });

    res.status(201).json({ success: true, data: issue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin sends email alert to borrower to return gauge
export const sendReturnAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const issue = await GaugeIssue.findById(id);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

    // Find requester email from linked request
    let toEmail = null;
    if (issue.requestId) {
      const request = await GaugeRequest.findById(issue.requestId);
      if (request && request.requesterEmail) toEmail = request.requesterEmail;
    }

    const days = Math.max(0, Math.ceil((new Date() - new Date(issue.authorizedReturnAt)) / 86400000));
    await emailService.sendOverdueReminder(
      toEmail || 'rasalaniket00@gmail.com',
      issue.holderName, issue.gaugeId, issue.gaugeName, days
    );

    res.json({ success: true, message: `Return alert sent to ${issue.holderName}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin processes return after borrower brings gauge back
export const returnIssue = async (req, res) => {
  try {
    const { id } = req.params;
    const { returnInspectionResult, notes } = req.body;

    const issue = await GaugeIssue.findOne({
      $or: [{ _id: id }, { issueNo: id }, { gaugeId: id }],
      status: { $in: ['Active', 'Overdue'] }
    });
    if (!issue) return res.status(404).json({ success: false, message: 'Active issue not found' });

    const gauge = await Gauge.findOne({ gaugeId: issue.gaugeId });
    if (!gauge) return res.status(404).json({ success: false, message: 'Gauge not found' });

    issue.actualReturnAt = new Date();
    issue.status = 'Returned';
    issue.returnInspectionResult = returnInspectionResult || 'OK';
    issue.notes = notes;
    await issue.save();

    if (returnInspectionResult === 'Minor Damage') gauge.status = 'Under Maintenance';
    else if (returnInspectionResult === 'Major Damage') gauge.status = 'Damaged';
    else if (returnInspectionResult === 'Needs Calibration') { gauge.status = 'Calibration Due'; gauge.calibrationStatus = 'Overdue'; }
    else gauge.status = 'Available';

    gauge.currentHolder = null;
    gauge.department = null;
    gauge.machine = null;
    await gauge.save();

    // Close the linked request
    if (issue.requestId) {
      await GaugeRequest.findByIdAndUpdate(issue.requestId, { status: 'Returned' });
    }

    await AuditLog.create({
      action: 'GAUGE_RETURNED', user: req.user.name, entity: gauge.gaugeId,
      details: `Returned by ${issue.holderName}. Inspection: ${returnInspectionResult || 'OK'}. Notes: ${notes || 'N/A'}`,
      ip: req.ip || '127.0.0.1',
    });

    res.json({ success: true, data: issue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Returns page — find issue by gauge QR or gaugeId for scan-to-return
export const findIssueByGauge = async (req, res) => {
  try {
    const { identifier } = req.params;
    // identifier can be gaugeId or qrCode
    const gauge = await Gauge.findOne({
      $or: [{ gaugeId: identifier }, { qrCode: identifier }],
      isDeleted: { $ne: true }
    });
    if (!gauge) return res.status(404).json({ success: false, message: 'Gauge not found' });

    const issue = await GaugeIssue.findOne({ gaugeId: gauge.gaugeId, status: { $in: ['Active', 'Overdue'] } });
    if (!issue) return res.status(404).json({ success: false, message: 'No active issue found for this gauge' });

    res.json({ success: true, data: { issue, gauge } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOverdueIssues = async (req, res) => {
  try {
    const overdue = await GaugeIssue.find({
      status: { $in: ['Active', 'Overdue'] },
      authorizedReturnAt: { $lt: new Date() },
      actualReturnAt: null
    });
    res.json({ success: true, count: overdue.length, data: overdue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendManualReminder = sendReturnAlert;

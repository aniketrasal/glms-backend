import { GaugeRequest } from '../models/GaugeRequest.model.js';
import { GaugeIssue } from '../models/GaugeIssue.model.js';
import { Gauge } from '../models/Gauge.model.js';
import { AuditLog } from '../models/AuditLog.model.js';
import { emailService } from '../services/email.service.js';

export const getRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && status !== 'all') {
      filter.status = status.charAt(0).toUpperCase() + status.slice(1);
    }
    if (req.user && req.user.role !== 'quality_admin' && req.user.role !== 'super_admin') {
      filter.requesterName = req.user.name;
    }
    const requests = await GaugeRequest.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createRequest = async (req, res) => {
  try {
    const { gaugeType, specificGaugeId, purpose, machine, workOrder, requiredFrom, requiredUntil } = req.body;
    const requestNo = `REQ-${Date.now().toString().slice(-6)}`;

    const request = new GaugeRequest({
      requestNo,
      requesterId: req.user._id,
      requesterName: req.user.name,
      requesterEmail: req.user.email,
      department: req.user.department || 'Production',
      gaugeType, specificGaugeId, purpose, machine, workOrder,
      requiredFrom: requiredFrom || new Date(),
      requiredUntil: requiredUntil || new Date(Date.now() + 8 * 3600000),
    });

    await request.save();

    await AuditLog.create({
      action: 'REQUEST_CREATED', user: req.user.name, entity: requestNo,
      details: `Requested ${gaugeType} for machine ${machine}`, ip: req.ip || '127.0.0.1',
    });

    if (req.user.email) {
      await emailService.sendRequestConfirmation(req.user.email, req.user.name, requestNo, requestNo);
    }

    res.status(201).json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createPublicRequest = async (req, res) => {
  try {
    const { name, employeeId, email, department, gaugeType, purpose, machine, expectedDurationHours } = req.body;

    if (!name || !employeeId || !email || !gaugeType || !purpose || !machine) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
    }

    const requestNo = `REQ-${Date.now().toString().slice(-6)}`;
    const duration = Number(expectedDurationHours) || 8;

    const request = new GaugeRequest({
      requestNo,
      requesterName: `${name} (${employeeId})`,
      requesterEmail: email,
      department: department || 'Outsider',
      gaugeType, purpose, machine,
      requiredFrom: new Date(),
      requiredUntil: new Date(Date.now() + duration * 3600000),
      status: 'Pending'
    });

    await request.save();

    await AuditLog.create({
      action: 'PUBLIC_REQUEST_CREATED', user: `${name} (${employeeId})`, entity: requestNo,
      details: `Public request for ${gaugeType} on ${machine}`, ip: req.ip || '127.0.0.1',
    });

    await emailService.sendRequestConfirmation(email, name, requestNo, requestNo);

    res.status(201).json({ success: true, data: request, trackingCode: requestNo });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const trackRequest = async (req, res) => {
  try {
    const { code } = req.params;
    const request = await GaugeRequest.findOne({ requestNo: code });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    res.json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment, gaugeId } = req.body;

    const request = await GaugeRequest.findById(id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    // If a specific gauge was assigned, verify it is available
    if (gaugeId) {
      const gauge = await Gauge.findOne({ gaugeId, isDeleted: { $ne: true } });
      if (!gauge) return res.status(404).json({ success: false, message: 'Gauge not found' });
      if (gauge.status !== 'Available') {
        return res.status(400).json({
          success: false,
          message: `Gauge is currently ${gauge.status}. It cannot be assigned right now.`,
          gaugeStatus: gauge.status,
          currentHolder: gauge.currentHolder
        });
      }
      request.assignedGaugeId = gauge.gaugeId;
      request.assignedGaugeName = gauge.name;
      // Mark gauge as Reserved so no one else can take it
      gauge.status = 'Reserved';
      await gauge.save();
    }

    request.status = 'Approved';
    request.approverName = req.user.name;
    request.approvedAt = new Date();
    await request.save();

    await AuditLog.create({
      action: 'REQUEST_APPROVED', user: req.user.name, entity: request.requestNo,
      details: `Approved for ${request.requesterName}. Gauge: ${request.assignedGaugeId || 'TBD'}. Note: ${comment || 'None'}`,
      ip: req.ip || '127.0.0.1',
    });

    if (request.requesterEmail) {
      await emailService.sendRequestStatusUpdate(
        request.requesterEmail, request.requesterName, request.requestNo, 'Approved', comment
      );
    }

    res.json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const request = await GaugeRequest.findById(id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    // If a gauge was reserved for this request, free it
    if (request.assignedGaugeId) {
      await Gauge.findOneAndUpdate({ gaugeId: request.assignedGaugeId }, { status: 'Available' });
    }

    request.status = 'Rejected';
    request.rejectionReason = reason;
    await request.save();

    await AuditLog.create({
      action: 'REQUEST_REJECTED', user: req.user.name, entity: request.requestNo,
      details: `Rejected. Reason: ${reason}`, ip: req.ip || '127.0.0.1',
    });

    if (request.requesterEmail) {
      await emailService.sendRequestStatusUpdate(
        request.requesterEmail, request.requesterName, request.requestNo, 'Rejected', reason
      );
    }

    res.json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Called when borrower scans QR code after approval — creates the issue record
export const confirmPickupByQr = async (req, res) => {
  try {
    const { requestNo, qrCode } = req.body;

    const request = await GaugeRequest.findOne({ requestNo });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'Approved') {
      return res.status(400).json({ success: false, message: `Request is ${request.status}, not Approved` });
    }

    // Find gauge by QR or by assignedGaugeId
    const gauge = await Gauge.findOne({
      $or: [{ qrCode }, { gaugeId: request.assignedGaugeId }],
      isDeleted: { $ne: true }
    });
    if (!gauge) return res.status(404).json({ success: false, message: 'Gauge not found for this QR code' });

    // Verify QR matches assigned gauge
    if (request.assignedGaugeId && gauge.gaugeId !== request.assignedGaugeId) {
      return res.status(400).json({ success: false, message: 'QR code does not match the assigned gauge for this request' });
    }

    const issueNo = `ISS-${Date.now().toString().slice(-6)}`;
    const issue = new GaugeIssue({
      issueNo,
      gaugeId: gauge.gaugeId,
      gaugeName: gauge.name,
      holderName: request.requesterName,
      employeeId: request.requesterName,
      department: request.department,
      machine: request.machine || 'N/A',
      issuedBy: request.approverName || 'Quality Admin',
      authorizedReturnAt: request.requiredUntil,
      requestId: request._id,
    });
    await issue.save();

    // Update gauge
    gauge.status = 'Issued';
    gauge.currentHolder = request.requesterName;
    gauge.department = request.department;
    gauge.machine = request.machine;
    await gauge.save();

    // Update request
    request.status = 'Issued';
    request.issueId = issue._id;
    await request.save();

    await AuditLog.create({
      action: 'GAUGE_ISSUED', user: request.requesterName, entity: gauge.gaugeId,
      details: `Issued via QR scan. Request: ${request.requestNo}. Holder: ${request.requesterName}`,
      ip: req.ip || '127.0.0.1',
    });

    res.json({ success: true, data: { issue, gauge } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Called by borrower from PublicTrack page to initiate return
export const initiateReturn = async (req, res) => {
  try {
    const { requestNo } = req.params;

    const request = await GaugeRequest.findOne({ requestNo });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'Issued') {
      return res.status(400).json({ success: false, message: 'Gauge is not currently issued on this request' });
    }

    request.status = 'ReturnRequested';
    await request.save();

    await AuditLog.create({
      action: 'RETURN_INITIATED', user: request.requesterName, entity: request.assignedGaugeId || 'N/A',
      details: `Return initiated by borrower for request ${requestNo}`,
      ip: req.ip || '127.0.0.1',
    });

    res.json({ success: true, message: 'Return request submitted. Please bring the gauge to the Quality Store.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

import nodemailer from 'nodemailer';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';

let transporter = null;

if (config.emailUser && config.emailPass) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.emailUser,
      pass: config.emailPass,
    },
  });
} else {
  logger.warn('⚠️ Email credentials not set in env or .env. Emails will be logged to console instead.');
}

export const emailService = {
  sendEmail: async (to, subject, html) => {
    try {
      if (transporter) {
        await transporter.sendMail({
          from: `"GLMS Notification" <${config.emailUser}>`,
          to,
          subject,
          html,
        });
        logger.info(`✉️ Email sent successfully to ${to}`);
      } else {
        logger.info(`✉️ [MOCK EMAIL DISPATCH] To: ${to} | Subject: ${subject}`);
        logger.info(`Html Body:\n${html}`);
      }
      return true;
    } catch (error) {
      logger.error(`❌ Failed to send email to ${to}: ${error.message}`);
      return false;
    }
  },

  sendRequestConfirmation: async (toEmail, name, requestNo, trackingCode) => {
    const trackingLink = `${config.frontendUrl}/track/${trackingCode}`;
    const subject = `GLMS: Gauge Request Submitted - ${requestNo}`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #0f172a; color: #f1f5f9;">
        <h2 style="color: #3b82f6; text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Gauge Lifecycle Management System</h2>
        <p>Hello ${name},</p>
        <p>Your request to borrow a gauge has been successfully submitted to the Quality department.</p>
        <div style="background-color: #1e293b; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="margin: 0;"><strong>Request Number:</strong> ${requestNo}</p>
          <p style="margin: 5px 0 0 0;"><strong>Tracking Code:</strong> ${trackingCode}</p>
        </div>
        <p>You can track the live approval and return status of your request at any time using the link below:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${trackingLink}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Track Live Status</a>
        </p>
        <p style="color: #64748b; font-size: 12px; text-align: center;">This is an automated system notification. Please do not reply directly to this email.</p>
      </div>
    `;
    return emailService.sendEmail(toEmail, subject, html);
  },

  sendRequestStatusUpdate: async (toEmail, name, requestNo, status, comments) => {
    const subject = `GLMS: Gauge Request ${status} - ${requestNo}`;
    const statusColor = status === 'Approved' ? '#10b981' : '#ef4444';
    const trackingLink = `${config.frontendUrl}/track/${requestNo}`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #0f172a; color: #f1f5f9;">
        <h2 style="color: #3b82f6; text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">GLMS Request Update</h2>
        <p>Hello ${name},</p>
        <p>Your gauge request <strong>${requestNo}</strong> has been updated by the Quality Admin.</p>
        <div style="background-color: #1e293b; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid ${statusColor};">
          <p style="margin: 0; font-size: 16px;"><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${status}</span></p>
          ${comments ? `<p style="margin: 10px 0 0 0; color: #94a3b8;"><strong>Comments:</strong> ${comments}</p>` : ''}
        </div>
        <p>You can view full details here:</p>
        <p style="text-align: center; margin: 20px 0;">
          <a href="${trackingLink}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Details</a>
        </p>
      </div>
    `;
    return emailService.sendEmail(toEmail, subject, html);
  },

  sendOverdueReminder: async (toEmail, name, gaugeId, gaugeName, daysOverdue) => {
    const subject = `⚠️ UGENT GLMS: Overdue Gauge Return Reminder - ${gaugeId}`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #0f172a; color: #f1f5f9;">
        <h2 style="color: #ef4444; text-align: center; border-bottom: 2px solid #ef4444; padding-bottom: 10px;">⚠️ OVERDUE INSTRUMENT ALERT</h2>
        <p>Hello ${name},</p>
        <p>Our records show that you have not returned the following measuring instrument which is now past its return due date:</p>
        <div style="background-color: #1e293b; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <p style="margin: 0;"><strong>Instrument ID:</strong> ${gaugeId}</p>
          <p style="margin: 5px 0 0 0;"><strong>Instrument Name:</strong> ${gaugeName}</p>
          <p style="margin: 5px 0 0 0; color: #ef4444;"><strong>Days Overdue:</strong> ${daysOverdue} Day(s)</p>
        </div>
        <p style="font-weight: bold; color: #ef4444;">Please return this gauge to the Quality Store immediately to avoid escalation to your department supervisor.</p>
        <p>Thank you for your cooperation in maintaining our plant quality compliance standards.</p>
      </div>
    `;
    return emailService.sendEmail(toEmail, subject, html);
  }
};

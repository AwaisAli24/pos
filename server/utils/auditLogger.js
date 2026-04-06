const AuditLog = require('../models/AuditLog');
const nodemailer = require('nodemailer');

// Map action types to emoji icons for quick visual recognition in email inbox
const ACTION_ICONS = {
  LOGIN: '🔑',
  SALE_CREATED: '💰',
  SALE_EDITED: '✏️',
  SALE_DELETED: '🗑️',
  SALE_PARTIAL_REFUND: '↩️',
  SALE_REFUND: '↩️',
  PURCHASE_CREATED: '📦',
  PURCHASE_EDITED: '✏️',
  PURCHASE_DELETED: '🗑️',
  PRODUCT_ADDED: '➕',
  PRODUCT_UPDATED: '🔄',
  PRODUCT_DELETED: '🗑️',
  STOCK_ADJUSTED: '📊',
  EXPENSE_ADDED: '💸',
  EXPENSE_DELETED: '🗑️',
  EMPLOYEE_ADDED: '👤',
  EMPLOYEE_UPDATED: '✏️',
  EMPLOYEE_DELETED: '🗑️',
  ATTENDANCE_MARKED: '🕐',
  SUPPLIER_ADDED: '🏭',
  CUSTOMER_ADDED: '🧑',
  SETTINGS_UPDATED: '⚙️',
};

// Send activity notification email asynchronously (non-blocking)
const sendActivityEmail = async ({ action, userName, shopId, description, ip }) => {
  try {
    if (!process.env.MAILER_EMAIL || !process.env.MAILER_PASSWORD || !process.env.NOTIFY_EMAIL) return;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAILER_EMAIL,
        pass: process.env.MAILER_PASSWORD
      }
    });

    const icon = ACTION_ICONS[action] || '📋';
    const now = new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' });

    await transporter.sendMail({
      from: `"Tycoon POS Monitor" <${process.env.MAILER_EMAIL}>`,
      to: process.env.NOTIFY_EMAIL,
      subject: `${icon} [POS Alert] ${action.replace(/_/g, ' ')} — ${userName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #f1f5f9; margin: 0; padding: 20px; }
            .wrapper { max-width: 500px; margin: auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
            .header { background: #1e293b; padding: 20px 24px; display: flex; align-items: center; gap: 12px; }
            .header h2 { margin: 0; font-size: 18px; color: white; }
            .badge { background: #2563eb; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; display: inline-block; margin-top: 6px; }
            .body { padding: 24px; }
            .row { padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
            .row:last-child { border-bottom: none; }
            .label { color: #94a3b8; font-weight: 600; font-size: 12px; text-transform: uppercase; margin-bottom: 3px; }
            .value { color: #1e293b; font-weight: 600; }
            .desc { background: #f8fafc; border-left: 3px solid #2563eb; padding: 10px 14px; border-radius: 0 8px 8px 0; font-size: 14px; color: #334155; margin: 16px 0 4px; }
            .footer { background: #f8fafc; padding: 14px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="header">
              <div>
                <h2>${icon} POS Activity Alert</h2>
                <span class="badge">${action.replace(/_/g, ' ')}</span>
              </div>
            </div>
            <div class="body">
              <div class="row"><div class="label">User</div><div class="value">${userName}</div></div>
              <div class="row"><div class="label">Shop ID</div><div class="value">${shopId || 'N/A'}</div></div>
              <div class="row"><div class="label">Time (PKT)</div><div class="value">${now}</div></div>
              <div class="row"><div class="label">IP Address</div><div class="value">${ip || 'Unknown'}</div></div>
              <div class="desc">${description}</div>
            </div>
            <div class="footer">Tycoon POS — Automated Activity Monitor</div>
          </div>
        </body>
        </html>
      `
    });
  } catch (err) {
    // Non-critical — never crash the main request
    console.error('Activity email failed (non-critical):', err.message);
  }
};

const logAction = async (req, action, description) => {
  try {
    const newLog = new AuditLog({
      user: req.user.id,
      userName: req.user.fullName || 'Admin',
      shop: req.user.shopId,
      action: action,
      description: description,
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown'
    });
    await newLog.save();

    // Fire-and-forget: send email notification (does NOT block API response)
    sendActivityEmail({
      action,
      userName: req.user.fullName || 'Admin',
      shopId: req.user.shopId,
      description,
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown'
    });

  } catch (err) {
    console.error('Audit Log recording failed:', err.message);
  }
};

module.exports = { logAction };


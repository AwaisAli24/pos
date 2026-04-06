const nodemailer = require('nodemailer');

// Create a reusable transporter using Gmail SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAILER_EMAIL,
      pass: process.env.MAILER_PASSWORD // This is your Gmail App Password (NOT your normal password)
    }
  });
};

/**
 * Sends a welcome email to the newly registered shop owner
 * and a notification to Tycoon Technologies.
 */
const sendShopRegistrationEmails = async ({ ownerName, ownerEmail, shopName, shopCategory, shopPhone, shopAddress }) => {
  try {
    const transporter = createTransporter();
    const appUrl = process.env.APP_URL || 'https://your-pos-url.com';

    // ── EMAIL 1: Welcome email to the client ─────────────────────────────────
    const clientMailOptions = {
      from: `"Tycoon POS" <${process.env.MAILER_EMAIL}>`,
      to: ownerEmail,
      subject: `🎉 Welcome to Tycoon POS — Your shop "${shopName}" is ready!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #f1f5f9; margin: 0; padding: 0; }
            .wrapper { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
            .header { background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 40px 32px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 15px; }
            .body { padding: 36px 32px; }
            .greeting { font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 16px; }
            .text { color: #475569; font-size: 15px; line-height: 1.7; margin-bottom: 20px; }
            .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px 24px; margin: 24px 0; }
            .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }
            .info-row:last-child { border-bottom: none; }
            .info-label { color: #94a3b8; font-weight: 600; }
            .info-value { color: #1e293b; font-weight: 700; }
            .btn { display: inline-block; background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; margin-top: 8px; }
            .footer { background: #f8fafc; padding: 24px 32px; text-align: center; color: #94a3b8; font-size: 13px; border-top: 1px solid #e2e8f0; }
            .footer a { color: #2563eb; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="header">
              <h1>🚀 Welcome to Tycoon POS!</h1>
              <p>Your Point of Sale system is ready to use</p>
            </div>
            <div class="body">
              <p class="greeting">Hello ${ownerName},</p>
              <p class="text">
                Congratulations! Your shop has been successfully registered on <strong>Tycoon POS</strong>. 
                Your system is fully set up and ready to start managing sales, inventory, employees, and much more.
              </p>

              <div class="info-box">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="padding:8px 0; border-bottom:1px dashed #e2e8f0;">
                    <span style="color:#94a3b8; font-weight:600; font-size:14px;">Shop Name</span>
                    <br><strong style="color:#1e293b;">${shopName}</strong>
                  </td></tr>
                  <tr><td style="padding:8px 0; border-bottom:1px dashed #e2e8f0;">
                    <span style="color:#94a3b8; font-weight:600; font-size:14px;">Category</span>
                    <br><strong style="color:#1e293b;">${shopCategory || 'Retail'}</strong>
                  </td></tr>
                  <tr><td style="padding:8px 0; border-bottom:1px dashed #e2e8f0;">
                    <span style="color:#94a3b8; font-weight:600; font-size:14px;">Login Email</span>
                    <br><strong style="color:#2563eb;">${ownerEmail}</strong>
                  </td></tr>
                  <tr><td style="padding:8px 0;">
                    <span style="color:#94a3b8; font-weight:600; font-size:14px;">Address</span>
                    <br><strong style="color:#1e293b;">${shopAddress || 'Not provided'}</strong>
                  </td></tr>
                </table>
              </div>

              <p class="text">Click the button below to log in to your POS dashboard and start your journey:</p>
              <a href="${appUrl}" class="btn">Open My POS Dashboard →</a>

              <p class="text" style="margin-top: 28px;">
                If you need any help getting started, our support team is always ready to assist you.<br>
                📞 <strong>03060626699</strong> &nbsp;|&nbsp; 🌐 <a href="https://www.tycoon.technology" style="color:#2563eb;">www.tycoon.technology</a>
              </p>
            </div>
            <div class="footer">
              <p>This email was sent by <strong>Tycoon Technologies Pvt. Ltd. Islamabad</strong></p>
              <p><a href="https://www.tycoon.technology">www.tycoon.technology</a> &nbsp;|&nbsp; 03060626699</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // ── EMAIL 2: Internal notification to Tycoon Technologies ──────────────────
    const internalMailOptions = {
      from: `"Tycoon POS System" <${process.env.MAILER_EMAIL}>`,
      to: process.env.NOTIFY_EMAIL || process.env.MAILER_EMAIL, // Your internal email
      subject: `🆕 New Shop Registered: ${shopName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #f1f5f9; margin: 0; padding: 20px; }
            .wrapper { max-width: 500px; margin: auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
            .header { background: #1e293b; padding: 24px; text-align: center; color: white; }
            .header h2 { margin: 0; font-size: 20px; }
            .body { padding: 28px; }
            .row { padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
            .label { color: #94a3b8; font-weight: 600; margin-bottom: 4px; }
            .value { color: #1e293b; font-weight: 700; font-size: 15px; }
            .footer { background: #f8fafc; padding: 16px; text-align: center; color: #94a3b8; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="header">
              <h2>🆕 New Client Onboarded!</h2>
            </div>
            <div class="body">
              <div class="row"><div class="label">Shop Name</div><div class="value">${shopName}</div></div>
              <div class="row"><div class="label">Owner</div><div class="value">${ownerName}</div></div>
              <div class="row"><div class="label">Email</div><div class="value">${ownerEmail}</div></div>
              <div class="row"><div class="label">Phone</div><div class="value">${shopPhone || 'Not provided'}</div></div>
              <div class="row"><div class="label">Category</div><div class="value">${shopCategory || 'Retail'}</div></div>
              <div class="row"><div class="label">Address</div><div class="value">${shopAddress || 'Not provided'}</div></div>
              <div class="row" style="border:none"><div class="label">Registered At</div><div class="value">${new Date().toLocaleString()}</div></div>
            </div>
            <div class="footer">Tycoon POS — Automated Registration Alert</div>
          </div>
        </body>
        </html>
      `
    };

    // Send both emails concurrently (non-blocking)
    await Promise.all([
      transporter.sendMail(clientMailOptions),
      transporter.sendMail(internalMailOptions)
    ]);

    console.log(`✅ Registration emails sent to ${ownerEmail} and internal team.`);
  } catch (err) {
    // We log the error but never crash the registration flow
    console.error('❌ Email sending failed (non-critical):', err.message);
  }
};

module.exports = { sendShopRegistrationEmails };

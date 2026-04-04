const AuditLog = require('../models/AuditLog');

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
  } catch (err) {
    console.error('Audit Log recording failed:', err.message);
  }
};

module.exports = { logAction };

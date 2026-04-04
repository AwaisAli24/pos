const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  action: { type: String, required: true }, // e.g., 'SALE_CREATED', 'PRODUCT_EDITED', 'EXPENSE_DELETED'
  description: { type: String }, // e.g., 'Sold 5 items in Invoice INV-001'
  ip: { type: String },
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('AuditLog', auditLogSchema);

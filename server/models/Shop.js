const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, default: 'Retail' },
  phone: { type: String },
  address: { type: String },
  taxRate: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('Shop', shopSchema);

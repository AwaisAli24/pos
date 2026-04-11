const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  name: { type: String, required: true },
  phone: { type: String },
  email: { type: String },
  address: { type: String },
  totalSpent: { type: Number, default: 0 },
  totalDue: { type: Number, default: 0 }, // Current outstanding balance
  creditLimit: { type: Number, default: 50000 }, // Max debt allowed
  lastVisit: { type: Date }
}, {
  timestamps: true
});

module.exports = mongoose.model('Customer', customerSchema);

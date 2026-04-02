const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  name: { type: String, required: true },
  phone: { type: String },
  email: { type: String },
  address: { type: String },
  totalSpent: { type: Number, default: 0 },
  lastVisit: { type: Date }
}, {
  timestamps: true
});

module.exports = mongoose.model('Customer', customerSchema);

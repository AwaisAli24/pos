const mongoose = require('mongoose');

const loginLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  ip: { type: String },
  device: { type: String },
  loginTime: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('LoginLog', loginLogSchema);

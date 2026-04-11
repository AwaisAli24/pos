const mongoose = require('mongoose');

const customerLedgerSchema = new mongoose.Schema({
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' }, // Optional: Link to sale if applicable
  type: { type: String, enum: ['Sale', 'Payment', 'Return', 'Opening Balance'], required: true },
  description: { type: String },
  debit: { type: Number, default: 0 },   // Amount owed (increases debt)
  credit: { type: Number, default: 0 },  // Amount paid (decreases debt)
  balance: { type: Number, required: true }, // Resulting balance after this entry
  recordedBy: { type: String }           // Admin/User name
}, {
  timestamps: true
});

module.exports = mongoose.model('CustomerLedger', customerLedgerSchema);

const mongoose = require('mongoose');

const supplierLedgerSchema = new mongoose.Schema({
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  purchase: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase' }, // Optional: linked purchase
  type: { type: String, enum: ['Purchase', 'Payment', 'Return', 'Opening Balance'], required: true },
  description: { type: String },
  debit: { type: Number, default: 0 },   // Amount owed to supplier (increases debt)
  credit: { type: Number, default: 0 },  // Amount paid to supplier (decreases debt)
  balance: { type: Number, required: true }, // Running balance after this entry
  recordedBy: { type: String }
}, {
  timestamps: true
});

module.exports = mongoose.model('SupplierLedger', supplierLedgerSchema);

const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  name: { type: String, required: true, trim: true },
  contactPerson: { type: String, trim: true },
  phone: { type: String, trim: true },
  email: { type: String, trim: true },
  address: { type: String, trim: true },
  totalDue: { type: Number, default: 0 },       // Amount we currently owe this supplier
  totalPurchased: { type: Number, default: 0 }  // Lifetime purchase value from this supplier
}, {
  timestamps: true
});

supplierSchema.index({ shop: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Supplier', supplierSchema);


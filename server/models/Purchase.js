const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  barcode: { type: String },
  costPrice: { type: Number, required: true },
  qty: { type: Number, required: true, min: 1 },
  totalItemCost: { type: Number, required: true }
});

const purchaseSchema = new mongoose.Schema({
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  supplierName: { type: String, required: true }, // Denormalized name for easier querying
  items: [purchaseItemSchema],
  grandTotal: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['Paid', 'Pending', 'Returned', 'Partially Returned'], default: 'Paid' },
  invoiceNumber: { type: String } // Optional reference ID provided by actual external supplier
}, {
  timestamps: true
});

module.exports = mongoose.model('Purchase', purchaseSchema);

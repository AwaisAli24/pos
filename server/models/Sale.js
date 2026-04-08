const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  barcode: { type: String },
  salePrice: { type: Number, required: true },
  qty: { type: Number, required: true, min: 1 },
  totalItemPrice: { type: Number, required: true }
});

const saleSchema = new mongoose.Schema({
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  invoiceId: { type: String }, // Mnemonic recognizable identifier (e.g. INV-240403-001)
  cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String, default: 'Guest' },
  items: [saleItemSchema],
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['Cash', 'Card', 'Online'], default: 'Cash' },
  status: { type: String, enum: ['Completed', 'Refunded', 'Partially Refunded', 'Held'], default: 'Completed' },
  isModified: { type: Boolean, default: false },
  editHistory: [{
    modifiedAt: { type: Date, default: Date.now },
    modifiedBy: { type: String },
    items: [saleItemSchema],
    grandTotal: Number
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Sale', saleSchema);

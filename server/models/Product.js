const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  name: { type: String, required: true, trim: true },
  barcode: { type: String, required: true, index: true },
  category: { type: String, required: true },
  subCategory: { type: String, default: '' },
  costPrice: { type: Number, required: true, min: 0 },
  salePrice: { type: Number, required: true, min: 0 },
  currentStock: { type: Number, default: 0 },
  minStock: { type: Number, default: 10 },
  expiryDate: { type: Date, default: null },
  supplier: { type: String, default: 'Unknown' }
}, {
  timestamps: true
});

// A barcode must be unique only within its own specific shop
productSchema.index({ shop: 1, barcode: 1 }, { unique: true });

module.exports = mongoose.model('Product', productSchema);

const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema({
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  name: { type: String, required: true, trim: true },
  // Component products that make up this deal
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      productName: { type: String, required: true },
      qty: { type: Number, required: true, min: 1 }
    }
  ],
  dealPrice: { type: Number, required: true, min: 0 },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('Deal', dealSchema);

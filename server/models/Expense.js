const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  shop:          { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  title:         { type: String, required: true },
  amount:        { type: Number, required: true },
  category:      { type: String, enum: ['Rent', 'Utilities', 'Salaries', 'Supplies', 'Transport', 'Marketing', 'Maintenance', 'Other'], default: 'Other' },
  paymentMethod: { type: String, enum: ['Cash', 'Card', 'Online'], default: 'Cash' },
  date:          { type: Date, default: Date.now },
  notes:         { type: String },
  addedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  employee:      { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: false },
}, {
  timestamps: true
});

module.exports = mongoose.model('Expense', expenseSchema);

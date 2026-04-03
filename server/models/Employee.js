const mongoose = require('mongoose');

const referenceSchema = new mongoose.Schema({
  name: { type: String },
  phone: { type: String },
  relation: { type: String }
});

const employeeSchema = new mongoose.Schema({
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },

  // Personal Info
  fullName:   { type: String, required: true },
  phone:      { type: String },
  address:    { type: String },
  age:        { type: Number },
  photo:      { type: String }, // filename stored in server/employee-photos/

  // Professional Info
  jobTitle:   { type: String },
  joiningDate: { type: Date },
  leavingDate: { type: Date },
  status:     { type: String, enum: ['Active', 'Inactive', 'Terminated'], default: 'Active' },

  // Background
  education:  { type: String },
  experience: { type: String },
  references: [referenceSchema],

  // Financials
  salary:       { type: Number, default: 0 }, // Monthly salary
  advanceTaken: { type: Number, default: 0 }, // Total advance borrowed
  dueAmount:    { type: Number, default: 0 }, // Remaining to pay back
  benefits:     { type: String }, // e.g. "Health insurance, Transport allowance"
}, {
  timestamps: true
});

module.exports = mongoose.model('Employee', employeeSchema);

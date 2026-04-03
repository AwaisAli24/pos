const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  shop:     { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  date:     { type: String, required: true }, // "YYYY-MM-DD" format for easy lookup
  status:   { type: String, enum: ['Present', 'Absent', 'Late', 'Half-day', 'Holiday'], default: 'Present' },
  checkIn:  { type: String }, // "09:00 AM"
  checkOut: { type: String }, // "06:00 PM"
  notes:    { type: String },
}, {
  timestamps: true
});

// Ensure one record per employee per day
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);

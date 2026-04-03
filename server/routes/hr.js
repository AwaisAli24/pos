const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/authMiddleware');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');

// Photo upload setup
const photoDir = path.join(__dirname, '../employee-photos');
if (!fs.existsSync(photoDir)) fs.mkdirSync(photoDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, photoDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// ─── EMPLOYEES ───────────────────────────────────────────────────────────────

// GET all employees for this shop
router.get('/employees', auth, async (req, res) => {
  try {
    const employees = await Employee.find({ shop: req.user.shopId }).sort({ createdAt: -1 });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching employees.' });
  }
});

// GET single employee
router.get('/employees/:id', auth, async (req, res) => {
  try {
    const emp = await Employee.findOne({ _id: req.params.id, shop: req.user.shopId });
    if (!emp) return res.status(404).json({ message: 'Employee not found.' });
    res.json(emp);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching employee.' });
  }
});

// POST create employee (with optional photo)
router.post('/employees', auth, upload.single('photo'), async (req, res) => {
  try {
    if (req.user.role === 'User') return res.status(403).json({ message: 'Permission denied.' });

    const data = { ...req.body, shop: req.user.shopId };

    // Parse references JSON sent from frontend
    if (data.references && typeof data.references === 'string') {
      data.references = JSON.parse(data.references);
    }

    if (req.file) data.photo = req.file.filename;

    const emp = new Employee(data);
    const saved = await emp.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating employee.' });
  }
});

// PUT update employee
router.put('/employees/:id', auth, upload.single('photo'), async (req, res) => {
  try {
    if (req.user.role === 'User') return res.status(403).json({ message: 'Permission denied.' });

    const data = { ...req.body };
    if (data.references && typeof data.references === 'string') {
      data.references = JSON.parse(data.references);
    }
    if (req.file) data.photo = req.file.filename;

    const updated = await Employee.findOneAndUpdate(
      { _id: req.params.id, shop: req.user.shopId },
      { $set: data },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Employee not found.' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Error updating employee.' });
  }
});

// DELETE employee
router.delete('/employees/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'User') return res.status(403).json({ message: 'Permission denied.' });
    await Employee.findOneAndDelete({ _id: req.params.id, shop: req.user.shopId });
    res.json({ message: 'Employee removed.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting employee.' });
  }
});

// ─── ATTENDANCE ───────────────────────────────────────────────────────────────

// GET attendance for a specific date (default today)
router.get('/attendance', auth, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const records = await Attendance.find({ shop: req.user.shopId, date })
      .populate('employee', 'fullName jobTitle photo');
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching attendance.' });
  }
});

// GET attendance summary for an employee (for a month)
router.get('/attendance/:employeeId', auth, async (req, res) => {
  try {
    const { month } = req.query; // format: "2026-04"
    const query = { shop: req.user.shopId, employee: req.params.employeeId };
    if (month) {
      query.date = { $regex: `^${month}` };
    }
    const records = await Attendance.find(query).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching employee attendance.' });
  }
});

// POST / UPSERT attendance record for a day
router.post('/attendance', auth, async (req, res) => {
  try {
    const { employeeId, date, status, checkIn, checkOut, notes } = req.body;
    const record = await Attendance.findOneAndUpdate(
      { shop: req.user.shopId, employee: employeeId, date },
      { $set: { status, checkIn, checkOut, notes } },
      { new: true, upsert: true }
    );
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: 'Error saving attendance.' });
  }
});

module.exports = router;

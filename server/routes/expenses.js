const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/authMiddleware');
const Expense = require('../models/Expense');
const Employee = require('../models/Employee');

// GET all expenses (with optional date range & category filter)
router.get('/', auth, async (req, res) => {
  try {
    const { from, to, category } = req.query;
    const query = { shop: req.user.shopId };
    if (category) query.category = category;
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to)   query.date.$lte = new Date(to + 'T23:59:59');
    }
    const expenses = await Expense.find(query)
      .populate('addedBy', 'fullName')
      .populate('employee', 'fullName phone salary dueAmount')
      .sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching expenses.' });
  }
});

// POST add expense
router.post('/', auth, async (req, res) => {
  try {
    const { title, amount, category, paymentMethod, date, notes, employeeId, isAdvance, deductDebt } = req.body;
    const expense = new Expense({
      shop: req.user.shopId,
      addedBy: req.user.id,
      title, 
      amount: Number(amount), 
      category, 
      paymentMethod,
      date: date ? new Date(date) : new Date(),
      notes,
      employee: employeeId || null
    });
    const saved = await expense.save();

    // Smart logic for Salaries
    if (category === 'Salaries' && employeeId && mongoose.Types.ObjectId.isValid(employeeId)) {
      const emp = await Employee.findOne({ _id: employeeId, shop: req.user.shopId });
      console.log(`Processing Salary for ${emp?.fullName}. Advance: ${isAdvance}, DeductDebt: ${deductDebt}`);
      if (emp) {
        if (isAdvance) {
          emp.advanceTaken = (emp.advanceTaken || 0) + Number(amount);
          emp.dueAmount = (emp.dueAmount || 0) + Number(amount);
          await emp.save();
          console.log(`Updated Employee debt: ${emp.dueAmount}`);
        } else if (deductDebt) {
          emp.dueAmount = Math.max(0, (emp.dueAmount || 0) - Number(amount));
          await emp.save();
          console.log(`Reduced Employee debt: ${emp.dueAmount}`);
        }
      }
    }

    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: 'Error adding expense.' });
  }
});

// PUT update expense
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'User') return res.status(403).json({ message: 'Permission denied.' });
    const { title, amount, category, paymentMethod, date, notes, employeeId, isAdvance, deductDebt } = req.body;
    const updated = await Expense.findOneAndUpdate(
      { _id: req.params.id, shop: req.user.shopId },
      { $set: { 
          title, 
          amount: Number(amount), 
          category, 
          paymentMethod, 
          date: date ? new Date(date) : new Date(), 
          notes,
          employee: employeeId || null
        } 
      },
      { new: true }
    );

    // Smart logic for Salaries (same as POST)
    if (category === 'Salaries' && employeeId && mongoose.Types.ObjectId.isValid(employeeId)) {
      const emp = await Employee.findOne({ _id: employeeId, shop: req.user.shopId });
      if (emp) {
        if (isAdvance) {
          emp.advanceTaken = (emp.advanceTaken || 0) + Number(amount);
          emp.dueAmount = (emp.dueAmount || 0) + Number(amount);
          await emp.save();
        } else if (deductDebt) {
          emp.dueAmount = Math.max(0, (emp.dueAmount || 0) - Number(amount));
          await emp.save();
        }
      }
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Error updating expense.' });
  }
});

// DELETE expense
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'User') return res.status(403).json({ message: 'Permission denied.' });
    await Expense.findOneAndDelete({ _id: req.params.id, shop: req.user.shopId });
    res.json({ message: 'Expense deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting expense.' });
  }
});

module.exports = router;

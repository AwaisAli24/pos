const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const SupplierLedger = require('../models/SupplierLedger');
const auth = require('../middleware/authMiddleware');

// @route GET /api/suppliers
router.get('/', auth, async (req, res) => {
  try {
    const suppliers = await Supplier.find({ shop: req.user.shopId }).sort({ createdAt: -1 });
    res.json(suppliers);
  } catch (err) {
    res.status(500).send('Server Error retrieving suppliers');
  }
});

// @route GET /api/suppliers/:id/ledger
router.get('/:id/ledger', auth, async (req, res) => {
  try {
    const ledger = await SupplierLedger.find({
      shop: req.user.shopId,
      supplier: req.params.id
    }).sort({ createdAt: -1 });
    res.json(ledger);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching supplier ledger' });
  }
});

// @route POST /api/suppliers/:id/payment
// @desc Record a payment made TO a supplier (reduces what we owe them)
router.post('/:id/payment', auth, async (req, res) => {
  try {
    const { amount, paymentMethod, description } = req.body;
    const shopId = req.user.shopId;
    const supplierId = req.params.id;

    const supplier = await Supplier.findOne({ _id: supplierId, shop: shopId });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

    supplier.totalDue = Math.max(0, supplier.totalDue - parseFloat(amount));
    await supplier.save();

    const ledgerEntry = new SupplierLedger({
      shop: shopId,
      supplier: supplierId,
      type: 'Payment',
      description: description || `Payment via ${paymentMethod}`,
      credit: parseFloat(amount),
      balance: supplier.totalDue,
      recordedBy: req.user.fullName || 'Admin'
    });
    await ledgerEntry.save();

    res.json({ message: 'Payment recorded successfully', supplier });
  } catch (err) {
    res.status(500).json({ message: 'Error processing supplier payment' });
  }
});

// @route POST /api/suppliers
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role === 'User') {
      return res.status(403).json({ message: 'Permission Denied. Cashiers cannot add suppliers.' });
    }
    const { name, contactPerson, phone, email, address } = req.body;
    const shopId = req.user.shopId;
    let existing = await Supplier.findOne({ shop: shopId, name });
    if (existing) return res.status(400).json({ message: 'A supplier with this name already exists.' });
    const saved = await new Supplier({ shop: shopId, name, contactPerson, phone, email, address }).save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).send('Server Error adding supplier');
  }
});

// @route PUT /api/suppliers/:id
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'User') return res.status(403).json({ message: 'Permission Denied.' });
    const { name, contactPerson, phone, email, address } = req.body;
    let supplier = await Supplier.findOne({ _id: req.params.id, shop: req.user.shopId });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found.' });
    if (name) supplier.name = name;
    if (contactPerson !== undefined) supplier.contactPerson = contactPerson;
    if (phone !== undefined) supplier.phone = phone;
    if (email !== undefined) supplier.email = email;
    if (address !== undefined) supplier.address = address;
    res.json(await supplier.save());
  } catch (err) {
    res.status(500).send('Server Error updating supplier');
  }
});

// @route DELETE /api/suppliers/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'User') return res.status(403).json({ message: 'Permission Denied.' });
    const supplier = await Supplier.findOneAndDelete({ _id: req.params.id, shop: req.user.shopId });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found.' });
    res.json({ message: 'Supplier removed.' });
  } catch (err) {
    res.status(500).send('Server Error deleting supplier');
  }
});

module.exports = router;

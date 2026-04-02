const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const auth = require('../middleware/authMiddleware');

// @route GET /api/suppliers
// @desc Get all suppliers scoped to the logged-in Shop
router.get('/', auth, async (req, res) => {
  try {
    const suppliers = await Supplier.find({ shop: req.user.shopId }).sort({ createdAt: -1 });
    res.json(suppliers);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error retrieving suppliers');
  }
});

// @route POST /api/suppliers
// @desc Add a new supplier to shop
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role === 'User') {
      return res.status(403).json({ message: 'Permission Denied. Cashiers cannot add suppliers.' });
    }

    const { name, contactPerson, phone, email, address } = req.body;
    const shopId = req.user.shopId;

    let existingSupplier = await Supplier.findOne({ shop: shopId, name });
    if (existingSupplier) {
      return res.status(400).json({ message: 'A supplier with this name already exists in your system.' });
    }

    const newSupplier = new Supplier({
      shop: shopId,
      name,
      contactPerson,
      phone,
      email,
      address
    });

    const savedSupplier = await newSupplier.save();
    res.status(201).json(savedSupplier);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error adding supplier');
  }
});

// @route PUT /api/suppliers/:id
// @desc Update an existing supplier
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'User') {
      return res.status(403).json({ message: 'Permission Denied. Cashiers cannot edit suppliers.' });
    }

    const { name, contactPerson, phone, email, address } = req.body;
    let supplier = await Supplier.findOne({ _id: req.params.id, shop: req.user.shopId });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found.' });

    if (name) supplier.name = name;
    if (contactPerson !== undefined) supplier.contactPerson = contactPerson;
    if (phone !== undefined) supplier.phone = phone;
    if (email !== undefined) supplier.email = email;
    if (address !== undefined) supplier.address = address;

    const updatedSupplier = await supplier.save();
    res.json(updatedSupplier);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error updating supplier');
  }
});

// @route DELETE /api/suppliers/:id
// @desc Remove a supplier from the shop
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'User') {
      return res.status(403).json({ message: 'Permission Denied. Cashiers cannot delete suppliers.' });
    }

    const supplier = await Supplier.findOneAndDelete({ _id: req.params.id, shop: req.user.shopId });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found.' });

    res.json({ message: 'Supplier successfully removed from system.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error deleting supplier');
  }
});

module.exports = router;

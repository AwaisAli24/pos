const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const auth = require('../middleware/authMiddleware');

// Get all customers
router.get('/', auth, async (req, res) => {
  try {
    const customers = await Customer.find({ shop: req.user.shopId }).sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching customers' });
  }
});

// Create a new customer
router.post('/', auth, async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;
    const newCustomer = new Customer({
      shop: req.user.shopId,
      name, phone, email, address
    });
    await newCustomer.save();
    res.json(newCustomer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating customer' });
  }
});

// Update customer details
router.put('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
       { _id: req.params.id, shop: req.user.shopId },
       { $set: req.body },
       { new: true }
    );
    res.json(customer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating customer' });
  }
});

module.exports = router;

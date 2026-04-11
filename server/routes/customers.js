const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const CustomerLedger = require('../models/CustomerLedger');
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

// Get ledger for a specific customer
router.get('/:id/ledger', auth, async (req, res) => {
  try {
    const ledger = await CustomerLedger.find({ 
      shop: req.user.shopId, 
      customer: req.params.id 
    }).sort({ createdAt: -1 });
    res.json(ledger);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching ledger' });
  }
});

// Record a manual payment for a customer
router.post('/:id/payment', auth, async (req, res) => {
  try {
    const { amount, paymentMethod, description } = req.body;
    const shopId = req.user.shopId;
    const customerId = req.params.id;

    const customer = await Customer.findOne({ _id: customerId, shop: shopId });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    // Update balance
    customer.totalDue -= parseFloat(amount);
    await customer.save();

    // Create Ledger Entry
    const newLedger = new CustomerLedger({
      shop: shopId,
      customer: customerId,
      type: 'Payment',
      description: description || `Manual Payment via ${paymentMethod}`,
      credit: parseFloat(amount),
      balance: customer.totalDue,
      recordedBy: req.user.fullName || 'Admin'
    });
    await newLedger.save();

    res.json({ message: 'Payment recorded successfully', customer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error processing payment' });
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

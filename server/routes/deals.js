const express = require('express');
const router = express.Router();
const Deal = require('../models/Deal');
const Product = require('../models/Product');
const auth = require('../middleware/authMiddleware');
const { logAction } = require('../utils/auditLogger');

// @route GET /api/deals
// @desc Get all active deals for this shop
router.get('/', auth, async (req, res) => {
  try {
    const deals = await Deal.find({ shop: req.user.shopId }).sort({ createdAt: -1 });
    res.json(deals);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error fetching deals.' });
  }
});

// @route POST /api/deals
// @desc Create a new deal bundle
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role === 'User') {
      return res.status(403).json({ message: 'Permission Denied. Cashiers cannot create deals.' });
    }

    const { name, items, dealPrice } = req.body;
    const shopId = req.user.shopId;

    if (!name || !items || items.length === 0 || !dealPrice) {
      return res.status(400).json({ message: 'Deal name, at least one product, and a deal price are required.' });
    }

    // Validate all component products belong to this shop
    for (const item of items) {
      const product = await Product.findOne({ _id: item.product, shop: shopId });
      if (!product) {
        return res.status(400).json({ message: `Product not found or does not belong to your shop.` });
      }
    }

    const newDeal = new Deal({ shop: shopId, name, items, dealPrice });
    const savedDeal = await newDeal.save();

    await logAction(req, 'DEAL_CREATED', `Created deal: "${name}" @ Rs. ${dealPrice}`);
    res.status(201).json(savedDeal);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error creating deal.' });
  }
});

// @route PUT /api/deals/:id
// @desc Update an existing deal
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'User') {
      return res.status(403).json({ message: 'Permission Denied.' });
    }

    const { name, items, dealPrice, isActive } = req.body;
    const deal = await Deal.findOne({ _id: req.params.id, shop: req.user.shopId });
    if (!deal) return res.status(404).json({ message: 'Deal not found.' });

    if (name !== undefined) deal.name = name;
    if (items !== undefined) deal.items = items;
    if (dealPrice !== undefined) deal.dealPrice = dealPrice;
    if (isActive !== undefined) deal.isActive = isActive;

    const updated = await deal.save();
    await logAction(req, 'DEAL_UPDATED', `Updated deal: "${deal.name}"`);
    res.json(updated);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error updating deal.' });
  }
});

// @route DELETE /api/deals/:id
// @desc Delete a deal
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'User') {
      return res.status(403).json({ message: 'Permission Denied.' });
    }

    const deal = await Deal.findOneAndDelete({ _id: req.params.id, shop: req.user.shopId });
    if (!deal) return res.status(404).json({ message: 'Deal not found.' });

    await logAction(req, 'DEAL_DELETED', `Deleted deal: "${deal.name}"`);
    res.json({ message: 'Deal deleted.', _id: deal._id });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error deleting deal.' });
  }
});

module.exports = router;

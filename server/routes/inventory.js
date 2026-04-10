const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const auth = require('../middleware/authMiddleware');
const { logAction } = require('../utils/auditLogger');

// @route GET /api/inventory
// @desc Get all products scoped to the logged-in Shop
router.get('/', auth, async (req, res) => {
  try {
    const products = await Product.find({ shop: req.user.shopId }).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route POST /api/inventory
// @desc Add a new product to shop's inventory
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role === 'User') {
      return res.status(403).json({ message: 'Permission Denied. Cashiers cannot add inventory products.' });
    }

    const { barcode, name, category, subCategory, costPrice, salePrice, currentStock, minStock, unitOfMeasure, expiryDate, supplier } = req.body;
    const shopId = req.user.shopId;

    let existingProduct = await Product.findOne({ shop: shopId, barcode });
    if (existingProduct) {
      return res.status(400).json({ message: 'A product with this barcode already exists in your shop.' });
    }

    const newProduct = new Product({
      shop: shopId,
      barcode,
      name,
      category,
      subCategory: subCategory || '',
      costPrice,
      salePrice,
      currentStock,
      minStock,
      unitOfMeasure: unitOfMeasure || 'Pieces',
      expiryDate,
      supplier: supplier || 'Unknown'
    });

    const savedProduct = await newProduct.save();
    
    await logAction(req, 'PRODUCT_CREATED', `Added new product: ${name} (${barcode})`);

    res.status(201).json(savedProduct);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route PUT /api/inventory/:id
// @desc Update product stock or pricing
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'User') {
      return res.status(403).json({ message: 'Permission Denied. Cashiers cannot edit stock.' });
    }

    const { name, category, subCategory, currentStock, salePrice, costPrice, minStock, unitOfMeasure, expiryDate, supplier } = req.body;
    let product = await Product.findOne({ _id: req.params.id, shop: req.user.shopId });
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    if (name !== undefined) product.name = name;
    if (category !== undefined) product.category = category;
    if (subCategory !== undefined) product.subCategory = subCategory;
    if (currentStock !== undefined) product.currentStock = currentStock;
    if (salePrice !== undefined) product.salePrice = salePrice;
    if (costPrice !== undefined) product.costPrice = costPrice;
    if (minStock !== undefined) product.minStock = minStock;
    if (unitOfMeasure !== undefined) product.unitOfMeasure = unitOfMeasure;
    if (expiryDate !== undefined) product.expiryDate = expiryDate;
    if (supplier !== undefined) product.supplier = supplier;

    const updatedProduct = await product.save();
    
    await logAction(req, 'PRODUCT_UPDATED', `Updated parameters for ${product.name}`);

    res.json(updatedProduct);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error updating product.');
  }
});

// @route DELETE /api/inventory/:id
// @desc Admins securely purge discontinued stock physically from DB natively.
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'User') {
      return res.status(403).json({ message: 'Permission Denied. Cashiers cannot purge items.' });
    }
    const product = await Product.findOneAndDelete({ _id: req.params.id, shop: req.user.shopId });
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    await logAction(req, 'PRODUCT_DELETED', `Permanently erased product: ${product.name}`);

    res.json({ message: 'Product securely erased.', _id: product._id });
  } catch (err) {
    console.error('Del Error:', err.message);
    res.status(500).send('Server Error processing erasure.');
  }
});

module.exports = router;

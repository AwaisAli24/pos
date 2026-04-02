const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const auth = require('../middleware/authMiddleware');

// @route POST /api/sales
// @desc Process checkout, dynamically reduce inventory, create permanent log explicitly securely.
router.post('/', auth, async (req, res) => {
  try {
    const { items, subtotal, discount, grandTotal, paymentMethod, customer_id, customerName } = req.body;
    const shopId = req.user.shopId;
    const cashierId = req.user.id;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty. Cannot process sale.' });
    }

    // 1. Map frontend items to DB Schema requirements
    const formattedItems = items.map(item => ({
      product: item._id, 
      name: item.name,
      barcode: item.barcode,
      salePrice: item.salePrice,
      qty: item.qty,
      totalItemPrice: item.salePrice * item.qty
    }));

    // 2. Validate Inventory Limits Before Processing Checkout
    for (const item of formattedItems) {
      const dbProduct = await Product.findById(item.product);
      if (!dbProduct) {
        return res.status(400).json({ message: `Product ${item.name} no longer exists in Database.` });
      }
      if (dbProduct.currentStock < item.qty) {
        return res.status(400).json({ message: `Cannot process sale: ${item.name} only has ${dbProduct.currentStock} units left in stock.` });
      }
    }

    // 3. Log the completed official sale receipt mapping to this Shop and Cashier
    const newSale = new Sale({
      shop: shopId,
      cashier: cashierId,
      customer: customer_id || undefined,
      customerName: customerName || 'Guest',
      items: formattedItems,
      subtotal,
      discount: discount || 0,
      grandTotal,
      paymentMethod: paymentMethod || 'Cash',
      status: 'Completed'
    });

    const savedSale = await newSale.save();

    // CRM Tracking: Increment customer wallet natively if registered dynamically smoothly
    if (customer_id) {
      const Customer = require('../models/Customer');
      await Customer.findByIdAndUpdate(customer_id, {
        $inc: { totalSpent: grandTotal },
        lastVisit: new Date()
      });
    }

    // 4. Dynamically deduct the stock quantities from the main inventory MongoDB table
    for (const item of items) {
      // Find the specific item and atomically decrease its currentStock field using $inc
      await Product.findByIdAndUpdate(item._id, {
        $inc: { currentStock: -item.qty }
      });
    }

    res.status(201).json({ message: 'Transaction Processed successfully!', sale: savedSale });
  } catch (err) {
    console.error('Checkout Error:', err.message);
    res.status(500).json({ message: 'Server error processing checkout.' });
  }
});

// @route GET /api/sales
// @desc Get recent sales history for the shop dashboard
router.get('/', auth, async (req, res) => {
  try {
    const sales = await Sale.find({ shop: req.user.shopId })
      .populate('cashier', 'fullName')
      .sort({ createdAt: -1 });
    res.json(sales);
  } catch (err) {
    res.status(500).send('Server error retrieving sales history.');
  }
});

// @route POST /api/sales/:id/refund
// @desc Process a refund for a sale & restore inventory
router.post('/:id/refund', auth, async (req, res) => {
  try {
    const saleId = req.params.id;
    const shopId = req.user.shopId;

    if (req.user.role === 'User') {
      return res.status(403).json({ message: 'Permission Denied. Cashiers cannot process refunds.' });
    }

    const sale = await Sale.findOne({ _id: saleId, shop: shopId });
    if (!sale) return res.status(404).json({ message: 'Sale record not found.' });
    
    if (sale.status === 'Refunded') {
      return res.status(400).json({ message: 'This transaction has already been refunded.' });
    }

    for (const item of sale.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { currentStock: item.qty }
      });
    }

    sale.status = 'Refunded';
    await sale.save();

    res.json({ message: 'Refund successful, stock restored.', sale });
  } catch (err) {
    console.error('Refund Error:', err.message);
    res.status(500).json({ message: 'Server error processing refund.' });
  }
});

// @route POST /api/sales/:id/partial-refund
// @desc Process a partial refund returning specific fractional amounts of an order safely
router.post('/:id/partial-refund', auth, async (req, res) => {
  try {
    const saleId = req.params.id;
    const { refundItems } = req.body; // Array of { product_id, returnQty }

    if (req.user.role === 'User') {
      return res.status(403).json({ message: 'Permission Denied.' });
    }

    if (!refundItems || !Array.isArray(refundItems)) {
       return res.status(400).json({ message: 'Malformed refund items payload array' });
    }

    const sale = await Sale.findOne({ _id: saleId, shop: req.user.shopId });
    if (!sale) return res.status(404).json({ message: 'Sale record not found.' });
    if (sale.status === 'Refunded') return res.status(400).json({ message: 'Fully refunded.' });

    let hasRemainingItems = false;
    let newSubtotal = 0;

    for (let currentItem of sale.items) {
      // Find matching item using either Mongoose ObjectId or internal sub-document _id
      const refundTarget = refundItems.find(r => r.product_id === String(currentItem.product) || r.product_id === String(currentItem._id));
      
      if (refundTarget && refundTarget.returnQty > 0) {
        if (refundTarget.returnQty > currentItem.qty) {
          return res.status(400).json({ message: `Cannot return more than originally purchased for ${currentItem.name}` });
        }
        
        // 1. Physically restock the inventory natively using $inc logic incrementally safely
        await Product.findByIdAndUpdate(currentItem.product, {
          $inc: { currentStock: refundTarget.returnQty }
        });

        // 2. Mathematically decrement the original static invoice quantities
        currentItem.qty -= refundTarget.returnQty;
        currentItem.totalItemPrice = currentItem.qty * currentItem.salePrice;
      }
      
      if (currentItem.qty > 0) hasRemainingItems = true;
      newSubtotal += currentItem.totalItemPrice;
    }

    // Recalculate the native global invoice structure
    sale.subtotal = newSubtotal;
    if (sale.discount > sale.subtotal) {
       sale.discount = sale.subtotal; // Prevents negative total logic bugs cleanly 
    }
    
    sale.grandTotal = sale.subtotal - sale.discount;

    if (!hasRemainingItems) {
      sale.status = 'Refunded'; // Mathematically fully refunded via partial steps smoothly!
    } else {
      sale.status = 'Partially Refunded';
    }

    await sale.save();
    res.json({ message: 'Partial Return mathematically synced. Items restocked!', sale });

  } catch (err) {
    console.error('Partial Refund Error:', err.message);
    res.status(500).json({ message: 'Server error natively processing partial returns.' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const SupplierLedger = require('../models/SupplierLedger');
const auth = require('../middleware/authMiddleware');
const { logAction } = require('../utils/auditLogger');

// @route GET /api/purchases
// @desc Get recent purchase order history for the active shop
router.get('/', auth, async (req, res) => {
  try {
    const purchases = await Purchase.find({ shop: req.user.shopId })
      .populate('admin', 'fullName')
      .sort({ createdAt: -1 });
    res.json(purchases);
  } catch (err) {
    res.status(500).send('Server error retrieving purchase history.');
  }
});

// @route POST /api/purchases
// @desc Create a new Purchase Order (Restock) & mathematically increment inventory levels
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role === 'User') {
      return res.status(403).json({ message: 'Permission Denied. Cashiers cannot officially restock inventory.' });
    }

    const { supplier, supplierName, items, grandTotal, paymentStatus, invoiceNumber } = req.body;
    const shopId = req.user.shopId;
    const adminId = req.user.id;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Purchase Order is empty.' });
    }

    // 1. Structure the PO mapping natively to Mongoose schema validations
    const newPurchase = new Purchase({
      shop: shopId,
      admin: adminId,
      supplier,
      supplierName,
      items: items.map(i => ({
        product: i.product_id, // Map exactly to physical Product Mongo UI UUID
        name: i.name,
        barcode: i.barcode,
        costPrice: i.costPrice,
        qty: i.qty,
        totalItemCost: i.costPrice * i.qty
      })),
      grandTotal,
      paymentStatus: paymentStatus || 'Paid',
      invoiceNumber: invoiceNumber || ''
    });

    const savedPurchase = await newPurchase.save();

    // 2. Atomically inject mathematical stock increments
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product_id, {
        $inc: { currentStock: item.qty }
      }, { new: true });
    }

    // 3. If purchased on credit, update supplier balance & ledger
    if ((paymentStatus === 'Credit' || paymentStatus === 'Pending') && supplier) {
      const supplierDoc = await Supplier.findOne({ _id: supplier, shop: shopId });
      if (supplierDoc) {
        supplierDoc.totalDue += grandTotal;
        supplierDoc.totalPurchased += grandTotal;
        await supplierDoc.save();

        await new SupplierLedger({
          shop: shopId,
          supplier: supplier,
          purchase: savedPurchase._id,
          type: 'Purchase',
          description: `Credit Purchase - Invoice: ${invoiceNumber || savedPurchase._id}`,
          debit: grandTotal,
          balance: supplierDoc.totalDue,
          recordedBy: req.user.fullName || 'Admin'
        }).save();
      }
    } else if (supplier) {
      // Even for paid purchases, track total purchased
      await Supplier.findOneAndUpdate(
        { _id: supplier, shop: shopId },
        { $inc: { totalPurchased: grandTotal } }
      );
    }

    // 4. Log the official restock action
    await logAction(req, 'PURCHASE_CREATED', `Restocked inventory from ${supplierName}. Invoice: ${invoiceNumber || 'N/A'} (Total: Rs. ${grandTotal.toLocaleString()})`);
    
    res.status(201).json({ message: 'Purchase Order officially generated & Inventory magically incremented!', purchase: savedPurchase });
  } catch (err) {
    console.error('Purchase Order Error:', err.message);
    res.status(500).json({ message: 'Server crash manipulating purchase records.' });
  }
});

// @route POST /api/purchases/:id/refund
// @desc Process a supplier Return, decrementing inventory back safely
router.post('/:id/refund', auth, async (req, res) => {
  try {
    if (req.user.role === 'User') {
      return res.status(403).json({ message: 'Permission Denied. Cashiers cannot reverse Purchase Orders.' });
    }

    const purchase = await Purchase.findOne({ _id: req.params.id, shop: req.user.shopId });
    if (!purchase) return res.status(404).json({ message: 'Purchase record not found' });
    if (purchase.paymentStatus === 'Returned') return res.status(400).json({ message: 'Already marked as returned' });

    // Step 1: Mathematically decrement the items that were previously incremented physically!
    for (const item of purchase.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { currentStock: -Math.abs(item.qty) } // Revert the original restock!
      });
    }

    // Step 2: Mark PO exactly as returned
    purchase.paymentStatus = 'Returned';
    await purchase.save();

    await logAction(req, 'PURCHASE_REFUNDED', `Full Return to Supplier for Invoice ${purchase.invoiceNumber || purchase._id}`);

    res.json({ message: 'Purchase Order officially returned. Supplier Inventory securely deducted!' });
  } catch (err) {
    console.error('Purchase Refund Error:', err.message);
    res.status(500).json({ message: 'Server crash reversing purchase records.' });
  }
});

// @route POST /api/purchases/:id/partial-refund
// @desc Process a partial return for a restock, deducting fractional units back logically.
router.post('/:id/partial-refund', auth, async (req, res) => {
  try {
    const purchaseId = req.params.id;
    const { refundItems } = req.body; // Array of { product_id, returnQty }

    if (req.user.role === 'User') {
      return res.status(403).json({ message: 'Permission Denied. Cashiers cannot natively reverse supplier orders.' });
    }

    if (!refundItems || !Array.isArray(refundItems)) {
       return res.status(400).json({ message: 'Malformed partial return items array.' });
    }

    const purchase = await Purchase.findOne({ _id: purchaseId, shop: req.user.shopId });
    if (!purchase) return res.status(404).json({ message: 'Purchase record not found.' });
    if (purchase.paymentStatus === 'Returned') return res.status(400).json({ message: 'Fully returned already.' });

    let hasRemainingItems = false;
    let newGrandTotal = 0;

    for (let currentItem of purchase.items) {
      const refundTarget = refundItems.find(r => r.product_id === String(currentItem.product) || r.product_id === String(currentItem._id));
      
      if (refundTarget && refundTarget.returnQty > 0) {
        if (refundTarget.returnQty > currentItem.qty) {
          return res.status(400).json({ message: `Cannot return ${refundTarget.returnQty} units of ${currentItem.name} because only ${currentItem.qty} were received.` });
        }
        
        // Physically DECREMENT the inventory natively to reverse the restock!
        await Product.findByIdAndUpdate(currentItem.product, {
          $inc: { currentStock: -Math.abs(refundTarget.returnQty) }
        });

        // Mathematically decrement the original static PO items
        currentItem.qty -= refundTarget.returnQty;
        currentItem.totalItemCost = currentItem.qty * currentItem.costPrice;
      }
      
      if (currentItem.qty > 0) hasRemainingItems = true;
      newGrandTotal += currentItem.totalItemCost;
    }

    // Remap the financial boundary manually
    purchase.grandTotal = newGrandTotal;

    if (!hasRemainingItems) {
      purchase.paymentStatus = 'Returned'; 
    } else {
      purchase.paymentStatus = 'Partially Returned';
    }

    await purchase.save();
    
    await logAction(req, 'PURCHASE_PARTIAL_REFUND', `Partial Return to Supplier for Invoice ${purchase.invoiceNumber || purchase._id}`);

    res.json({ message: 'Partial Supplier Return mathematically synced. Items cleanly deducted!', purchase });

  } catch (err) {
    console.error('Partial PO Return Error:', err.message);
    res.status(500).json({ message: 'Server error parsing partial supplier returns.' });
  }
});

// @route PUT /api/purchases/:id/pay
// @desc Mark a pending purchase order as fully paid securely.
router.put('/:id/pay', auth, async (req, res) => {
  try {
    const purchase = await Purchase.findOne({ _id: req.params.id, shop: req.user.shopId });
    if (!purchase) return res.status(404).json({ message: 'Purchase not found.' });

    if (purchase.paymentStatus !== 'Pending') {
      return res.status(400).json({ message: 'Purchase is not in a pending state.' });
    }

    purchase.paymentStatus = 'Paid';
    await purchase.save();

    res.json({ message: 'Purchase Order payment settled explicitly.', purchase });
  } catch (err) {
    console.error('Settle Payment Error:', err.message);
    res.status(500).json({ message: 'Server crash explicitly mapping supplier payments.' });
  }
});

// @route PUT /api/purchases/:id
// @desc Edit a purchase order (supplier name, invoice number, payment status) — Admin only
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'User') return res.status(403).json({ message: 'Permission denied.' });
    const { supplierName, invoiceNumber, paymentStatus } = req.body;
    const purchase = await Purchase.findOne({ _id: req.params.id, shop: req.user.shopId });
    if (!purchase) return res.status(404).json({ message: 'Purchase not found.' });

    if (supplierName) purchase.supplierName = supplierName;
    if (invoiceNumber !== undefined) purchase.invoiceNumber = invoiceNumber;
    if (paymentStatus) purchase.paymentStatus = paymentStatus;

    await purchase.save();
    await logAction(req, 'PURCHASE_EDITED', `PO ${purchase.invoiceNumber || purchase._id} updated by admin`);
    res.json(purchase);
  } catch (err) {
    res.status(500).json({ message: 'Error updating purchase.' });
  }
});

// @route DELETE /api/purchases/:id
// @desc Permanently delete a purchase order — Admin only
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'User') return res.status(403).json({ message: 'Permission denied.' });
    const purchase = await Purchase.findOneAndDelete({ _id: req.params.id, shop: req.user.shopId });
    if (!purchase) return res.status(404).json({ message: 'Purchase not found.' });
    await logAction(req, 'PURCHASE_DELETED', `PO ${purchase.invoiceNumber || purchase._id} permanently deleted by admin`);
    res.json({ message: 'Purchase record permanently deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting purchase.' });
  }
});

module.exports = router;


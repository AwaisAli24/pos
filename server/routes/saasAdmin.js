const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Shop = require('../models/Shop');
const Sale = require('../models/Sale');
const auth = require('../middleware/authMiddleware');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Middleware to verify SaaS Admin role
const saasAdminAuth = (req, res, next) => {
  if (req.user.role !== 'SaaS Admin') {
    return res.status(403).json({ message: 'Forbidden. SaaS Administrator access only.' });
  }
  next();
};

// @route GET /api/saas-admin/dashboard
// @desc Get SaaS general statistics
router.get('/dashboard', auth, saasAdminAuth, async (req, res) => {
  try {
    const totalShops = await Shop.countDocuments();
    const totalUsers = await User.countDocuments();
    
    // Aggregate system-wide revenue and transaction counts
    const salesStats = await Sale.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$grandTotal' },
          totalSalesCount: { $sum: 1 }
        }
      }
    ]);

    const revenue = salesStats[0]?.totalRevenue || 0;
    const transactions = salesStats[0]?.totalSalesCount || 0;

    res.json({
      totalShops,
      totalUsers,
      totalRevenue: revenue,
      totalTransactions: transactions
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error retrieving SaaS statistics.' });
  }
});

// @route GET /api/saas-admin/shops
// @desc Get all registered shops with metadata and calculated stats
router.get('/shops', auth, saasAdminAuth, async (req, res) => {
  try {
    const shops = await Shop.find().sort({ createdAt: -1 });
    
    const shopsWithStats = [];
    
    for (const shop of shops) {
      // Get user count
      const userCount = await User.countDocuments({ shop: shop._id });
      
      // Get sales stats for this shop
      const salesStats = await Sale.aggregate([
        { $match: { shop: shop._id } },
        {
          $group: {
            _id: null,
            revenue: { $sum: '$grandTotal' },
            count: { $sum: 1 }
          }
        }
      ]);
      
      shopsWithStats.push({
        _id: shop._id,
        name: shop.name,
        category: shop.category,
        phone: shop.phone,
        address: shop.address,
        createdAt: shop.createdAt,
        userCount,
        revenue: salesStats[0]?.revenue || 0,
        salesCount: salesStats[0]?.count || 0
      });
    }

    res.json(shopsWithStats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error retrieving shops.' });
  }
});

// @route GET /api/saas-admin/sales
// @desc Get system-wide sales list across all shops
router.get('/sales', auth, saasAdminAuth, async (req, res) => {
  try {
    const sales = await Sale.find()
      .populate('shop', 'name')
      .populate('cashier', 'fullName')
      .sort({ createdAt: -1 })
      .limit(100); // Limit to last 100 system-wide transactions for speed
    
    res.json(sales);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error retrieving system-wide sales.' });
  }
});

// @route POST /api/saas-admin/impersonate/:shopId
// @desc Log in to any shop by generating a tenant token for its owner/admin
router.post('/impersonate/:shopId', auth, saasAdminAuth, async (req, res) => {
  try {
    const targetShopId = req.params.shopId;
    const targetShop = await Shop.findById(targetShopId);
    if (!targetShop) {
      return res.status(404).json({ message: 'Target shop not found.' });
    }

    // Find the primary administrator or any user of that shop
    let targetUser = await User.findOne({ shop: targetShopId, role: { $in: ['Super Admin', 'Admin'] } });
    if (!targetUser) {
      // Fallback: grab any user
      targetUser = await User.findOne({ shop: targetShopId });
    }

    if (!targetUser) {
      return res.status(404).json({ message: 'No users found for this shop to impersonate.' });
    }

    // Create target token payload
    const payload = { 
      user: { 
        id: targetUser._id, 
        role: targetUser.role, 
        shopId: targetShop._id, 
        shopName: targetShop.name, 
        shopCategory: targetShop.category,
        fullName: targetUser.fullName 
      } 
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2h' }); // shorter expiry for security

    res.json({
      token,
      user: payload.user,
      message: `Impersonation successful for store ${targetShop.name}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error generating impersonation token.' });
  }
});

// @route POST /api/saas-admin/change-password
// @desc Change SaaS Admin password
router.post('/change-password', auth, saasAdminAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide current and new passwords.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Administrator account not found.' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password updated successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating password.' });
  }
});

// @route GET /api/saas-admin/shops/:shopId/users
// @desc Get all users associated with a specific store
router.get('/shops/:shopId/users', auth, saasAdminAuth, async (req, res) => {
  try {
    const users = await User.find({ shop: req.params.shopId }).select('-password');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error retrieving shop users.' });
  }
});

// @route POST /api/saas-admin/users/:userId/reset-password
// @desc Reset a store user's password from SaaS admin panel
router.post('/users/:userId/reset-password', auth, saasAdminAuth, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: `Password for user ${user.fullName} (${user.email}) has been successfully updated!` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error resetting user password.' });
  }
});

// @route DELETE /api/saas-admin/shops/:shopId
// @desc Delete a shop and cascade delete all referencing collections & logo file
router.delete('/shops/:shopId', auth, saasAdminAuth, async (req, res) => {
  try {
    const shopId = req.params.shopId;

    // 1. Delete Shop Logo file if it exists
    const path = require('path');
    const fs = require('fs');
    const logoPath = path.join(__dirname, '../logo', `${shopId}.png`);
    if (fs.existsSync(logoPath)) {
      fs.unlinkSync(logoPath);
    }

    // 2. Cascade delete all referencing documents
    const Product = require('../models/Product');
    
    await User.deleteMany({ shop: shopId });
    await Product.deleteMany({ shop: shopId });
    await Sale.deleteMany({ shop: shopId });
    
    try { await require('../models/Purchase').deleteMany({ shop: shopId }); } catch (e) {}
    try { await require('../models/Expense').deleteMany({ shop: shopId }); } catch (e) {}
    try { await require('../models/Employee').deleteMany({ shop: shopId }); } catch (e) {}
    try { await require('../models/Customer').deleteMany({ shop: shopId }); } catch (e) {}
    try { await require('../models/Supplier').deleteMany({ shop: shopId }); } catch (e) {}
    try { await require('../models/CustomerLedger').deleteMany({ shop: shopId }); } catch (e) {}
    try { await require('../models/SupplierLedger').deleteMany({ shop: shopId }); } catch (e) {}
    try { await require('../models/AuditLog').deleteMany({ shop: shopId }); } catch (e) {}
    try { await require('../models/LoginLog').deleteMany({ shop: shopId }); } catch (e) {}
    try { await require('../models/Deal').deleteMany({ shop: shopId }); } catch (e) {}

    // 3. Delete the Shop itself
    const shop = await Shop.findByIdAndDelete(shopId);
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found.' });
    }

    res.json({ message: `Shop "${shop.name}" and all its associated data/accounts have been permanently deleted.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error deleting shop.' });
  }
});

module.exports = router;

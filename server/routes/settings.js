const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/authMiddleware');
const Shop = require('../models/Shop');
const User = require('../models/User');

// Create logo directory if it doesn't exist
const logoDir = path.join(__dirname, '../logo');
if (!fs.existsSync(logoDir)) {
  fs.mkdirSync(logoDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, logoDir);
  },
  filename: function (req, file, cb) {
    // We can safely overwrite the shop's logo based on their token
    cb(null, req.user.shopId + '.png');
  }
});

const upload = multer({ storage: storage });

// @route   GET /api/settings/shop
// @desc    Get the current shop settings
router.get('/shop', auth, async (req, res) => {
  try {
    const shop = await Shop.findById(req.user.shopId);
    if (!shop) return res.status(404).json({ message: 'Shop not found' });
    res.json(shop);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error retrieving shop settings.');
  }
});

// @route   PUT /api/settings/shop
// @desc    Update shop details
router.put('/shop', auth, upload.single('logo'), async (req, res) => {
  try {
    const { name, phone, address, category } = req.body;
    
    // Only a Super Admin or Admin should technically adjust shop settings
    if (req.user.role === 'User') {
       // if they uploaded a logo but aren't an admin, we should delete the uploaded file
       if (req.file) fs.unlinkSync(req.file.path);
       return res.status(403).json({ message: 'Permission Denied. Cashiers cannot edit Shop Settings.' });
    }

    const shop = await Shop.findByIdAndUpdate(
      req.user.shopId,
      { $set: { name, phone, address, category } },
      { new: true }
    );
    res.json(shop);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error updating shop settings.');
  }
});

// @route   GET /api/settings/users
// @desc    List all sub-users and cashiers for this Shop
router.get('/users', auth, async (req, res) => {
  try {
    const users = await User.find({ shop: req.user.shopId }).select('-password');
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error retrieving staff logs.');
  }
});

// @route   POST /api/settings/users
// @desc    Create a new cashier or admin
router.post('/users', auth, async (req, res) => {
  try {
    if (req.user.role === 'User') {
       return res.status(403).json({ message: 'Permission Denied. Only Admins can create staff.' });
    }

    const { fullName, email, password, role } = req.body;
    
    let existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'A system user with that email already exists.' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      role: role || 'User', // 'User' represents standard Cashier
      shop: req.user.shopId
    });

    const savedUser = await newUser.save();
    savedUser.password = undefined; // Prevent sending password back in JSON response
    res.status(201).json(savedUser);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error registering staff.');
  }
});

// @route   DELETE /api/settings/users/:id
// @desc    Fire/Remove a cashier
router.delete('/users/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'User') {
      return res.status(403).json({ message: 'Permission Denied.' });
    }

    // Protect against self-deletion accidentally
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete yourself while logged in.' });
    }

    await User.findOneAndDelete({ _id: req.params.id, shop: req.user.shopId });
    res.json({ message: 'Staff member revoked securely.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error removing staff.');
  }
});

// @route   PUT /api/settings/users/:id
// @desc    Update a cashier's password or role parameters securely
router.put('/users/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'User') {
      return res.status(403).json({ message: 'Permission Denied. Only Admins can modify staff.' });
    }

    const { role, password } = req.body;
    let updateFields = {};
    if (role) updateFields.role = role;
    
    if (password && password.length >= 6) {
      const salt = await bcrypt.genSalt(10);
      updateFields.password = await bcrypt.hash(password, salt);
    }
    
    if (req.params.id === req.user.id && role === 'User') {
      return res.status(400).json({ message: 'You cannot aggressively demote your own active account.' });
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: req.params.id, shop: req.user.shopId },
      { $set: updateFields },
      { new: true }
    ).select('-password');

    if (!updatedUser) return res.status(404).json({ message: 'User not found' });
    res.json(updatedUser);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error updating staff parameters.');
  }
});

// @route   GET /api/settings/login-history
// @desc    Retrieve login logs for all staff members in this shop
router.get('/login-history', auth, async (req, res) => {
  try {
    if (req.user.role === 'User') {
      return res.status(403).json({ message: 'Permission Denied. Only Admins can view login history.' });
    }

    const LoginLog = require('../models/LoginLog');
    const logs = await LoginLog.find({ shop: req.user.shopId })
      .sort({ loginTime: -1 })
      .limit(100);
      
    res.json(logs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error retrieving authentication logs.');
  }
});

module.exports = router;

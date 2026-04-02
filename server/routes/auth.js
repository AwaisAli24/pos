const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Shop = require('../models/Shop');

// @route POST /api/auth/signup
// @desc Register a SaaS new user & their shop instance
router.post('/signup', async (req, res) => {
  try {
    const { name, shopName, category, phone, address, email, password } = req.body;

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists with this email.' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create the unique Shop for this tenant
    const newShop = new Shop({
      name: shopName,
      category,
      phone,
      address
    });
    const savedShop = await newShop.save();

    // Create new admin user mapped to this shop
    user = new User({
      fullName: name,
      email,
      password: hashedPassword,
      shop: savedShop._id,
      role: 'Super Admin'
    });
    const savedUser = await user.save();

    // Create Token identifying the user and the shop they belong to
    const payload = { 
      user: { 
        id: savedUser._id, 
        role: savedUser.role, 
        shopId: savedShop._id,
        shopName: savedShop.name
      } 
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, message: 'Shop and Account created successfully!' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route POST /api/auth/login
// @desc Authenticate user & get tenant scoped token
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Verify user exists
    const user = await User.findOne({ email }).populate('shop');
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const payload = { 
      user: { 
        id: user._id, 
        role: user.role, 
        shopId: user.shop._id, 
        shopName: user.shop.name, 
        fullName: user.fullName 
      } 
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, message: 'Login successful!', user: payload.user });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;

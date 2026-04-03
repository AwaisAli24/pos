const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Shop = require('../models/Shop');

// Create logo directory if it doesn't exist
const logoDir = path.join(__dirname, '../logo');
if (!fs.existsSync(logoDir)) {
  fs.mkdirSync(logoDir, { recursive: true });
}

// Temporary storage for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, logoDir)
  },
  filename: function (req, file, cb) {
    // We don't know the shop ID yet, so save with a temp name
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'temp-' + uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({ storage: storage });

// @route POST /api/auth/signup
// @desc Register a SaaS new user & their shop instance
router.post('/signup', upload.single('logo'), async (req, res) => {
  try {
    const { name, shopName, category, phone, address, email, password } = req.body;

    let user = await User.findOne({ email });
    if (user) {
      if (req.file) fs.unlinkSync(req.file.path); // Remove uploaded temp file
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

    // Now rename the uploaded file to {shopId}.png
    if (req.file) {
      const tempPath = req.file.path;
      const newFileName = savedShop._id.toString() + '.png';
      const targetPath = path.join(logoDir, newFileName);
      fs.renameSync(tempPath, targetPath);
    }

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

    if (user.isActive === false) {
      return res.status(403).json({ message: 'Account is deactivated. Please contact support.' });
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

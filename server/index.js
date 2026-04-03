const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve Static Assets
app.use('/logo', express.static(path.join(__dirname, 'logo')));
app.use('/employee-photos', express.static(path.join(__dirname, 'employee-photos')));

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Backend Database!'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/hr', require('./routes/hr'));
app.use('/api/expenses', require('./routes/expenses'));

// Basic API Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'active', message: 'POS Server Engine is online.' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server actively running on port ${PORT}`);
});

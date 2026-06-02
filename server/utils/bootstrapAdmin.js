const User = require('../models/User');
const Shop = require('../models/Shop');
const bcrypt = require('bcryptjs');

const bootstrapAdmin = async () => {
  try {
    // Clean up old admin@saas.com account if present
    await User.deleteOne({ email: 'admin@saas.com' });

    const adminEmail = process.env.SAAS_ADMIN_EMAIL || 'admin@pos.com';
    const adminPassword = process.env.SAAS_ADMIN_PASSWORD || 'admin123';

    // 1. Check if a SaaS Admin already exists
    const adminExists = await User.findOne({ email: adminEmail });
    if (adminExists) {
      console.log('ℹ️ SaaS Administrator account already exists.');
      return;
    }

    // 2. Create the system shop if it doesn't exist
    let systemShop = await Shop.findOne({ name: 'SaaS Admin System' });
    if (!systemShop) {
      systemShop = new Shop({
        name: 'SaaS Admin System',
        category: 'retail',
        phone: '03000000000',
        address: 'System HQ',
        isActive: true
      });
      await systemShop.save();
      console.log('✅ Created system-wide shop: SaaS Admin System');
    }

    // 3. Create the SaaS Admin user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    const saasAdmin = new User({
      fullName: 'SaaS Administrator',
      email: adminEmail,
      password: hashedPassword,
      shop: systemShop._id,
      role: 'SaaS Admin',
      isActive: true
    });

    await saasAdmin.save();
    console.log(`✅ Seeded SaaS Administrator account with email: ${adminEmail}`);
  } catch (err) {
    console.error('❌ Failed to bootstrap SaaS Administrator:', err.message);
  }
};

module.exports = bootstrapAdmin;

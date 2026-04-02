const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Purchase = require('../models/Purchase');
const auth = require('../middleware/authMiddleware');

// @route GET /api/reports/summary
// @desc Complex metric aggregations natively generating core financial reports for accounting securely
router.get('/summary', auth, async (req, res) => {
  try {
    const shopId = new mongoose.Types.ObjectId(req.user.shopId);
    const { timeline } = req.query;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Apply strict date filters matching query
    let dateFilter = {};
    if (timeline === 'today') {
      dateFilter = { createdAt: { $gte: today } };
    } else if (timeline === 'week') {
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = { createdAt: { $gte: lastWeek } };
    } else if (timeline === 'month') {
      dateFilter = { createdAt: { $gte: thisMonth } };
    }

    // 1. Sales Aggregations mathematically extracting revenue & profit natively
    const salesInfo = await Sale.aggregate([
      { $match: { shop: shopId, status: { $ne: 'Refunded' }, ...dateFilter } },
      { $unwind: "$items" },
      { $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "productDoc"
      }},
      { $unwind: { path: "$productDoc", preserveNullAndEmptyArrays: true } },
      { $project: {
          createdAt: 1,
          saleId: "$_id",
          itemTotal: "$items.totalItemPrice",
          itemCost: { $multiply: ["$items.qty", { $ifNull: ["$productDoc.costPrice", 0] }] },
          qty: "$items.qty",
          name: "$items.name",
          category: "$productDoc.category"
      }}
    ]);

    let todaySales = 0;
    let monthSales = 0;
    let totalRevenue = 0;
    let totalCost = 0;
    let topProducts = {};

    salesInfo.forEach(s => {
      const d = new Date(s.createdAt);
      // Strictly for the hardcoded summary blocks inside grid regardless of query:
      if (d >= today) todaySales += s.itemTotal;
      if (d >= thisMonth) monthSales += s.itemTotal;
      
      totalRevenue += s.itemTotal;
      totalCost += s.itemCost;

      // Track top products dynamically
      if (!topProducts[s.name]) topProducts[s.name] = { qty: 0, revenue: 0, category: s.category || 'Uncategorized' };
      topProducts[s.name].qty += s.qty;
      topProducts[s.name].revenue += s.itemTotal;
    });

    const topSellingItems = Object.keys(topProducts).map(name => ({
      name,
      ...topProducts[name]
    })).sort((a,b) => b.revenue - a.revenue).slice(0, 10); // Top 10 by Revenue


    // 2. Purchases & Restocking Expenditure mathematically mapped functionally 
    const purchasesInfo = await Purchase.aggregate([
      { $match: { shop: shopId, paymentStatus: { $in: ['Paid', 'Partially Returned'] }, ...dateFilter } },
      { $group: {
          _id: null,
          totalExpenditure: { $sum: "$grandTotal" }
      }}
    ]);
    const totalPurchases = purchasesInfo[0]?.totalExpenditure || 0;


    // 3. Stock Level Aggregations mapping accurately structurally
    const inventoryData = await Product.find({ shop: shopId }).lean();
    let inventoryValue = 0;
    let lowStockItemsCount = 0;
    
    inventoryData.forEach(p => {
      inventoryValue += (p.costPrice || 0) * (p.currentStock || 0);
      if (p.currentStock <= p.minStock) lowStockItemsCount++;
    });

    res.json({
      financials: {
        todaySales,
        monthSales,
        totalRevenue,
        totalCost,
        grossProfit: totalRevenue - totalCost,
        totalPurchases,
        inventoryValue
      },
      topSellingItems,
      inventoryAlerts: lowStockItemsCount
    });

  } catch (err) {
    console.error('Report generation error:', err);
    res.status(500).json({ message: 'Server Errors computing Analytics dynamically' });
  }
});

// @route GET /api/reports/export
router.get('/export', auth, async (req, res) => {
  try {
    const shopId = new mongoose.Types.ObjectId(req.user.shopId);
    const { timeline } = req.query;
    const now = new Date();
    
    let dateFilter = {};
    if (timeline === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      dateFilter = { createdAt: { $gte: today } };
    } else if (timeline === 'week') {
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = { createdAt: { $gte: lastWeek } };
    } else if (timeline === 'month') {
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { createdAt: { $gte: thisMonth } };
    }

    const salesInfo = await Sale.aggregate([
      { $match: { shop: shopId, status: { $ne: 'Refunded' }, ...dateFilter } },
      { $unwind: "$items" },
      { $lookup: { from: "products", localField: "items.product", foreignField: "_id", as: "productDoc" }},
      { $unwind: { path: "$productDoc", preserveNullAndEmptyArrays: true } },
      { $project: {
          itemTotal: "$items.totalItemPrice",
          itemCost: { $multiply: ["$items.qty", { $ifNull: ["$productDoc.costPrice", 0] }] }
      }}
    ]);

    let totalRevenue = 0; let totalCost = 0;
    salesInfo.forEach(s => {
      totalRevenue += s.itemTotal;
      totalCost += s.itemCost;
    });

    const purchasesInfo = await Purchase.aggregate([
      { $match: { shop: shopId, paymentStatus: { $in: ['Paid', 'Partially Returned'] }, ...dateFilter } },
      { $group: { _id: null, totalExpenditure: { $sum: "$grandTotal" } } }
    ]);
    const totalPurchases = purchasesInfo[0]?.totalExpenditure || 0;

    const inventoryData = await Product.find({ shop: shopId }).lean();
    let inventoryValue = 0;
    inventoryData.forEach(p => {
      inventoryValue += (p.costPrice || 0) * (p.currentStock || 0);
    });

    // Generate PDF
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Financial_Report_${timeline || 'all'}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text('Financial Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Timeline: ${timeline === 'all' ? 'Lifetime' : timeline === 'today' ? 'Today' : timeline === 'week' ? 'This Week' : 'This Month'}`, { align: 'center' });
    doc.text(`Generated: ${now.toLocaleString()}`, { align: 'center' }).moveDown(2);

    doc.fontSize(14).text('Executive Summary', { underline: true }).moveDown(0.5);
    doc.fontSize(12).text(`Gross Revenue: Rs. ${totalRevenue.toLocaleString()}`);
    doc.text(`Total Product Costs (COGS): - Rs. ${totalCost.toLocaleString()}`);
    doc.text(`Gross Profit Margin: Rs. ${(totalRevenue - totalCost).toLocaleString()}`);
    doc.moveDown();
    
    doc.fontSize(14).text('Capital Distribution', { underline: true }).moveDown(0.5);
    doc.fontSize(12).text(`Total Restock Capital (Purchases): Rs. ${totalPurchases.toLocaleString()}`);
    doc.text(`Unsold Inventory Reserve: Rs. ${inventoryValue.toLocaleString()}`);
    
    doc.moveDown(3);
    doc.fontSize(10).fillColor('gray').text('Generated by Tycoon Technologies POS System', { align: 'center' });

    doc.end();

  } catch (err) {
    console.error('Export Error:', err);
    res.status(500).json({ message: 'Error establishing direct PDF streaming manually.' });
  }
});

module.exports = router;

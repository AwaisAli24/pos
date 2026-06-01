const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Purchase = require('../models/Purchase');
const Expense = require('../models/Expense');
const auth = require('../middleware/authMiddleware');

// @route GET /api/reports/summary
// @desc Complex metric aggregations natively generating core financial reports for accounting securely
router.get('/summary', auth, async (req, res) => {
  try {
    const shopId = new mongoose.Types.ObjectId(req.user.shopId);
    const { timeline, startDate, endDate } = req.query;
    
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
    } else if (timeline === 'custom' && startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate || startDate);
      end.setHours(23, 59, 59, 999);
      dateFilter = { createdAt: { $gte: start, $lte: end } };
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
    })).sort((a,b) => b.revenue - a.revenue); // Sort by Revenue


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

    // 4. Expenses Aggregations
    // Use the same date filter but on the 'date' field of Expense
    const expenseFilter = {};
    if (timeline === 'today') {
      expenseFilter.date = { $gte: today };
    } else if (timeline === 'week') {
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      expenseFilter.date = { $gte: lastWeek };
    } else if (timeline === 'month') {
      expenseFilter.date = { $gte: thisMonth };
    } else if (timeline === 'custom' && startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate || startDate);
      end.setHours(23, 59, 59, 999);
      expenseFilter.date = { $gte: start, $lte: end };
    }

    const expensesInfo = await Expense.aggregate([
      { $match: { shop: shopId, ...expenseFilter } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalExpenses = expensesInfo[0]?.total || 0;

    // 5. Dynamic Sales Breakdown (Hourly or Daily)
    let breakdown = [];
    const isSingleDay = timeline === 'today' || (timeline === 'custom' && startDate === endDate);

    if (isSingleDay) {
      const hourlyData = {};
      for (let i = 0; i < 24; i++) {
        hourlyData[i] = { hour: `${i.toString().padStart(2, '0')}:00`, revenue: 0, profit: 0, salesCount: new Set() };
      }
      salesInfo.forEach(s => {
        const hour = new Date(s.createdAt).getHours();
        hourlyData[hour].revenue += s.itemTotal;
        hourlyData[hour].profit += (s.itemTotal - s.itemCost);
        hourlyData[hour].salesCount.add(s.saleId.toString());
      });
      breakdown = Object.keys(hourlyData).map(h => ({
        label: hourlyData[h].hour,
        revenue: hourlyData[h].revenue,
        profit: hourlyData[h].profit,
        count: hourlyData[h].salesCount.size
      })).filter(item => item.revenue > 0);
    } else {
      const dailyData = {};
      salesInfo.forEach(s => {
        const dayStr = new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        if (!dailyData[dayStr]) {
          dailyData[dayStr] = { revenue: 0, profit: 0, salesCount: new Set() };
        }
        dailyData[dayStr].revenue += s.itemTotal;
        dailyData[dayStr].profit += (s.itemTotal - s.itemCost);
        dailyData[dayStr].salesCount.add(s.saleId.toString());
      });
      breakdown = Object.keys(dailyData).map(day => ({
        label: day,
        revenue: dailyData[day].revenue,
        profit: dailyData[day].profit,
        count: dailyData[day].salesCount.size
      })).sort((a, b) => new Date(a.label) - new Date(b.label));
    }

    res.json({
      financials: {
        todaySales,
        monthSales,
        totalRevenue,
        totalCost,
        grossProfit: totalRevenue - totalCost,
        totalExpenses,
        netProfit: (totalRevenue - totalCost) - totalExpenses,
        totalPurchases,
        inventoryValue
      },
      topSellingItems,
      inventoryAlerts: lowStockItemsCount,
      breakdown
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
    const { timeline, startDate, endDate } = req.query;
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
    } else if (timeline === 'custom' && startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate || startDate);
      end.setHours(23, 59, 59, 999);
      dateFilter = { createdAt: { $gte: start, $lte: end } };
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

    const expenseFilter = {};
    if (timeline === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      expenseFilter.date = { $gte: today };
    } else if (timeline === 'week') {
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      expenseFilter.date = { $gte: lastWeek };
    } else if (timeline === 'month') {
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      expenseFilter.date = { $gte: thisMonth };
    } else if (timeline === 'custom' && startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate || startDate);
      end.setHours(23, 59, 59, 999);
      expenseFilter.date = { $gte: start, $lte: end };
    }

    const expensesInfo = await Expense.aggregate([
      { $match: { shop: shopId, ...expenseFilter } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalExpenses = expensesInfo[0]?.total || 0;

    const inventoryData = await Product.find({ shop: shopId }).lean();
    let inventoryValue = 0;
    inventoryData.forEach(p => {
      inventoryValue += (p.costPrice || 0) * (p.currentStock || 0);
    });

    let timelineLabel = '';
    if (timeline === 'all') timelineLabel = 'Lifetime';
    else if (timeline === 'today') timelineLabel = 'Today';
    else if (timeline === 'week') timelineLabel = 'This Week';
    else if (timeline === 'month') timelineLabel = 'This Month';
    else if (timeline === 'custom') {
      timelineLabel = `${new Date(startDate).toLocaleDateString()} to ${new Date(endDate || startDate).toLocaleDateString()}`;
    }

    // Generate PDF
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Financial_Report_${timeline === 'custom' ? startDate + '_to_' + endDate : (timeline || 'all')}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text('Financial Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Timeline: ${timelineLabel}`, { align: 'center' });
    doc.text(`Generated: ${now.toLocaleString()}`, { align: 'center' }).moveDown(2);

    doc.fontSize(14).text('Executive Summary', { underline: true }).moveDown(0.5);
    doc.fontSize(12).text(`Gross Revenue: Rs. ${totalRevenue.toLocaleString()}`);
    doc.text(`Total Product Costs (COGS): - Rs. ${totalCost.toLocaleString()}`);
    doc.text(`Gross Profit: Rs. ${(totalRevenue - totalCost).toLocaleString()}`);
    doc.text(`Operational Expenses: - Rs. ${totalExpenses.toLocaleString()}`);
    doc.fontSize(13).text(`NET PROFIT: Rs. ${((totalRevenue - totalCost) - totalExpenses).toLocaleString()}`, { bold: true });
    doc.moveDown();
    
    doc.fontSize(14).text('Capital Distribution', { underline: true }).moveDown(0.5);
    doc.fontSize(12).text(`Total Restock Capital (Purchases): Rs. ${totalPurchases.toLocaleString()}`);
    doc.text(`Unsold Inventory Reserve: Rs. ${inventoryValue.toLocaleString()}`);
    doc.moveDown();

    // 4. Product Performance Metrics
    const topProductsInfo = await Sale.aggregate([
      { $match: { shop: shopId, status: { $ne: 'Refunded' }, ...dateFilter } },
      { $unwind: "$items" },
      { $group: {
          _id: "$items.name",
          qty: { $sum: "$items.qty" },
          revenue: { $sum: "$items.totalItemPrice" }
      }},
      { $sort: { revenue: -1 } }
    ]);

    doc.addPage();
    doc.fontSize(16).fillColor('black').text('Sold Products Performance', { align: 'center' }).moveDown();
    
    // Header for product table to align manually with spacing for PDF readability
    const drawTableHeader = (y) => {
      doc.fontSize(12).fillColor('black').text(`Item Name`, 50, y);
      doc.text(`Units Sold`, 350, y, { align: 'center' });
      doc.text(`Total Revenue`, 450, y, { align: 'right' });
      doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();
    };

    drawTableHeader(100);

    let yPos = 130;
    topProductsInfo.forEach(p => {
      if (yPos > 700) {
        doc.addPage();
        drawTableHeader(50);
        yPos = 80;
      }
      doc.fontSize(10).fillColor('black').text(p._id, 50, yPos);
      doc.text(p.qty.toString(), 350, yPos, { align: 'center' });
      doc.text(`Rs. ${p.revenue.toLocaleString()}`, 450, yPos, { align: 'right' });
      yPos += 20;
    });

    if (yPos > 700) {
      doc.addPage();
    }
    doc.moveDown(3);
    doc.fontSize(10).fillColor('gray').text('Generated by Tycoon Technologies POS System', { align: 'center', baseline: 'bottom' });

    doc.end();

  } catch (err) {
    console.error('Export Error:', err);
    res.status(500).json({ message: 'Error establishing direct PDF streaming manually.' });
  }
});

module.exports = router;

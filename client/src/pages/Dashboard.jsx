import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE from '../config';
import { 
  LayoutDashboard, ShoppingCart, Package, Settings, 
  TrendingUp, Wallet, Banknote, CreditCard, Receipt, Users, CheckCircle, Truck, BarChart3, List, Store
} from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('today');

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const token = localStorage.getItem('pos_token');
        const res = await axios.get(`${API_BASE}/api/sales`, {
          headers: { 'x-auth-token': token }
        });
        if (res.data) setSales(res.data);
      } catch (err) {
        console.error('Failed to fetch sales metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSales();
  }, []);

  // Compute Metrics dynamically based on Active Time Filter
  const activeSales = sales.filter(sale => {
    if (timeFilter === 'all') return true;
    
    const saleDate = new Date(sale.createdAt);
    const now = new Date();
    
    if (timeFilter === 'today') {
      return saleDate.toDateString() === now.toDateString();
    }
    
    const diffTime = Math.abs(now - saleDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (timeFilter === '7days') return diffDays <= 7;
    if (timeFilter === 'month') return diffDays <= 30;
    
    return true;
  });

  const totalRevenue = activeSales.reduce((sum, sale) => sum + sale.grandTotal, 0);
  const totalInvoices = activeSales.length;

  // Compute Payment Method Split
  const paymentSplit = activeSales.reduce((acc, sale) => {
    const method = sale.paymentMethod || 'Cash';
    acc[method] = (acc[method] || 0) + sale.grandTotal;
    return acc;
  }, { Cash: 0, Card: 0, Online: 0 });
  
  // Quick format utility
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar Navigation */}
      <nav className="sidebar-min">
        <div className="nav-item" onClick={() => navigate('/billing')} title="POS / Billing">
          <ShoppingCart size={24} />
        </div>
        <div className="nav-item" onClick={() => navigate('/inventory')} title="Inventory">
          <Package size={24} />
        </div>
        <div className="nav-item" onClick={() => navigate('/purchases')} title="Purchases">
          <Truck size={24} />
        </div>
        <div className="nav-item" onClick={() => navigate('/suppliers')} title="Suppliers">
          <Users size={24} />
        </div>
        <div className="nav-item" onClick={() => navigate('/customers')} title="Customers">
          <Store size={24} />
        </div>
        <div className="nav-item" onClick={() => navigate('/sales-history')} title="Sales History">
          <List size={24} />
        </div>
        <div className="nav-item active" title="Dashboard">
          <LayoutDashboard size={24} />
        </div>
        <div className="nav-item" onClick={() => navigate('/reports')} title="Reports">
          <BarChart3 size={24} />
        </div>
        <div className="nav-item" onClick={() => navigate('/settings')} title="Settings" style={{ marginTop: 'auto' }}>
          <Settings size={24} />
        </div>
      </nav>

      <main className="dashboard-main">
        <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Shop Analytics</h1>
            <p>Track your daily revenue and recent transactions completely natively.</p>
          </div>
          <div>
            <select 
              value={timeFilter} 
              onChange={(e) => setTimeFilter(e.target.value)}
              style={{ 
                padding: '0.6rem 2.5rem 0.6rem 1.2rem', 
                borderRadius: '8px', 
                border: '1px solid #cbd5e1', 
                background: 'white', 
                fontWeight: 'bold', 
                outline: 'none', 
                cursor: 'pointer', 
                fontSize: '1rem',
                color: 'var(--text-main)',
                appearance: 'auto'
              }}
            >
              <option value="today">Today's Sales</option>
              <option value="7days">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="all">All-Time Metrics</option>
            </select>
          </div>
        </header>

        {/* Global Key Performance Indicators */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon" style={{ background: '#e0e7ff', color: '#4f46e5' }}>
              <Wallet size={28} />
            </div>
            <div className="metric-info">
              <h3>{timeFilter === 'today' ? "Today's Revenue" : timeFilter === 'all' ? "All-Time Revenue" : "Generated Revenue"}</h3>
              <p>Rs. {totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
              <Receipt size={28} />
            </div>
            <div className="metric-info">
              <h3>Total Sales Rendered</h3>
              <p>{totalInvoices} Invoices</p>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon" style={{ background: '#fef08a', color: '#ca8a04' }}>
              <BarChart3 size={28} />
            </div>
            <div className="metric-info">
              <h3>Average Sale</h3>
              <p>Rs. {totalInvoices > 0 ? (totalRevenue / totalInvoices).toFixed(0) : 0}</p>
            </div>
          </div>
        </div>

        {/* Payment Breakdown Cards */}
        <h2 style={{ marginTop: '2.5rem', marginBottom: '1rem', color: 'var(--text-main)', fontSize: '1.4rem' }}>Payment Split</h2>
        <div className="metrics-grid">
          <div className="metric-card" style={{ borderTop: '4px solid #10b981' }}>
            <div className="metric-icon" style={{ background: '#d1fae5', color: '#059669' }}>
              <Banknote size={24} />
            </div>
            <div className="metric-info">
              <h3 style={{ fontSize: '1.05rem' }}>Cash Revenue</h3>
              <p style={{ fontSize: '1.4rem' }}>Rs. {paymentSplit['Cash'].toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
          </div>
          <div className="metric-card" style={{ borderTop: '4px solid #3b82f6' }}>
            <div className="metric-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>
              <CreditCard size={24} />
            </div>
            <div className="metric-info">
              <h3 style={{ fontSize: '1.05rem' }}>Card Revenue</h3>
              <p style={{ fontSize: '1.4rem' }}>Rs. {paymentSplit['Card'].toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
          </div>
          <div className="metric-card" style={{ borderTop: '4px solid #8b5cf6' }}>
            <div className="metric-icon" style={{ background: '#ede9fe', color: '#7c3aed' }}>
              <Wallet size={24} />
            </div>
            <div className="metric-info">
              <h3 style={{ fontSize: '1.05rem' }}>Online Revenue</h3>
              <p style={{ fontSize: '1.4rem' }}>Rs. {(paymentSplit['Online'] || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
          </div>
        </div>

        {/* Recent Invoices Ledger */}
        <section className="sales-table-section">
          <h2>Recent Transactions</h2>
          <div className="sales-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Receipt ID</th>
                  <th>Date & Time</th>
                  <th>Cashier</th>
                  <th>Items Sold</th>
                  <th>Payment Type</th>
                  <th>Grand Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" style={{ textAlign: "center" }}>Loading sales data...</td></tr>
                ) : activeSales.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: "center", color: "#94a3b8" }}>No active transactions found for this time period.</td></tr>
                ) : (
                  activeSales.map((sale) => (
                    <tr key={sale._id}>
                      <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{sale._id.substring(18, 24).toUpperCase()}</td>
                      <td>{formatDate(sale.createdAt)}</td>
                      <td>{sale.cashier?.fullName || 'Super Admin'}</td>
                      <td>{sale.items.reduce((sum, item) => sum + item.qty, 0)} Units</td>
                      <td>
                        <span style={{ fontWeight: '600', color: sale.paymentMethod === 'Card' ? '#3b82f6' : '#10b981' }}>
                          {sale.paymentMethod}
                        </span>
                      </td>
                      <td style={{ fontWeight: '700' }}>Rs. {sale.grandTotal.toFixed(2)}</td>
                      <td>
                        <span className={`status-badge status-${sale.status.toLowerCase()}`}>
                          {sale.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
};

export default Dashboard;

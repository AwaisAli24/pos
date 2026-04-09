import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE from '../config';
import { 
  LayoutDashboard, ShoppingCart, Package, Settings, 
  TrendingUp, Wallet, Banknote, CreditCard, Receipt, Users, CheckCircle, Truck, BarChart3, List, Store, DollarSign, UserCheck, ArrowUpCircle, ArrowDownCircle
} from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('all');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const token = localStorage.getItem('pos_token');
        const headers = { 'x-auth-token': token };
        const [salesRes, purchasesRes, expensesRes] = await Promise.all([
          axios.get(`${API_BASE}/api/sales`, { headers }),
          axios.get(`${API_BASE}/api/purchases`, { headers }),
          axios.get(`${API_BASE}/api/expenses`, { headers })
        ]);
        if (salesRes.data) setSales(salesRes.data);
        if (purchasesRes.data) setPurchases(purchasesRes.data);
        if (expensesRes.data) setExpenses(expensesRes.data);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Filter helper
  const isInRange = (dateStr) => {
    if (timeFilter === 'all') return true;
    const date = new Date(dateStr);
    const now = new Date();
    if (timeFilter === 'today') return date.toDateString() === now.toDateString();
    const diffDays = Math.ceil(Math.abs(now - date) / (1000 * 60 * 60 * 24));
    if (timeFilter === '7days') return diffDays <= 7;
    if (timeFilter === 'month') return diffDays <= 30;
    return true;
  };

  const activeSales = sales.filter(s => isInRange(s.createdAt));

  // Build unified activity feed
  const activityFeed = [
    ...activeSales.map(s => ({
      _id: s._id,
      date: s.createdAt,
      type: 'Sale',
      description: `Invoice ${s.invoiceId || '#' + s._id.slice(-6).toUpperCase()} — ${s.customerName || 'Guest'}`,
      amount: s.grandTotal,
      direction: 'in',
      sub: `${s.items.reduce((sum, i) => sum + i.qty, 0)} items · ${s.paymentMethod}`,
      status: s.status
    })),
    ...purchases.filter(p => isInRange(p.createdAt)).map(p => ({
      _id: p._id,
      date: p.createdAt,
      type: 'Purchase',
      description: `Restock from ${p.supplierName || 'Supplier'} ${p.invoiceNumber ? '· ' + p.invoiceNumber : ''}`,
      amount: p.grandTotal,
      direction: 'out',
      sub: `${p.items.length} product(s) · ${p.paymentStatus}`,
      status: p.paymentStatus
    })),
    ...expenses.filter(e => isInRange(e.date || e.createdAt)).map(e => ({
      _id: e._id,
      date: e.date || e.createdAt,
      type: 'Expense',
      description: `${e.title || e.description || 'Expense'} — ${e.category || 'General'}`,
      amount: e.amount,
      direction: 'out',
      sub: e.paidBy || 'Cash',
      status: 'Paid'
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalRevenue = activeSales.reduce((sum, s) => sum + s.grandTotal, 0);
  const totalInvoices = activeSales.length;
  const totalOut = [
    ...purchases.filter(p => isInRange(p.createdAt)),
    ...expenses.filter(e => isInRange(e.date || e.createdAt))
  ].reduce((sum, r) => sum + (r.grandTotal || r.amount || 0), 0);

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
          <ShoppingCart size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate('/inventory')} title="Inventory">
          <Package size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate('/purchases')} title="Purchases">
          <Truck size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate('/suppliers')} title="Suppliers">
          <Users size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate('/customers')} title="Customers">
          <Store size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate('/sales-history')} title="Sales History">
          <List size={20} />
        </div>
        <div className="nav-item active" title="Dashboard">
          <LayoutDashboard size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate('/reports')} title="Reports">
          <BarChart3 size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate('/expenses')} title="Expenses"><DollarSign size={20} /></div>
        <div className="nav-item" onClick={() => navigate('/hr')} title="HR"><UserCheck size={20} /></div>
        <div className="nav-item" onClick={() => navigate('/settings')} title="Settings" style={{ marginTop: 'auto' }}>
          <Settings size={20} />
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
              <ArrowUpCircle size={28} />
            </div>
            <div className="metric-info">
              <h3>Total Sales</h3>
              <p>{totalInvoices} Invoices</p>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>
              <ArrowDownCircle size={28} />
            </div>
            <div className="metric-info">
              <h3>Total Outflow</h3>
              <p>Rs. {totalOut.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
          </div>
        </div>

        {/* Payment Breakdown Cards */}
        <h2 style={{ marginTop: '2.5rem', marginBottom: '1rem', color: 'var(--text-main)', fontSize: '1.4rem' }}>Payment Split</h2>
        <div className="metrics-grid">
          <div className="metric-card" style={{ borderTop: '4px solid #10b981' }}>
            <div className="metric-icon" style={{ background: '#d1fae5', color: '#059669' }}>
              <Banknote size={20} />
            </div>
            <div className="metric-info">
              <h3 style={{ fontSize: '1.05rem' }}>Cash Revenue</h3>
              <p style={{ fontSize: '1.4rem' }}>Rs. {paymentSplit['Cash'].toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
          </div>
          <div className="metric-card" style={{ borderTop: '4px solid #3b82f6' }}>
            <div className="metric-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>
              <CreditCard size={20} />
            </div>
            <div className="metric-info">
              <h3 style={{ fontSize: '1.05rem' }}>Card Revenue</h3>
              <p style={{ fontSize: '1.4rem' }}>Rs. {paymentSplit['Card'].toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
          </div>
          <div className="metric-card" style={{ borderTop: '4px solid #8b5cf6' }}>
            <div className="metric-icon" style={{ background: '#ede9fe', color: '#7c3aed' }}>
              <Wallet size={20} />
            </div>
            <div className="metric-info">
              <h3 style={{ fontSize: '1.05rem' }}>Online Revenue</h3>
              <p style={{ fontSize: '1.4rem' }}>Rs. {(paymentSplit['Online'] || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
          </div>
        </div>

        {/* Unified Activity Ledger */}
        <section className="sales-table-section">
          <h2>💰 Activity Ledger <span style={{ fontSize: '0.85rem', fontWeight: '400', color: '#94a3b8', marginLeft: '0.5rem' }}>Ins &amp; Outs</span></h2>
          <div className="sales-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Date &amp; Time</th>
                  <th>Description</th>
                  <th>Details</th>
                  <th>Status</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center' }}>Loading data...</td></tr>
                ) : activityFeed.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: '#94a3b8' }}>No activity found for this period.</td></tr>
                ) : (
                  activityFeed.map((entry) => (
                    <tr key={entry._id + entry.type}>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                          padding: '0.25rem 0.7rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700',
                          background: entry.type === 'Sale' ? '#dcfce7' : entry.type === 'Purchase' ? '#fef2f2' : '#fef9c3',
                          color: entry.type === 'Sale' ? '#16a34a' : entry.type === 'Purchase' ? '#dc2626' : '#ca8a04'
                        }}>
                          {entry.direction === 'in' ? <ArrowUpCircle size={12} /> : <ArrowDownCircle size={12} />}
                          {entry.type}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#64748b' }}>{formatDate(entry.date)}</td>
                      <td style={{ fontWeight: '500', maxWidth: '220px' }}>{entry.description}</td>
                      <td style={{ fontSize: '0.82rem', color: '#94a3b8' }}>{entry.sub}</td>
                      <td>
                        <span className={`status-badge status-${(entry.status || '').toLowerCase().replace(' ', '-')}`}>
                          {entry.status}
                        </span>
                      </td>
                      <td style={{ fontWeight: '700', color: entry.direction === 'in' ? '#16a34a' : '#dc2626', fontSize: '1rem' }}>
                        {entry.direction === 'in' ? '+' : '-'} Rs. {(entry.amount || 0).toFixed(2)}
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

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE from '../config';
import { 
  BarChart3, LayoutDashboard, ShoppingCart, 
  Package, Settings, Store, Users, Trash2, Truck, List, DollarSign, TrendingUp, AlertTriangle, FileText, UserCheck
} from 'lucide-react';
import './Reports.css';

const Reports = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState('all');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    const activeUser = JSON.parse(localStorage.getItem('pos_user') || '{}');
    if (activeUser.shopCategory?.toLowerCase() === 'glass') {
      navigate('/glass-reports', { replace: true });
    } else if (activeUser.shopCategory === 'urdu_retail') {
      navigate('/urdu-reports', { replace: true });
    } else {
      fetchReports(timeline);
    }
  }, [timeline, navigate]);

  const fetchReports = async (selectedTimeline) => {
    try {
      const token = localStorage.getItem('pos_token');
      let url = `${API_BASE}/api/reports/summary?timeline=${selectedTimeline}`;
      if (selectedTimeline === 'custom') {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      const res = await axios.get(url, {
        headers: { 'x-auth-token': token }
      });
      setData(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to grab reports natively', err);
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      const token = localStorage.getItem('pos_token');
      let url = `${API_BASE}/api/reports/export?timeline=${timeline}`;
      if (timeline === 'custom') {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      const res = await axios.get(url, {
        headers: { 'x-auth-token': token },
        responseType: 'blob'
      });
      const urlBlob = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = urlBlob;
      link.setAttribute('download', `Financial_Report_${timeline === 'custom' ? startDate + '_to_' + endDate : timeline}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading server PDF', err);
      alert('Failed to generate PDF Report from Backend');
    }
  };

  const activeUser = JSON.parse(localStorage.getItem('pos_user') || '{}');

  if (loading) {
    return (
      <div className="reports-container">
         <main className="reports-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#64748b' }}>Calculating complex financial aggregates...</p>
         </main>
      </div>
    );
  }

  const { financials, topSellingItems, inventoryAlerts, breakdown = [] } = data;

  return (
    <div className="reports-container">
      {/* Sidebar Navigation */}
      <nav className="sidebar-min">
        <div className="nav-item" onClick={() => navigate(activeUser.shopCategory === 'Glass' ? '/glass-billing' : '/billing')} title="POS / Billing">
          <ShoppingCart size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate(activeUser.shopCategory === 'Glass' ? '/glass-inventory' : '/inventory')} title="Inventory">
          <Package size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate(activeUser.shopCategory === 'Glass' ? '/glass-purchases' : '/purchases')} title="Purchases">
          <Truck size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate('/suppliers')} title="Suppliers">
          <Users size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate('/customers')} title="Customers">
          <Store size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate(activeUser.shopCategory === 'Glass' ? '/glass-sales' : '/sales-history')} title="Sales History">
          <List size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate('/dashboard')} title="Dashboard">
          <LayoutDashboard size={20} />
        </div>
        <div className="nav-item active" title="Financial Reports">
          <BarChart3 size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate('/expenses')} title="Expenses"><DollarSign size={20} /></div>
        <div className="nav-item" onClick={() => navigate('/hr')} title="HR"><UserCheck size={20} /></div>
        <div className="nav-item" onClick={() => navigate('/settings')} title="Settings" style={{ marginTop: 'auto' }}>
          <Settings size={20} />
        </div>
      </nav>

      <main className="reports-main">
        <header className="reports-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Advanced Financial Reports</h1>
            <p>Exportable detailed accounting insights, profit charting, and category intelligence.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }} className="print-controls">
            <select 
              value={timeline} 
              onChange={(e) => {
                setLoading(true);
                setTimeline(e.target.value);
              }}
              className="timeline-select"
              style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', background: 'white', cursor: 'pointer' }}
            >
              <option value="today">Today's Report</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all">Lifetime Report</option>
              <option value="custom">Custom Range</option>
            </select>
            {timeline === 'custom' && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                />
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>to</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                />
                <button 
                  className="btn-primary" 
                  style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}
                  onClick={() => {
                    setLoading(true);
                    fetchReports('custom');
                  }}
                >
                  Apply
                </button>
              </div>
            )}
            <button className="btn-primary" onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} /> Export / Print Report
            </button>
          </div>
        </header>

        <div className="reports-content print-reports-wrapper">
          
          <div className="metrics-summary-grid">
             <div className="metric-card">
                 <div className="metric-icon" style={{ background: '#ecfdf5', color: '#10b981' }}><TrendingUp size={20} /></div>
                 <div>
                    <h3 style={{ color: '#64748b', fontSize: '0.85rem' }}>Today's Exact Revenue</h3>
                    <p style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#0f172a' }}>Rs. {financials.todaySales.toLocaleString()}</p>
                 </div>
             </div>
             <div className="metric-card">
                 <div className="metric-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}><DollarSign size={20} /></div>
                 <div>
                    <h3 style={{ color: '#64748b', fontSize: '0.85rem' }}>30-Day Monthly Revenue</h3>
                    <p style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#0f172a' }}>Rs. {financials.monthSales.toLocaleString()}</p>
                 </div>
             </div>
             <div className="metric-card">
                 <div className="metric-icon" style={{ background: '#fef2f2', color: '#ef4444' }}><Truck size={20} /></div>
                 <div>
                    <h3 style={{ color: '#64748b', fontSize: '0.85rem' }}>Total Restock Cost / Payables</h3>
                    <p style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#0f172a' }}>Rs. {financials.totalPurchases.toLocaleString()}</p>
                 </div>
             </div>
             <div className="metric-card">
                 <div className="metric-icon" style={{ background: '#ecfccb', color: '#84cc16' }}><Package size={20} /></div>
                 <div>
                    <h3 style={{ color: '#64748b', fontSize: '0.85rem' }}>Inventory  Value</h3>
                    <p style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#0f172a' }}>Rs. {financials.inventoryValue.toLocaleString()}</p>
                 </div>
             </div>
             <div className="metric-card">
                 <div className="metric-icon" style={{ background: '#fff7ed', color: '#f97316' }}><DollarSign size={20} /></div>
                 <div>
                    <h3 style={{ color: '#64748b', fontSize: '0.85rem' }}>Total Expenses ({timeline})</h3>
                    <p style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#dc2626' }}>Rs. {financials.totalExpenses.toLocaleString()}</p>
                 </div>
             </div>
             <div className="metric-card">
                 <div className="metric-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><TrendingUp size={20} /></div>
                 <div>
                    <h3 style={{ color: '#64748b', fontSize: '0.85rem' }}>Net Clean Profit ({timeline})</h3>
                    <p style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#16a34a' }}>Rs. {financials.netProfit.toLocaleString()}</p>
                 </div>
             </div>
          </div>

          <div className="reports-layout-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
            
            {/* Profit & Loss Block */}
            <div className="charts-panel" style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
               <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <BarChart3 size={18} style={{ color: '#3b82f6' }} /> Global Profit Tracker
               </h2>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                     <span style={{ fontWeight: '600', color: '#475569' }}>Total Gross Revenue:</span>
                     <span style={{ fontWeight: 'bold', color: '#0f172a' }}>Rs. {financials.totalRevenue.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                     <span style={{ fontWeight: '600', color: '#475569' }}>Total Product Cost (COGS):</span>
                     <span style={{ fontWeight: 'bold', color: '#ef4444' }}>- Rs. {financials.totalCost.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                     <span style={{ fontWeight: '600', color: '#065f46' }}>Gross Profit Margin:</span>
                     <span style={{ fontWeight: 'bold', color: '#059669', fontSize: '1.1rem' }}>+ Rs. {financials.grossProfit.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: '#fff1f2', borderRadius: '8px', border: '1px solid #fecdd3' }}>
                     <span style={{ fontWeight: '600', color: '#9f1239' }}>Operational Expenses:</span>
                     <span style={{ fontWeight: 'bold', color: '#e11d48' }}>- Rs. {financials.totalExpenses.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: '#f0fdf4', borderRadius: '8px', border: '2px solid #16a34a' }}>
                     <span style={{ fontWeight: '700', color: '#166534', fontSize: '1.1rem' }}>NET CLEAN PROFIT:</span>
                     <span style={{ fontWeight: '800', color: '#16a34a', fontSize: '1.3rem' }}>Rs. {financials.netProfit.toLocaleString()}</span>
                  </div>
               </div>
            </div>

            {/* Top Products Table */}
            <div className="charts-panel" style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
               <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <LayoutDashboard size={18} style={{ color: '#ec4899' }} /> Sold Products Performance
               </h2>
               <div style={{ overflowX: 'auto', maxHeight: '300px' }}>
                 <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                   <thead>
                     <tr>
                       <th style={{ textAlign: 'left', paddingBottom: '0.8rem', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>Item Name</th>
                       <th style={{ textAlign: 'left', paddingBottom: '0.8rem', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>Category</th>
                       <th style={{ textAlign: 'center', paddingBottom: '0.8rem', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>Qty Sold</th>
                       <th style={{ textAlign: 'right', paddingBottom: '0.8rem', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>Revenue</th>
                     </tr>
                   </thead>
                   <tbody>
                     {topSellingItems.map((item, idx) => (
                       <tr key={idx}>
                         <td style={{ padding: '0.8rem 0', borderBottom: '1px solid #f1f5f9', fontWeight: '500' }}>{item.name}</td>
                         <td style={{ padding: '0.8rem 0', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>{item.category}</td>
                         <td style={{ padding: '0.8rem 0', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>{item.qty}</td>
                         <td style={{ padding: '0.8rem 0', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontWeight: '600' }}>Rs. {item.revenue.toLocaleString()}</td>
                       </tr>
                     ))}
                     {topSellingItems.length === 0 && (
                       <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8' }}>No active sales history found!</td></tr>
                     )}
                   </tbody>
                 </table>
               </div>
            </div>

          </div>

          {/* Dynamic Sales Breakdown */}
          <div className="charts-panel" style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '1.5rem' }}>
             <h2 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <BarChart3 size={18} style={{ color: '#3b82f6' }} /> 
               {timeline === 'today' || (timeline === 'custom' && startDate === endDate) ? 'Hourly Sales Velocity' : 'Daily Sales Timeline'}
             </h2>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {breakdown.map((item, idx) => {
                  const maxRevenue = breakdown.reduce((max, i) => Math.max(max, i.revenue), 0) || 1;
                  const percent = Math.min(100, Math.max(2, (item.revenue / maxRevenue) * 100));
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '90px', fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>{item.label}</div>
                      <div style={{ flex: 1, background: '#f1f5f9', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ 
                          background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', 
                          height: '100%', 
                          width: `${percent}%`,
                          borderRadius: '6px',
                          transition: 'width 0.4s ease'
                        }}></div>
                      </div>
                      <div style={{ width: '150px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: '#64748b' }}>({item.count} sales)</span>
                        <span style={{ fontWeight: '700', color: '#0f172a' }}>Rs. {item.revenue.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
                {breakdown.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8', fontSize: '0.9rem' }}>
                    No sales data available for this range to generate breakdown.
                  </div>
                )}
             </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Reports;

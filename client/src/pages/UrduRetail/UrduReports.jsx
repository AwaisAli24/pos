import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE from '../../config';
import { 
  BarChart3, LayoutDashboard, ShoppingCart, 
  Package, Settings, Store, Users, Trash2, Truck, List, DollarSign, TrendingUp, AlertTriangle, FileText, UserCheck
} from 'lucide-react';
import '../Reports.css';

const UrduReports = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState('all');

  useEffect(() => {
    fetchReports(timeline);
  }, [timeline]);

  const fetchReports = async (selectedTimeline) => {
    try {
      const token = localStorage.getItem('pos_token');
      const res = await axios.get(`${API_BASE}/api/reports/summary?timeline=${selectedTimeline}`, {
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
      const res = await axios.get(`${API_BASE}/api/reports/export?timeline=${timeline}`, {
        headers: { 'x-auth-token': token },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Financial_Report_${timeline}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading server PDF', err);
      alert('بیک اینڈ سے پی ڈی ایف رپورٹ بنانے میں ناکام');
    }
  };

  const activeUser = JSON.parse(localStorage.getItem('pos_user') || '{}');

  if (loading) {
    return (
      <div className="reports-container urdu-rtl" style={{ direction: 'rtl', fontFamily: 'Noto Nastaliq Urdu, sans-serif' }}>
         <main className="reports-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#64748b' }}>مالیاتی حساب کتاب کیا جا رہا ہے...</p>
         </main>
      </div>
    );
  }

  const { financials, topSellingItems, inventoryAlerts } = data;
  const timelineText = timeline === 'today' ? 'آج' : timeline === 'week' ? 'اس ہفتے' : timeline === 'month' ? 'اس مہینے' : 'تمام وقت';

  return (
    <div className="reports-container urdu-rtl" style={{ direction: 'rtl', fontFamily: 'Noto Nastaliq Urdu, sans-serif' }}>
      {/* Sidebar Navigation */}
      <nav className="sidebar-min">
        <div className="nav-item" onClick={() => navigate('/urdu-billing')} title="POS / Billing">
          <ShoppingCart size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate('/urdu-inventory')} title="Inventory">
          <Package size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate('/urdu-purchases')} title="Purchases">
          <Truck size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate('/urdu-suppliers')} title="Suppliers">
          <Users size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate('/urdu-customers')} title="Customers">
          <Store size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate('/urdu-sales')} title="Sales History">
          <List size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate('/urdu-dashboard')} title="Dashboard">
          <LayoutDashboard size={20} />
        </div>
        <div className="nav-item active" title="Financial Reports">
          <BarChart3 size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate('/urdu-expenses')} title="Expenses"><DollarSign size={20} /></div>
        <div className="nav-item" onClick={() => navigate('/urdu-hr')} title="HR"><UserCheck size={20} /></div>
        <div className="nav-item" onClick={() => navigate('/urdu-settings')} title="Settings" style={{ marginTop: 'auto' }}>
          <Settings size={20} />
        </div>
      </nav>

      <main className="reports-main">
        <header className="reports-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>ایڈوانسڈ فنانشل رپورٹس</h1>
            <p>تفصیلی اکاؤنٹنگ کی بصیرت، منافع کا چارٹ، اور کیٹیگری کی معلومات۔</p>
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
              <option value="today">آج کی رپورٹ</option>
              <option value="week">اس ہفتے</option>
              <option value="month">اس مہینے</option>
              <option value="all">مکمل رپورٹ</option>
            </select>
            <button className="btn-primary" onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} /> ایکسپورٹ / پرنٹ رپورٹ
            </button>
          </div>
        </header>

        <div className="reports-content print-reports-wrapper">
          
          <div className="metrics-summary-grid">
             <div className="metric-card">
                 <div className="metric-icon" style={{ background: '#ecfdf5', color: '#10b981' }}><TrendingUp size={20} /></div>
                 <div>
                    <h3 style={{ color: '#64748b', fontSize: '0.85rem' }}>آج کی اصل آمدنی</h3>
                    <p style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#0f172a' }}>Rs. {financials.todaySales.toLocaleString()}</p>
                 </div>
             </div>
             <div className="metric-card">
                 <div className="metric-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}><DollarSign size={20} /></div>
                 <div>
                    <h3 style={{ color: '#64748b', fontSize: '0.85rem' }}>30 دن کی ماہانہ آمدنی</h3>
                    <p style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#0f172a' }}>Rs. {financials.monthSales.toLocaleString()}</p>
                 </div>
             </div>
             <div className="metric-card">
                 <div className="metric-icon" style={{ background: '#fef2f2', color: '#ef4444' }}><Truck size={20} /></div>
                 <div>
                    <h3 style={{ color: '#64748b', fontSize: '0.85rem' }}>خریداری کے کل اخراجات / قابل ادائیگی</h3>
                    <p style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#0f172a' }}>Rs. {financials.totalPurchases.toLocaleString()}</p>
                 </div>
             </div>
             <div className="metric-card">
                 <div className="metric-icon" style={{ background: '#ecfccb', color: '#84cc16' }}><Package size={20} /></div>
                 <div>
                    <h3 style={{ color: '#64748b', fontSize: '0.85rem' }}>انوینٹری کی کل مالیت</h3>
                    <p style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#0f172a' }}>Rs. {financials.inventoryValue.toLocaleString()}</p>
                 </div>
             </div>
             <div className="metric-card">
                 <div className="metric-icon" style={{ background: '#fff7ed', color: '#f97316' }}><DollarSign size={20} /></div>
                 <div>
                    <h3 style={{ color: '#64748b', fontSize: '0.85rem' }}>کل اخراجات ({timelineText})</h3>
                    <p style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#dc2626' }}>Rs. {financials.totalExpenses.toLocaleString()}</p>
                 </div>
             </div>
             <div className="metric-card">
                 <div className="metric-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><TrendingUp size={20} /></div>
                 <div>
                    <h3 style={{ color: '#64748b', fontSize: '0.85rem' }}>خالص منافع ({timelineText})</h3>
                    <p style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#16a34a' }}>Rs. {financials.netProfit.toLocaleString()}</p>
                 </div>
             </div>
          </div>

          <div className="reports-layout-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
            
            {/* Profit & Loss Block */}
            <div className="charts-panel" style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
               <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <BarChart3 size={18} style={{ color: '#3b82f6' }} /> عالمی پرافٹ ٹریکر
               </h2>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                     <span style={{ fontWeight: '600', color: '#475569' }}>کل مجموعی آمدنی:</span>
                     <span style={{ fontWeight: 'bold', color: '#0f172a' }}>Rs. {financials.totalRevenue.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                     <span style={{ fontWeight: '600', color: '#475569' }}>پروڈکٹ کی کل قیمت (COGS):</span>
                     <span style={{ fontWeight: 'bold', color: '#ef4444' }}>- Rs. {financials.totalCost.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                     <span style={{ fontWeight: '600', color: '#065f46' }}>مجموعی منافع (Gross Profit):</span>
                     <span style={{ fontWeight: 'bold', color: '#059669', fontSize: '1.1rem' }}>+ Rs. {financials.grossProfit.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: '#fff1f2', borderRadius: '8px', border: '1px solid #fecdd3' }}>
                     <span style={{ fontWeight: '600', color: '#9f1239' }}>آپریشنل اخراجات:</span>
                     <span style={{ fontWeight: 'bold', color: '#e11d48' }}>- Rs. {financials.totalExpenses.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: '#f0fdf4', borderRadius: '8px', border: '2px solid #16a34a' }}>
                     <span style={{ fontWeight: '700', color: '#166534', fontSize: '1.1rem' }}>خالص منافع (NET PROFIT):</span>
                     <span style={{ fontWeight: '800', color: '#16a34a', fontSize: '1.3rem' }}>Rs. {financials.netProfit.toLocaleString()}</span>
                  </div>
               </div>
            </div>

            {/* Top Products Table */}
            <div className="charts-panel" style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
               <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <LayoutDashboard size={18} style={{ color: '#ec4899' }} /> سب سے زیادہ فروخت ہونے والی مصنوعات
               </h2>
               <div style={{ overflowX: 'auto', maxHeight: '300px' }}>
                 <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                   <thead>
                     <tr>
                       <th style={{ textAlign: 'left', paddingBottom: '0.8rem', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>آئٹم کا نام</th>
                       <th style={{ textAlign: 'left', paddingBottom: '0.8rem', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>کیٹیگری</th>
                       <th style={{ textAlign: 'center', paddingBottom: '0.8rem', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>فروخت شدہ مقدار</th>
                       <th style={{ textAlign: 'right', paddingBottom: '0.8rem', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>آمدنی</th>
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
                       <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8' }}>فروخت کی کوئی تاریخ نہیں ملی!</td></tr>
                     )}
                   </tbody>
                 </table>
               </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default UrduReports;

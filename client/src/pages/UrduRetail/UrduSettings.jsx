import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE from '../../config';
import { 
  BarChart3, LayoutDashboard, ShoppingCart, 
  Package, Settings as SettingsIcon, Store, Users, Trash2, Truck, List, Edit2, X, DollarSign, UserCheck, ShieldCheck, Clock, Monitor, Activity
} from 'lucide-react';
import '../Settings.css';

const UrduSettings = () => {
  const navigate = useNavigate();
  const activeUser = JSON.parse(localStorage.getItem('pos_user') || '{}');
  const [activeTab, setActiveTab] = useState('shop'); // 'shop' or 'staff'
  const [shopRole, setShopRole] = useState('User');
  
  // Shop State
  const [shopData, setShopData] = useState({ name: '', phone: '', address: '', category: '', taxRate: 0 });
  const [logoFile, setLogoFile] = useState(null);
  
  // Staff State
  const [staff, setStaff] = useState([]);
  const [newStaff, setNewStaff] = useState({ fullName: '', email: '', password: '', role: 'User' });
  
  // Staff Modification State
  const [editingStaff, setEditingStaff] = useState(null);
  const [editRole, setEditRole] = useState('User');
  const [editPassword, setEditPassword] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [loginLogs, setLoginLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('pos_user') || '{}');
    if (storedUser.role) setShopRole(storedUser.role);

    const fetchData = async () => {
      try {
        const token = localStorage.getItem('pos_token');
        const shopRes = await axios.get(`${API_BASE}/api/settings/shop`, {
          headers: { 'x-auth-token': token }
        });
        if (shopRes.data) setShopData(shopRes.data);
        
        const staffRes = await axios.get(`${API_BASE}/api/settings/users`, {
          headers: { 'x-auth-token': token }
        });
        if (staffRes.data) setStaff(staffRes.data);

        fetchLoginLogs(token);
        fetchAuditLogs(token);
        
      } catch (err) {
        console.error('Failure fetching settings:', err);
      }
    };
    fetchData();
  }, []);

  const fetchLoginLogs = async (tokenOverride) => {
    try {
      setLogsLoading(true);
      const token = tokenOverride || localStorage.getItem('pos_token');
      const res = await axios.get(`${API_BASE}/api/settings/login-history`, {
        headers: { 'x-auth-token': token }
      });
      setLoginLogs(res.data);
    } catch (err) {
      console.error('Failed to fetch login logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchAuditLogs = async (tokenOverride) => {
    try {
      const token = tokenOverride || localStorage.getItem('pos_token');
      const res = await axios.get(`${API_BASE}/api/settings/audit-logs`, {
        headers: { 'x-auth-token': token }
      });
      setAuditLogs(res.data);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    }
  };

  const handleShopUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('pos_token');
      const formPayload = new FormData();
      Object.keys(shopData).forEach(key => formPayload.append(key, shopData[key]));
      if (logoFile) {
        formPayload.append('logo', logoFile);
      }

      await axios.put(`${API_BASE}/api/settings/shop`, formPayload, {
        headers: { 
          'x-auth-token': token,
          'Content-Type': 'multipart/form-data'
        }
      });
      alert('دکان کی تفصیلات کامیابی سے اپ ڈیٹ ہو گئیں!');
    } catch (err) {
      alert(err.response?.data?.message || 'خرابی پیش آگئی۔');
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('pos_token');
      const res = await axios.post(`${API_BASE}/api/settings/users`, newStaff, {
        headers: { 'x-auth-token': token }
      });
      setStaff([...staff, res.data]);
      setNewStaff({ fullName: '', email: '', password: '', role: 'User' });
      alert('کیشیئر رجسٹر ہو گیا!');
    } catch (err) {
      alert(err.response?.data?.message || 'خرابی پیش آگئی۔');
    }
  };

  const handleRemoveStaff = async (id) => {
    if(!window.confirm('کیا آپ واقعی اس ملازم کی رسائی ختم کرنا چاہتے ہیں؟')) return;
    try {
      const token = localStorage.getItem('pos_token');
      await axios.delete(`${API_BASE}/api/settings/users/${id}`, {
        headers: { 'x-auth-token': token }
      });
      setStaff(staff.filter(user => user._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'خرابی پیش آگئی۔');
    }
  };

  const handleEditStaff = async (e) => {
    e.preventDefault();
    if (!editingStaff) return;
    try {
      const token = localStorage.getItem('pos_token');
      const payload = { role: editRole };
      if (editPassword.trim().length >= 6) {
        payload.password = editPassword;
      }
      
      const res = await axios.put(`${API_BASE}/api/settings/users/${editingStaff._id}`, payload, {
        headers: { 'x-auth-token': token }
      });
      
      setStaff(staff.map(user => user._id === editingStaff._id ? res.data : user));
      setEditingStaff(null);
      setEditPassword('');
      alert('تبدیلی محفوظ ہو گئی!');
    } catch (err) {
      alert(err.response?.data?.message || 'خرابی پیش آگئی۔');
    }
  };

  return (
    <div className="settings-container urdu-rtl" style={{ direction: 'rtl', fontFamily: 'Noto Nastaliq Urdu, sans-serif' }}>
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
        <div className="nav-item" onClick={() => navigate('/urdu-reports')} title="Reports">
          <BarChart3 size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate('/urdu-expenses')} title="Expenses"><DollarSign size={20} /></div>
        <div className="nav-item" onClick={() => navigate('/urdu-hr')} title="HR"><UserCheck size={20} /></div>
        <div className="nav-item active" title="Settings" style={{ marginTop: 'auto' }}>
          <SettingsIcon size={20} />
        </div>
      </nav>

      <main className="settings-main">
        <header className="settings-header">
          <h1>سسٹم کنفیگریشن (سیٹنگز)</h1>
          <p>دکان کی تفصیلات، ٹیکس اور عملے کے اکاؤنٹس کا انتظام کریں۔</p>
        </header>

        {/* Setting Tabs Navigation */}
        <div className="settings-tabs">
          <button 
            className={`tab-btn ${activeTab === 'shop' ? 'active' : ''}`}
            onClick={() => setActiveTab('shop')}
          >
            <Store size={18} style={{ display: 'inline', marginLeft: '6px', verticalAlign: 'text-bottom' }}/> 
            دکان کی پروفائل
          </button>
          <button 
            className={`tab-btn ${activeTab === 'staff' ? 'active' : ''}`}
            onClick={() => setActiveTab('staff')}
          >
            <Users size={18} style={{ display: 'inline', marginLeft: '6px', verticalAlign: 'text-bottom' }}/> 
            عملے کا انتظام
          </button>
          
          {shopRole !== 'User' && (
            <button 
              className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('logs')}
            >
              <ShieldCheck size={18} style={{ display: 'inline', marginLeft: '6px', verticalAlign: 'text-bottom' }}/> 
              لاگ ان ہسٹری
            </button>
          )}

          {shopRole !== 'User' && (
            <button 
              className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
              onClick={() => setActiveTab('audit')}
            >
              <Activity size={18} style={{ display: 'inline', marginLeft: '6px', verticalAlign: 'text-bottom' }}/> 
              سسٹم آڈٹ
            </button>
          )}
        </div>

        {/* Tab 1: Shop Settings Form */}
        {activeTab === 'shop' && (
          <form className="settings-card" onSubmit={handleShopUpdate}>
            <h2>دکان اور تنظیم کی معلومات</h2>
            <div className="form-grid-2">
              <div className="form-group">
                <label>کمپنی / دکان کا نام</label>
                <input 
                  type="text" className="auth-input" style={{ paddingLeft: '1rem' }}
                  value={shopData.name} onChange={(e) => setShopData({...shopData, name: e.target.value})}
                  disabled={shopRole === 'User'} required
                />
              </div>
              <div className="form-group">
                <label>کاروبار کی کیٹیگری</label>
                <select 
                  className="auth-input" style={{ paddingLeft: '1rem', appearance: 'auto' }}
                  value={shopData.category} onChange={(e) => setShopData({...shopData, category: e.target.value})}
                  disabled={shopRole === 'User'}
                >
                  <option value="retail">General Retail</option>
                  <option value="urdu_retail">General Retail (Urdu)</option>
                  <option value="grocery">Grocery Store</option>
                  <option value="wholesale">Wholesale</option>
                  <option value="party">Party Decorations</option>
                  <option value="glass">Aluminum & Glass</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>فون نمبر</label>
                <input 
                  type="text" className="auth-input" style={{ paddingLeft: '1rem' }}
                  value={shopData.phone} onChange={(e) => setShopData({...shopData, phone: e.target.value})}
                  disabled={shopRole === 'User'}
                />
              </div>
              <div className="form-group">
                <label>پتہ / لوکیشن</label>
                <input 
                  type="text" className="auth-input" style={{ paddingLeft: '1rem' }}
                  value={shopData.address} onChange={(e) => setShopData({...shopData, address: e.target.value})}
                  disabled={shopRole === 'User'}
                />
              </div>
              <div className="form-group">
                <label>لوگو تبدیل کریں</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files[0])}
                  disabled={shopRole === 'User'}
                  style={{
                    padding: '0.6rem 1rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    width: '100%',
                    background: shopRole === 'User' ? '#f8fafc' : '#ffffff',
                    color: '#64748b'
                  }}
                />
                <small style={{ color: '#94a3b8', marginTop: '0.3rem', display: 'block' }}>رسید پر ظاہر ہونے والا لوگو تبدیل کریں۔</small>
              </div>
              <div className="form-group">
                <label>معیاری ٹیکس شرح (%)</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="number" className="auth-input" style={{ paddingLeft: '1rem' }}
                    value={shopData.taxRate} onChange={(e) => setShopData({...shopData, taxRate: e.target.value})}
                    min="0" max="100" step="0.01"
                    disabled={shopRole === 'User'}
                  />
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: 'bold' }}>%</span>
                </div>
                <small style={{ color: '#94a3b8', marginTop: '0.3rem', display: 'block' }}>تمام فروخت پر لاگو ہونے والا ٹیکس۔</small>
              </div>
            </div>
            
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="submit" className="btn-primary" 
                style={{ opacity: shopRole === 'User' ? 0.5 : 1, cursor: shopRole === 'User' ? 'not-allowed' : 'pointer' }}
                disabled={shopRole === 'User'}
              >
                تفصیلات محفوظ کریں
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Organizational Roster (Users) */}
        {activeTab === 'staff' && (
          <div className="settings-card">
            <h2>کیشیئرز اور عملہ</h2>
            
            <div className="staff-list">
              {staff.map(user => (
                <div key={user._id} className="staff-item">
                  <div className="staff-info">
                    <h4>{user.fullName} <span className="badge">{user.role === 'Admin' ? 'ایڈمن' : 'کیشیئر'}</span></h4>
                    <p>{user.email}</p>
                  </div>
                  {shopRole !== 'User' && (
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                      <button className="btn-secondary" style={{ padding: '0.4rem', border: '1px solid #cbd5e1' }} onClick={() => {
                        setEditingStaff(user);
                        setEditRole(user.role);
                        setEditPassword('');
                      }} title="تبدیل کریں / پاس ورڈ ری سیٹ">
                        <Edit2 size={16} />
                      </button>
                      <button className="btn-danger" onClick={() => handleRemoveStaff(user._id)} title="رسائی ختم کریں">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Edit / Reset Password Appended Modal Form inline logic */}
            {editingStaff && shopRole !== 'User' && (
              <form className="add-staff-form" style={{ marginTop: '2rem', border: '1px solid #3b82f6', background: '#eff6ff' }} onSubmit={handleEditStaff}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h3 style={{ color: "#1e3a8a" }}>تبدیلی: {editingStaff.fullName}</h3>
                  <button type="button" onClick={() => setEditingStaff(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1e3a8a' }}>
                    <X size={20} />
                  </button>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>پاس ورڈ تبدیل کریں</label>
                    <input 
                      type="password" className="auth-input" style={{ paddingLeft: '1rem' }} placeholder="پرانا رکھنے کے لیے خالی چھوڑ دیں"
                      value={editPassword} onChange={(e) => setEditPassword(e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label>اختیارات (Role)</label>
                    <select 
                      className="auth-input" style={{ paddingLeft: '1rem', appearance: 'auto' }} 
                      value={editRole} onChange={(e) => setEditRole(e.target.value)}
                    >
                      <option value="User">کیشیئر (User)</option>
                      <option value="Admin">ایڈمن (Admin)</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: '1.5rem' }}>
                  <button type="submit" className="btn-primary" style={{ background: "#2563eb" }}>
                    محفوظ کریں
                  </button>
                </div>
              </form>
            )}

            {/* Admin Add Register Form */}
            {shopRole !== 'User' && (
              <form className="add-staff-form" onSubmit={handleCreateStaff}>
                <h3 style={{ marginBottom: '1rem', color: "var(--text-main)" }}>نیا اکاؤنٹ بنائیں</h3>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>ملازم کا نام</label>
                    <input 
                      type="text" className="auth-input" style={{ paddingLeft: '1rem' }} placeholder="نام"
                      value={newStaff.fullName} onChange={(e) => setNewStaff({...newStaff, fullName: e.target.value})} required
                    />
                  </div>
                  <div className="form-group">
                    <label>ای میل (لاگ ان کے لیے)</label>
                    <input 
                      type="email" className="auth-input" style={{ paddingLeft: '1rem' }} placeholder="ای میل"
                      value={newStaff.email} onChange={(e) => setNewStaff({...newStaff, email: e.target.value})} required
                    />
                  </div>
                  <div className="form-group">
                    <label>پاس ورڈ</label>
                    <input 
                      type="password" className="auth-input" style={{ paddingLeft: '1rem' }} placeholder="••••••"
                      value={newStaff.password} onChange={(e) => setNewStaff({...newStaff, password: e.target.value})} required
                    />
                  </div>
                  <div className="form-group">
                    <label>اختیارات کا لیول</label>
                    <select 
                      className="auth-input" style={{ paddingLeft: '1rem', appearance: 'auto' }} 
                      value={newStaff.role} onChange={(e) => setNewStaff({...newStaff, role: e.target.value})}
                    >
                      <option value="User">معیاری کیشیئر (صرف بلنگ)</option>
                      <option value="Admin">ایڈمنسٹریٹر (مکمل رسائی)</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-start' }}>
                  <button type="submit" className="btn-primary" style={{ background: "var(--text-main)" }}>
                    اکاؤنٹ بنائیں
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Tab 3: Security & Login Logs */}
        {activeTab === 'logs' && shopRole !== 'User' && (
          <div className="settings-card">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Clock size={22} style={{ color: '#6366f1' }} /> عملے کی لاگ ان ہسٹری
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>سسٹم تک رسائی اور حاضری مانیٹر کرنے کے لیے حالیہ ایونٹس دیکھیں۔</p>
            
            <div style={{ overflowX: 'auto', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
               <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                       <th style={{ padding: '1rem', color: '#64748b', textAlign: 'right' }}>عملہ</th>
                       <th style={{ padding: '1rem', color: '#64748b', textAlign: 'right' }}>وقت</th>
                       <th style={{ padding: '1rem', color: '#64748b', textAlign: 'right' }}>آئی پی (IP)</th>
                       <th style={{ padding: '1rem', color: '#64748b', textAlign: 'right' }}>ڈیوائس / براؤزر</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loginLogs.map(log => (
                      <tr key={log._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                         <td style={{ padding: '1rem', fontWeight: '600', color: '#0f172a' }}>{log.userName}</td>
                         <td style={{ padding: '1rem', color: '#475569' }}>
                           <div style={{ fontSize: '0.85rem' }}>{new Date(log.loginTime).toLocaleDateString('ur-PK')}</div>
                           <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(log.loginTime).toLocaleTimeString('ur-PK')}</div>
                         </td>
                         <td style={{ padding: '1rem', color: '#64748b', fontFamily: 'monospace', fontSize: '0.85rem' }}>{log.ip}</td>
                         <td style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.75rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                           <Monitor size={14} style={{ marginLeft: '4px', verticalAlign: 'text-bottom' }} /> {log.device}
                         </td>
                      </tr>
                    ))}
                    {loginLogs.length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>کوئی ریکارڈ نہیں ملا۔</td>
                      </tr>
                    )}
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {/* Tab 4: Granular Action Audit Logs */}
        {activeTab === 'audit' && shopRole !== 'User' && (
          <div className="settings-card">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Activity size={22} style={{ color: '#ec4899' }} /> سسٹم آڈٹ (کاروباری سرگرمیاں)
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>سسٹم میں ہونے والی تبدیلیوں، حذف شدہ ریکارڈز اور دیگر اہم سرگرمیوں کی تفصیل۔</p>
            
            <div style={{ overflowX: 'auto', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
               <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                       <th style={{ padding: '1rem', color: '#64748b', textAlign: 'right' }}>عملہ</th>
                       <th style={{ padding: '1rem', color: '#64748b', textAlign: 'right' }}>سرگرمی</th>
                       <th style={{ padding: '1rem', color: '#64748b', textAlign: 'right' }}>تفصیل</th>
                       <th style={{ padding: '1rem', color: '#64748b', textAlign: 'right' }}>وقت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log, idx) => (
                      <tr key={log._id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                         <td style={{ padding: '1rem', fontWeight: '600', color: '#0f172a' }}>{log.userName}</td>
                         <td style={{ padding: '1rem' }}>
                           <span style={{ 
                             padding: '0.3rem 0.6rem', 
                             borderRadius: '6px', 
                             fontSize: '0.75rem', 
                             fontWeight: '700',
                             background: log.action.includes('DELETED') ? '#fef2f2' : log.action.includes('SALE') ? '#f0fdf4' : '#eff6ff',
                             color: log.action.includes('DELETED') ? '#ef4444' : log.action.includes('SALE') ? '#16a34a' : '#3b82f6',
                             border: `1px solid ${log.action.includes('DELETED') ? '#fecdd3' : log.action.includes('SALE') ? '#bbf7d0' : '#bfdbfe'}`
                           }}>
                             {log.action}
                           </span>
                         </td>
                         <td style={{ padding: '1rem', color: '#475569', fontSize: '0.85rem' }}>{log.description}</td>
                         <td style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                           {new Date(log.timestamp).toLocaleString('ur-PK')}
                         </td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>ابھی تک کوئی ریکارڈ نہیں ہے۔</td>
                      </tr>
                    )}
                  </tbody>
               </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default UrduSettings;

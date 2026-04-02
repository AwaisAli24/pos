import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE from '../config';
import { 
  BarChart3, LayoutDashboard, ShoppingCart, 
  Package, Settings as SettingsIcon, Store, Users, Trash2, Truck, List, Edit2, X 
} from 'lucide-react';
import './Settings.css';

const Settings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('shop'); // 'shop' or 'staff'
  const [shopRole, setShopRole] = useState('User');
  
  // Shop State
  const [shopData, setShopData] = useState({ name: '', phone: '', address: '', category: '' });
  
  // Staff State
  const [staff, setStaff] = useState([]);
  const [newStaff, setNewStaff] = useState({ fullName: '', email: '', password: '', role: 'User' });
  
  // Staff Modification State
  const [editingStaff, setEditingStaff] = useState(null);
  const [editRole, setEditRole] = useState('User');
  const [editPassword, setEditPassword] = useState('');

  useEffect(() => {
    // Extract role from Token on load safely
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
        
      } catch (err) {
        console.error('Failure fetching settings:', err);
      }
    };
    fetchData();
  }, []);

  // --- Handlers ---
  const handleShopUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('pos_token');
      await axios.put(`${API_BASE}/api/settings/shop`, shopData, {
        headers: { 'x-auth-token': token }
      });
      alert('Shop details correctly updated!');
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving shop info.');
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
      alert('Cashier seamlessly registered!');
    } catch (err) {
      alert(err.response?.data?.message || 'Error allocating staff.');
    }
  };

  const handleRemoveStaff = async (id) => {
    if(!window.confirm('Are you securely revoking this cashier?')) return;
    try {
      const token = localStorage.getItem('pos_token');
      await axios.delete(`${API_BASE}/api/settings/users/${id}`, {
        headers: { 'x-auth-token': token }
      });
      setStaff(staff.filter(user => user._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove staff.');
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
      alert('Staff credentials expertly adjusted!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to edit staff member.');
    }
  };

  return (
    <div className="settings-container">
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
        <div className="nav-item" onClick={() => navigate('/dashboard')} title="Dashboard">
          <LayoutDashboard size={24} />
        </div>
        <div className="nav-item" onClick={() => navigate('/reports')} title="Reports">
          <BarChart3 size={24} />
        </div>
        <div className="nav-item active" title="Settings" style={{ marginTop: 'auto' }}>
          <SettingsIcon size={24} />
        </div>
      </nav>

      <main className="settings-main">
        <header className="settings-header">
          <h1>System Configuration</h1>
          <p>Control POS parameters, layout rules, and organizational staff.</p>
        </header>

        {/* Setting Tabs Navigation */}
        <div className="settings-tabs">
          <button 
            className={`tab-btn ${activeTab === 'shop' ? 'active' : ''}`}
            onClick={() => setActiveTab('shop')}
          >
            <Store size={18} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }}/> 
            Shop Profile
          </button>
          <button 
            className={`tab-btn ${activeTab === 'staff' ? 'active' : ''}`}
            onClick={() => setActiveTab('staff')}
          >
            <Users size={18} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }}/> 
            User Management
          </button>
        </div>

        {/* Tab 1: Shop Settings Form */}
        {activeTab === 'shop' && (
          <form className="settings-card" onSubmit={handleShopUpdate}>
            <h2>Shop & Organization Information</h2>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Company/Shop Name</label>
                <input 
                  type="text" className="auth-input" style={{ paddingLeft: '1rem' }}
                  value={shopData.name} onChange={(e) => setShopData({...shopData, name: e.target.value})}
                  disabled={shopRole === 'User'} required
                />
              </div>
              <div className="form-group">
                <label>Primary Business Category</label>
                <input 
                  type="text" className="auth-input" style={{ paddingLeft: '1rem' }}
                  value={shopData.category} onChange={(e) => setShopData({...shopData, category: e.target.value})}
                  disabled={shopRole === 'User'}
                />
              </div>
              <div className="form-group">
                <label>Contact Phone</label>
                <input 
                  type="text" className="auth-input" style={{ paddingLeft: '1rem' }}
                  value={shopData.phone} onChange={(e) => setShopData({...shopData, phone: e.target.value})}
                  disabled={shopRole === 'User'}
                />
              </div>
              <div className="form-group">
                <label>Physical Address / Location</label>
                <input 
                  type="text" className="auth-input" style={{ paddingLeft: '1rem' }}
                  value={shopData.address} onChange={(e) => setShopData({...shopData, address: e.target.value})}
                  disabled={shopRole === 'User'}
                />
              </div>
            </div>
            
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="submit" className="btn-primary" 
                style={{ opacity: shopRole === 'User' ? 0.5 : 1, cursor: shopRole === 'User' ? 'not-allowed' : 'pointer' }}
                disabled={shopRole === 'User'}
              >
                Save Details
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Organizational Roster (Users) */}
        {activeTab === 'staff' && (
          <div className="settings-card">
            <h2>Authorized Cashiers & Staff</h2>
            
            <div className="staff-list">
              {staff.map(user => (
                <div key={user._id} className="staff-item">
                  <div className="staff-info">
                    <h4>{user.fullName} <span className="badge">{user.role}</span></h4>
                    <p>{user.email}</p>
                  </div>
                  {shopRole !== 'User' && (
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                      <button className="btn-secondary" style={{ padding: '0.4rem', border: '1px solid #cbd5e1' }} onClick={() => {
                        setEditingStaff(user);
                        setEditRole(user.role);
                        setEditPassword('');
                      }} title="Edit Cashier / Reset Pass">
                        <Edit2 size={16} />
                      </button>
                      <button className="btn-danger" onClick={() => handleRemoveStaff(user._id)} title="Revoke Access">
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
                  <h3 style={{ color: "#1e3a8a" }}>Adjusting Configuration: {editingStaff.fullName}</h3>
                  <button type="button" onClick={() => setEditingStaff(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1e3a8a' }}>
                    <X size={20} />
                  </button>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Emergency Password Reset</label>
                    <input 
                      type="password" className="auth-input" style={{ paddingLeft: '1rem' }} placeholder="Leave blank to keep old pass"
                      value={editPassword} onChange={(e) => setEditPassword(e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Modify System Clearance</label>
                    <select 
                      className="auth-input" style={{ paddingLeft: '1rem' }} 
                      value={editRole} onChange={(e) => setEditRole(e.target.value)}
                    >
                      <option value="User">Standard Cashier</option>
                      <option value="Admin">Full Stack Administrator</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: '1.5rem' }}>
                  <button type="submit" className="btn-primary" style={{ background: "#2563eb" }}>
                    Commit Configuration Rules
                  </button>
                </div>
              </form>
            )}

            {/* Admin Add Register Form */}
            {shopRole !== 'User' && (
              <form className="add-staff-form" onSubmit={handleCreateStaff}>
                <h3 style={{ marginBottom: '1rem', color: "var(--text-main)" }}>Issue New Access Key</h3>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Employee Name</label>
                    <input 
                      type="text" className="auth-input" style={{ paddingLeft: '1rem' }} placeholder="John Doe"
                      value={newStaff.fullName} onChange={(e) => setNewStaff({...newStaff, fullName: e.target.value})} required
                    />
                  </div>
                  <div className="form-group">
                    <label>Account Route (Email)</label>
                    <input 
                      type="email" className="auth-input" style={{ paddingLeft: '1rem' }} placeholder="john@pos.com"
                      value={newStaff.email} onChange={(e) => setNewStaff({...newStaff, email: e.target.value})} required
                    />
                  </div>
                  <div className="form-group">
                    <label>PIN or Access Password</label>
                    <input 
                      type="password" className="auth-input" style={{ paddingLeft: '1rem' }} placeholder="••••••"
                      value={newStaff.password} onChange={(e) => setNewStaff({...newStaff, password: e.target.value})} required
                    />
                  </div>
                  <div className="form-group">
                    <label>Permission Clearance Level</label>
                    <select 
                      className="auth-input" style={{ paddingLeft: '1rem' }} 
                      value={newStaff.role} onChange={(e) => setNewStaff({...newStaff, role: e.target.value})}
                    >
                      <option value="User">Standard Cashier (Billing Only)</option>
                      <option value="Admin">Full Stack Administrator</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-start' }}>
                  <button type="submit" className="btn-primary" style={{ background: "var(--text-main)" }}>
                    Generate Employee Token
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

      </main>
    </div>
  );
};

export default Settings;

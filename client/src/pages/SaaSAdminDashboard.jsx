import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE from '../config';
import {
  LayoutDashboard, Store, Users, DollarSign, Activity, LogIn, LogOut, Search, ShieldAlert, ShieldCheck, ListOrdered, Lock, Trash2, Key, X
} from 'lucide-react';
import './SaaSAdminDashboard.css';

const SaaSAdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({ totalShops: 0, totalUsers: 0, totalRevenue: 0, totalTransactions: 0 });
  const [shops, setShops] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [selectedShopForUsers, setSelectedShopForUsers] = useState(null);
  const [shopUsers, setShopUsers] = useState([]);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const activeUser = JSON.parse(localStorage.getItem('pos_user') || '{}');
  const token = localStorage.getItem('pos_token');

  useEffect(() => {
    // Safety redirect: make sure only SaaS Admins can view this
    if (activeUser.role !== 'SaaS Admin') {
      navigate('/login', { replace: true });
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { 'x-auth-token': token };

      const statsRes = await axios.get(`${API_BASE}/api/saas-admin/dashboard`, { headers });
      setStats(statsRes.data);

      const shopsRes = await axios.get(`${API_BASE}/api/saas-admin/shops`, { headers });
      setShops(shopsRes.data);

      const salesRes = await axios.get(`${API_BASE}/api/saas-admin/sales`, { headers });
      setSales(salesRes.data);
    } catch (err) {
      console.error('Error fetching admin data', err);
      alert('Failed to retrieve system details. Please check authorization.');
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = async (shop) => {
    if (!window.confirm(`Are you sure you want to log in and impersonate "${shop.name}"?`)) return;

    try {
      const headers = { 'x-auth-token': token };
      const res = await axios.post(`${API_BASE}/api/saas-admin/impersonate/${shop._id}`, {}, { headers });

      if (res.data && res.data.token) {
        // Store original admin session details for return banner
        localStorage.setItem('saas_admin_token', token);
        localStorage.setItem('saas_admin_user', JSON.stringify(activeUser));

        // Overwrite standard session with target store's session
        localStorage.setItem('pos_token', res.data.token);
        localStorage.setItem('pos_user', JSON.stringify(res.data.user));

        // Route instantly to target store's POS depending on category
        const category = shop.category || 'Retail';
        alert(`Access Granted! Logging in as Admin for: ${shop.name}`);
        window.location.href = category.toLowerCase() === 'glass' ? '/glass-billing' : '/billing';
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to impersonate store.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_user');
    localStorage.removeItem('saas_admin_token');
    localStorage.removeItem('saas_admin_user');
    navigate('/login', { replace: true });
  };

  const openUsersModal = (shop) => {
    setSelectedShopForUsers(shop);
    setIsUsersModalOpen(true);
    fetchShopUsers(shop._id);
  };

  const fetchShopUsers = async (shopId) => {
    try {
      setLoadingUsers(true);
      const headers = { 'x-auth-token': token };
      const res = await axios.get(`${API_BASE}/api/saas-admin/shops/${shopId}/users`, { headers });
      setShopUsers(res.data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to fetch shop users.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleResetUserPassword = async (user) => {
    const newPassword = window.prompt(`Enter a new password for ${user.fullName} (${user.email}):\n(Minimum 6 characters)`);
    if (newPassword === null) return; // cancelled
    if (newPassword.trim().length < 6) {
      return alert('New password must be at least 6 characters.');
    }

    try {
      const headers = { 'x-auth-token': token };
      const res = await axios.post(`${API_BASE}/api/saas-admin/users/${user._id}/reset-password`, { newPassword: newPassword.trim() }, { headers });
      alert(res.data.message || 'Password reset successful!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reset user password.');
    }
  };

  const handleDeleteShop = async (shop) => {
    if (!window.confirm(`⚠️ WARNING: Deleting "${shop.name}" will permanently erase this store and all associated user accounts, sales, products, expenses, and logs.\n\nAre you sure you want to proceed?`)) {
      return;
    }

    const confirmName = window.prompt(`To confirm deletion, please type the store name exactly:\n"${shop.name}"`);
    if (confirmName !== shop.name) {
      return alert('Store name did not match. Deletion aborted.');
    }

    try {
      const headers = { 'x-auth-token': token };
      const res = await axios.delete(`${API_BASE}/api/saas-admin/shops/${shop._id}`, { headers });
      alert(res.data.message || 'Store deleted successfully.');
      fetchData(); // Refresh the dashboard list & stats
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete store.');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return alert('New password and Confirm password do not match.');
    }
    if (passwordForm.newPassword.length < 6) {
      return alert('New password must be at least 6 characters.');
    }

    try {
      setUpdatingPassword(true);
      const headers = { 'x-auth-token': token };
      const res = await axios.post(`${API_BASE}/api/saas-admin/change-password`, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      }, { headers });
      
      alert(res.data.message || 'Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setActiveTab('dashboard');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const filteredShops = shops.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.address || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSales = sales.filter(s =>
    s.invoiceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.shop?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.cashier?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="saas-admin-container">
      {/* Sidebar navigation */}
      <aside className="saas-sidebar">
        <div className="saas-logo">
          <ShieldCheck size={28} color="#3b82f6" />
          <h2>System Control</h2>
        </div>
        <nav className="saas-nav">
          <div
            className={`saas-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setActiveTab('dashboard'); setSearchTerm(''); }}
          >
            <LayoutDashboard size={20} />
            <span>Overview</span>
          </div>
          <div
            className={`saas-nav-item ${activeTab === 'shops' ? 'active' : ''}`}
            onClick={() => { setActiveTab('shops'); setSearchTerm(''); }}
          >
            <Store size={20} />
            <span>Store Accounts</span>
          </div>
          <div
            className={`saas-nav-item ${activeTab === 'sales' ? 'active' : ''}`}
            onClick={() => { setActiveTab('sales'); setSearchTerm(''); }}
          >
            <Activity size={20} />
            <span>Global Transactions</span>
          </div>
          <div
            className={`saas-nav-item ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => { setActiveTab('password'); setSearchTerm(''); }}
          >
            <Lock size={20} />
            <span>Change Password</span>
          </div>
          <button className="saas-btn-logout" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </nav>
      </aside>

      {/* Main viewport */}
      <main className="saas-main">
        <header className="saas-header">
          <div>
            <h1>SaaS Administrator Panel</h1>
            <p>View global statistics, audit transactions, and securely manage store accounts.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <ShieldAlert size={16} />
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Authenticated SaaS Super User</span>
          </div>
        </header>

        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            <p style={{ fontSize: '1.2rem', fontWeight: '600' }}>Accessing SaaS Backend... Please wait.</p>
          </div>
        ) : (
          <>
            {/* Overview Stats Cards */}
            {activeTab === 'dashboard' && (
              <>
                <div className="saas-stats-grid">
                  <div className="saas-stat-card">
                    <div className="saas-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                      <Store size={24} />
                    </div>
                    <div className="saas-stat-info">
                      <h3>Total Stores</h3>
                      <p>{stats.totalShops}</p>
                    </div>
                  </div>
                  <div className="saas-stat-card">
                    <div className="saas-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                      <DollarSign size={24} />
                    </div>
                    <div className="saas-stat-info">
                      <h3>Global Revenue</h3>
                      <p>Rs. {stats.totalRevenue.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="saas-stat-card">
                    <div className="saas-stat-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
                      <Activity size={24} />
                    </div>
                    <div className="saas-stat-info">
                      <h3>Total Invoices</h3>
                      <p>{stats.totalTransactions}</p>
                    </div>
                  </div>
                  <div className="saas-stat-card">
                    <div className="saas-stat-icon" style={{ background: 'rgba(249, 115, 22, 0.15)', color: '#f97316' }}>
                      <Users size={24} />
                    </div>
                    <div className="saas-stat-info">
                      <h3>Total Accounts</h3>
                      <p>{stats.totalUsers}</p>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.5rem' }}>
                  {/* Latest Registered Shops */}
                  <div className="saas-content-card">
                    <h2 style={{ marginBottom: '1rem', display: 'flex', gap: '8px', alignItems: 'center' }}><Store size={18} color="#3b82f6" /> Recent Shops</h2>
                    <table className="saas-table" style={{ fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th>Shop Name</th>
                          <th>Category</th>
                          <th>Registered</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shops.slice(0, 5).map(s => (
                          <tr key={s._id}>
                            <td style={{ fontWeight: 'bold' }}>{s.name}</td>
                            <td><span className={`saas-badge ${s.category?.toLowerCase()}`}>{s.category || 'Retail'}</span></td>
                            <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Latest Global Sales */}
                  <div className="saas-content-card">
                    <h2 style={{ marginBottom: '1rem', display: 'flex', gap: '8px', alignItems: 'center' }}><Activity size={18} color="#10b981" /> System Sales Log</h2>
                    <table className="saas-table" style={{ fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th>Invoice ID</th>
                          <th>Store</th>
                          <th>Total Value</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sales.slice(0, 5).map(sale => (
                          <tr key={sale._id}>
                            <td style={{ fontFamily: 'monospace', color: '#60a5fa' }}>{sale.invoiceId}</td>
                            <td style={{ fontWeight: '600' }}>{sale.shop?.name || 'Deleted Store'}</td>
                            <td>Rs. {sale.grandTotal.toFixed(0)}</td>
                            <td>{new Date(sale.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* Shops Management View */}
            {activeTab === 'shops' && (
              <div className="saas-content-card">
                <div className="saas-card-header">
                  <h2>Active Stores Directory ({filteredShops.length})</h2>
                  <div className="saas-search-bar">
                    <Search size={16} />
                    <input
                      type="text"
                      placeholder="Search stores by name, category..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className="saas-table">
                    <thead>
                      <tr>
                        <th>Store Name</th>
                        <th>Category</th>
                        <th>Contact</th>
                        <th>Address</th>
                        <th>Date Joined</th>
                        <th style={{ textAlign: 'center' }}>Users</th>
                        <th>Total Revenue</th>
                        <th>Transactions</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredShops.map(shop => (
                        <tr key={shop._id}>
                          <td style={{ fontWeight: 'bold', fontSize: '1rem' }}>{shop.name}</td>
                          <td><span className={`saas-badge ${shop.category?.toLowerCase()}`}>{shop.category || 'Retail'}</span></td>
                          <td>{shop.phone || '-'}</td>
                          <td>{shop.address || '-'}</td>
                          <td>{new Date(shop.createdAt).toLocaleDateString()}</td>
                          <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{shop.userCount}</td>
                          <td style={{ fontWeight: 'bold', color: '#10b981' }}>Rs. {shop.revenue.toLocaleString()}</td>
                          <td style={{ fontWeight: 'bold' }}>{shop.salesCount}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <button
                                className="saas-btn-impersonate"
                                onClick={() => handleImpersonate(shop)}
                                title="Securely log into this store's dashboard"
                              >
                                <LogIn size={14} />
                                <span>Login</span>
                              </button>
                              <button
                                className="saas-btn-secondary"
                                onClick={() => openUsersModal(shop)}
                                title="Manage store user accounts and reset passwords"
                              >
                                <Users size={14} />
                                <span>Users</span>
                              </button>
                              <button
                                className="saas-btn-danger"
                                onClick={() => handleDeleteShop(shop)}
                                title="Permanently delete this shop and all associated data"
                              >
                                <Trash2 size={14} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredShops.length === 0 && (
                        <tr>
                          <td colSpan="9" style={{ textAlign: 'center', color: '#64748b', padding: '3rem' }}>
                            No stores match your search query.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Global Sales Audit View */}
            {activeTab === 'sales' && (
              <div className="saas-content-card">
                <div className="saas-card-header">
                  <h2>System-wide Sales Transaction Audit Log</h2>
                  <div className="saas-search-bar">
                    <Search size={16} />
                    <input
                      type="text"
                      placeholder="Search by invoice ID, store, customer..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className="saas-table">
                    <thead>
                      <tr>
                        <th>Invoice ID</th>
                        <th>Store Name</th>
                        <th>Date & Time</th>
                        <th>Cashier</th>
                        <th>Customer</th>
                        <th>Value</th>
                        <th>Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSales.map(sale => (
                        <tr key={sale._id}>
                          <td style={{ fontFamily: 'monospace', color: '#60a5fa', fontWeight: 'bold' }}>{sale.invoiceId}</td>
                          <td style={{ fontWeight: 'bold' }}>{sale.shop?.name || 'Deleted Store'}</td>
                          <td>{new Date(sale.createdAt).toLocaleString()}</td>
                          <td>{sale.cashier?.fullName || 'System Admin'}</td>
                          <td>{sale.customerName || 'Guest'}</td>
                          <td style={{ fontWeight: 'bold', color: '#10b981' }}>Rs. {sale.grandTotal.toLocaleString()}</td>
                          <td>{sale.paymentMethod}</td>
                        </tr>
                      ))}
                      {filteredSales.length === 0 && (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', color: '#64748b', padding: '3rem' }}>
                            No transactions found matching your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Change Password View */}
            {activeTab === 'password' && (
              <div className="saas-content-card" style={{ maxWidth: '500px', margin: '0 auto', width: '100%' }}>
                <h2 style={{ marginBottom: '1.5rem', display: 'flex', gap: '8px', alignItems: 'center' }}><Lock size={20} color="#3b82f6" /> Change Account Password</h2>
                <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#94a3b8' }}>Current Password</label>
                    <input 
                      type="password" 
                      className="saas-input" 
                      required
                      placeholder="Enter current password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#94a3b8' }}>New Password</label>
                    <input 
                      type="password" 
                      className="saas-input" 
                      required
                      placeholder="At least 6 characters"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#94a3b8' }}>Confirm New Password</label>
                    <input 
                      type="password" 
                      className="saas-input" 
                      required
                      placeholder="Repeat new password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="saas-btn-impersonate" 
                    style={{ width: '100%', padding: '0.75rem', justifyContent: 'center', marginTop: '1rem' }}
                    disabled={updatingPassword}
                  >
                    {updatingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </main>

      {/* Manage Users Modal */}
      {isUsersModalOpen && (
        <div className="saas-modal-overlay">
          <div className="saas-modal">
            <div className="saas-modal-header">
              <h3>Manage Users - {selectedShopForUsers?.name}</h3>
              <button className="saas-modal-close" onClick={() => setIsUsersModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="saas-modal-body">
              {loadingUsers ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  Loading users...
                </div>
              ) : shopUsers.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  No users registered for this shop.
                </div>
              ) : (
                shopUsers.map(user => (
                  <div key={user._id} className="saas-user-item">
                    <div className="saas-user-info">
                      <span className="saas-user-name">{user.fullName}</span>
                      <span className="saas-user-email">{user.email}</span>
                      <span className="saas-user-role">{user.role}</span>
                    </div>
                    <div className="saas-user-actions">
                      <button 
                        className="saas-btn-impersonate"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                        onClick={() => handleResetUserPassword(user)}
                        title="Reset this user's password"
                      >
                        <Key size={12} />
                        <span>Reset Password</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaaSAdminDashboard;

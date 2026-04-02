import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  BarChart3, LayoutDashboard, ShoppingCart, 
  Package, Settings, Store, Users, Edit3, Phone, Mail, MapPin, Truck, List, Plus, X, Search
} from 'lucide-react';
import './Dashboard.css'; // Reuse core list UI

const Customers = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // CRM Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCustomerId, setCurrentCustomerId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  const activeUser = JSON.parse(localStorage.getItem('pos_user') || '{}');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('pos_token');
      const res = await axios.get('http://localhost:5000/api/customers', {
        headers: { 'x-auth-token': token }
      });
      setCustomers(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch CRM data', err);
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentCustomerId(null);
    setFormData({ name: '', phone: '', email: '', address: '' });
    setIsFormOpen(true);
  };

  const openEditModal = (customer) => {
    setIsEditing(true);
    setCurrentCustomerId(customer._id);
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || ''
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return alert('Customer Name is explicitly required.');

    try {
      const token = localStorage.getItem('pos_token');
      if (isEditing) {
        await axios.put(`http://localhost:5000/api/customers/${currentCustomerId}`, formData, {
          headers: { 'x-auth-token': token }
        });
        alert('CRM Profile Updated!');
      } else {
        await axios.post('http://localhost:5000/api/customers', formData, {
          headers: { 'x-auth-token': token }
        });
        alert('New Customer Registered in CRM!');
      }
      setIsFormOpen(false);
      fetchCustomers();
    } catch (err) {
      alert(err.response?.data?.message || 'Error processing CRM request natively.');
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.phone && c.phone.includes(searchTerm))
  );

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
        <div className="nav-item active" title="Customers CRM">
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
        <div className="nav-item" onClick={() => navigate('/settings')} title="Settings" style={{ marginTop: 'auto' }}>
          <Settings size={24} />
        </div>
      </nav>

      <main className="dashboard-main" style={{ display: 'block', overflowY: 'auto', paddingBottom: '3rem' }}>
        <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1>Customer Relationship Management</h1>
            <p>Track guest loyalty, lifetime spending, and demographic contact information naturally.</p>
          </div>
          <button className="btn-primary" onClick={openAddModal} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={18}/> New Customer
          </button>
        </header>

        <div className="sales-controls">
           <div className="search-wrapper" style={{ position: 'relative', width: '400px' }}>
             <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
             <input 
               type="text" 
               placeholder="Search CRM by Customer Name or Phone Number..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               style={{ 
                 width: '100%', 
                 padding: '0.8rem 1rem 0.8rem 2.8rem', 
                 borderRadius: '12px', 
                 border: '1px solid #cbd5e1', 
                 outline: 'none',
                 fontSize: '0.95rem',
                 color: '#0f172a',
                 boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                 transition: 'all 0.2s ease',
                 background: '#f8fafc'
               }}
               onFocus={(e) => {
                 e.target.style.borderColor = '#3b82f6';
                 e.target.style.background = '#ffffff';
                 e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
               }}
               onBlur={(e) => {
                 e.target.style.borderColor = '#cbd5e1';
                 e.target.style.background = '#f8fafc';
                 e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
               }}
             />
           </div>
        </div>

        <div className="sales-table-wrapper" style={{ marginTop: '1.5rem', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '1rem', color: '#64748b', fontWeight: '600' }}>Customer Name</th>
                <th style={{ padding: '1rem', color: '#64748b', fontWeight: '600' }}>Contact Number</th>
                <th style={{ padding: '1rem', color: '#64748b', fontWeight: '600' }}>Lifetime Value (LTV)</th>
                <th style={{ padding: '1rem', color: '#64748b', fontWeight: '600' }}>Last Active Checkout</th>
                <th style={{ padding: '1rem', textAlign: 'right', color: '#64748b', fontWeight: '600' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(customer => (
                <tr key={customer._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem', fontWeight: '500', color: '#0f172a' }}>{customer.name}</td>
                  <td style={{ padding: '1rem', color: '#475569' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Phone size={14} style={{ opacity: 0.5 }}/> {customer.phone || 'N/A'}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: '#10b981' }}>Rs. {customer.totalSpent?.toLocaleString()}</td>
                  <td style={{ padding: '1rem', color: '#64748b' }}>
                    {customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString() : 'Never'}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button className="btn-icon-action" onClick={() => openEditModal(customer)}>
                      <Edit3 size={16} /> Edit Profile
                    </button>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && !loading && (
                 <tr>
                   <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                     <Users size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auo' }} />
                     <p>No customers exist in the CRM Database globally.</p>
                   </td>
                 </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </main>

      {/* CRM Entry Modal */}
      {isFormOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '90%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem 2rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <h2 style={{ fontSize: '1.2rem' }}>{isEditing ? 'Edit Customer Profile' : 'Register New Customer'}</h2>
              <button onClick={() => setIsFormOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontWeight: '600', color: '#475569', fontSize: '0.9rem' }}>Full Legal Name *</label>
                  <input type="text" name="name" required value={formData.name} onChange={handleInputChange} placeholder="e.g. John Doe" style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
               </div>

               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontWeight: '600', color: '#475569', fontSize: '0.9rem' }}>Contact Number</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="+92 3XX XXXXXXX" style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
               </div>

               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontWeight: '600', color: '#475569', fontSize: '0.9rem' }}>Email Address</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="guest@business.com" style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
               </div>

               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontWeight: '600', color: '#475569', fontSize: '0.9rem' }}>Shipping / Home Address</label>
                  <textarea name="address" rows="3" value={formData.address} onChange={handleInputChange} placeholder="e.g. 123 Baker St..." style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'none' }} />
               </div>

               <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '0.5rem 0' }} />

               <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                 <button type="button" onClick={() => setIsFormOpen(false)} style={{ padding: '0.8rem 1.5rem', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#64748b', fontWeight: '600', cursor: 'pointer' }}>Discard</button>
                 <button type="submit" style={{ padding: '0.8rem 1.5rem', background: '#2563eb', border: 'none', borderRadius: '8px', color: 'white', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)' }}>
                   {isEditing ? 'Save Profile' : 'Add to Database'}
                 </button>
               </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Customers;

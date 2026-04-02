import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Plus, LayoutDashboard, ShoppingCart, 
  Package, Settings, Truck, Users, User, Phone, Mail, MapPin, Edit2, Trash2, X, List, Store, BarChart3
} from 'lucide-react';
import './Suppliers.css';

const Suppliers = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  
  const [form, setForm] = useState({
    name: '', contactPerson: '', phone: '', email: '', address: ''
  });

  const activeUser = JSON.parse(localStorage.getItem('pos_user') || '{}');
  const isCashier = activeUser.role === 'User';

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const token = localStorage.getItem('pos_token');
        const res = await axios.get('http://localhost:5000/api/suppliers', {
          headers: { 'x-auth-token': token }
        });
        setSuppliers(res.data);
      } catch (err) {
        console.error('Failed to grab suppliers', err);
      }
    };
    fetchSuppliers();
  }, []);

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const openAddModal = () => {
    setEditingSupplier(null);
    setForm({ name: '', contactPerson: '', phone: '', email: '', address: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (supplier) => {
    setEditingSupplier(supplier);
    setForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('pos_token');
    try {
      if (editingSupplier) {
        const res = await axios.put(`http://localhost:5000/api/suppliers/${editingSupplier._id}`, form, {
          headers: { 'x-auth-token': token }
        });
        setSuppliers(suppliers.map(sup => sup._id === editingSupplier._id ? res.data : sup));
      } else {
        const res = await axios.post('http://localhost:5000/api/suppliers', form, {
          headers: { 'x-auth-token': token }
        });
        setSuppliers([res.data, ...suppliers]);
      }
      setIsModalOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving supplier');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this supplier?")) return;
    try {
      const token = localStorage.getItem('pos_token');
      await axios.delete(`http://localhost:5000/api/suppliers/${id}`, {
        headers: { 'x-auth-token': token }
      });
      setSuppliers(suppliers.filter(sup => sup._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Error removing supplier');
    }
  };

  return (
    <div className="suppliers-container">
      {/* Universal Main Sidebar Navigation */}
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
        <div className="nav-item active" title="Suppliers">
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
        <div className="nav-item" onClick={() => navigate('/settings')} title="Settings" style={{ marginTop: 'auto' }}>
          <Settings size={24} />
        </div>
      </nav>

      {/* Main Container Work Area */}
      <main className="suppliers-main">
        <header className="suppliers-header">
          <div className="suppliers-title-group">
            <h1>Vendors & Suppliers</h1>
            <p>Manage contact information for your wholesale distributors</p>
          </div>
          <div className="header-actions">
            {!isCashier && (
              <button className="btn-primary" onClick={openAddModal}>
                <Plus size={18} /> Add New Supplier
              </button>
            )}
          </div>
        </header>

        {suppliers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '6rem 0', color: '#94a3b8' }}>
            <Truck size={64} style={{ opacity: 0.5, marginBottom: '1rem' }} />
            <h2>No Suppliers Found</h2>
            <p>You haven't added any suppliers or vendors to your network yet.</p>
          </div>
        ) : (
          <div className="suppliers-list">
            {suppliers.map(supplier => (
              <div key={supplier._id} className="supplier-card">
                <div className="supplier-header-block">
                  <h3>{supplier.name}</h3>
                  {!isCashier && (
                    <div className="supplier-actions">
                      <button className="btn-icon-small" onClick={() => openEditModal(supplier)}>
                        <Edit2 size={16} />
                      </button>
                      <button className="btn-icon-small delete" onClick={() => handleDelete(supplier._id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {supplier.contactPerson && (
                    <div className="supplier-info-line">
                      <User size={16} /> <span>{supplier.contactPerson}</span>
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="supplier-info-line">
                      <Phone size={16} /> <span>{supplier.phone}</span>
                    </div>
                  )}
                  {supplier.email && (
                    <div className="supplier-info-line">
                      <Mail size={16} /> <span>{supplier.email}</span>
                    </div>
                  )}
                  {supplier.address && (
                    <div className="supplier-info-line">
                      <MapPin size={16} /> <span>{supplier.address}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add / Edit Form Modal Handler */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="supplier-modal">
            <div className="modal-header">
              <h2>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
              <button className="btn-close" onClick={() => setIsModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-form" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label>Company / Supplier Name</label>
                  <input type="text" name="name" className="auth-input" style={{ paddingLeft: '1rem' }} value={form.name} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>Contact Person (Optional)</label>
                  <input type="text" name="contactPerson" className="auth-input" style={{ paddingLeft: '1rem' }} value={form.contactPerson} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Phone Number (Optional)</label>
                  <input type="text" name="phone" className="auth-input" style={{ paddingLeft: '1rem' }} value={form.phone} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Email Address (Optional)</label>
                  <input type="email" name="email" className="auth-input" style={{ paddingLeft: '1rem' }} value={form.email} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Physical Address (Optional)</label>
                  <input type="text" name="address" className="auth-input" style={{ paddingLeft: '1rem' }} value={form.address} onChange={handleInputChange} />
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Suppliers;

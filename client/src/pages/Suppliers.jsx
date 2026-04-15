import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE from '../config';
import { 
  Plus, LayoutDashboard, ShoppingCart, 
  Package, Settings, Truck, Users, User, Phone, Mail, MapPin, Edit2, Trash2, X, List, Store, BarChart3, DollarSign, UserCheck, Search, FileText
} from 'lucide-react';
import './Suppliers.css';

const Suppliers = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  // Credit system states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [currentSupplierId, setCurrentSupplierId] = useState(null);
  const [supplierLedger, setSupplierLedger] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [paymentData, setPaymentData] = useState({ amount: '', paymentMethod: 'Cash', description: '' });
  const [paymentReceiptData, setPaymentReceiptData] = useState(null);

  const [form, setForm] = useState({
    name: '', contactPerson: '', phone: '', email: '', address: ''
  });

  const activeUser = JSON.parse(localStorage.getItem('pos_user') || '{}');
  const isCashier = activeUser.role === 'User';

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.contactPerson && s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem('pos_token');
      const res = await axios.get(`${API_BASE}/api/suppliers`, { headers: { 'x-auth-token': token } });
      setSuppliers(res.data);
    } catch (err) {
      console.error('Failed to grab suppliers', err);
    }
  };

  const fetchSupplierLedger = async (sid) => {
    try {
      setLedgerLoading(true);
      const token = localStorage.getItem('pos_token');
      const res = await axios.get(`${API_BASE}/api/suppliers/${sid}/ledger`, { headers: { 'x-auth-token': token } });
      setSupplierLedger(res.data);
      setIsLedgerModalOpen(true);
    } catch (err) {
      console.error('Failed to fetch ledger', err);
    } finally {
      setLedgerLoading(false);
    }
  };

  const printPaymentReceipt = (data) => {
    const shopName = activeUser.shopName || 'MY STORE';
    const html = `
      <!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Supplier Payment</title>
      <style>
        @page { margin: 4mm; size: 80mm auto; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #000; width: 72mm; text-align: center; }
        h2 { font-size: 15px; font-weight: 900; margin-bottom: 2px; }
        .sub { font-size: 10px; margin-bottom: 8px; }
        .dash { border-top: 1.5px dashed #000; margin: 6px 0; }
        .title { font-weight: 800; font-size: 11px; letter-spacing: 1px; margin: 4px 0; }
        .info { text-align: left; font-size: 11px; line-height: 1.8; }
        .row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; }
        .total-row { border-top: 2px solid #000; margin-top: 6px; padding-top: 5px; display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; }
        .balance-row { margin-top: 4px; display: flex; justify-content: space-between; font-size: 12px; font-weight: 800; border-top: 1px solid #000; padding-top: 4px; }
        .note { margin-top: 6px; font-size: 10px; font-style: italic; text-align: left; }
        .thanks { font-size: 10px; color: #555; margin-top: 4px; }
      </style></head><body>
        <h2>${shopName}</h2>
        <div class="dash"></div>
        <p class="title">SUPPLIER PAYMENT RECEIPT</p>
        <div class="dash"></div>
        <div class="info">
          <p><b>Receipt ID:</b> ${data.receiptId}</p>
          <p><b>Date:</b> ${data.date.toLocaleString()}</p>
          <p><b>Recorded By:</b> ${data.cashier}</p>
          <p><b>Supplier:</b> ${data.supplierName}</p>
          ${data.supplierPhone ? `<p><b>Phone:</b> ${data.supplierPhone}</p>` : ''}
        </div>
        <div class="dash"></div>
        <div class="row"><span>Previous Balance</span><span><b>Rs. ${data.previousBalance.toLocaleString()}</b></span></div>
        <div class="row"><span>Payment Method</span><span>${data.paymentMethod}</span></div>
        <div class="total-row"><span>AMOUNT PAID</span><span>Rs. ${data.amount.toLocaleString()}</span></div>
        <div class="balance-row"><span>Remaining Balance</span><span>Rs. ${data.newBalance.toLocaleString()}</span></div>
        ${data.description ? `<p class="note">Note: ${data.description}</p>` : ''}
        <div class="dash"></div>
        <p class="thanks">Payment recorded successfully.</p>
      </body></html>`;
    const w = window.open('', '_blank', 'width=400,height=600');
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentData.amount || paymentData.amount <= 0) return alert('Enter a valid payment amount.');

    const supplier = suppliers.find(s => s._id === currentSupplierId);
    const prevBalance = supplier?.totalDue || 0;
    const paidAmount = parseFloat(paymentData.amount);
    const newBalance = Math.max(0, prevBalance - paidAmount);

    try {
      const token = localStorage.getItem('pos_token');
      await axios.post(`${API_BASE}/api/suppliers/${currentSupplierId}/payment`, paymentData, {
        headers: { 'x-auth-token': token }
      });

      const receiptData = {
        supplierName: supplier?.name || 'Supplier',
        supplierPhone: supplier?.phone || '',
        amount: paidAmount,
        paymentMethod: paymentData.paymentMethod,
        description: paymentData.description,
        previousBalance: prevBalance,
        newBalance,
        date: new Date(),
        cashier: activeUser.fullName || 'Admin',
        receiptId: 'SPY-' + Date.now().toString().slice(-8)
      };

      setPaymentReceiptData(receiptData);
      setIsPaymentModalOpen(false);
      setPaymentData({ amount: '', paymentMethod: 'Cash', description: '' });
      fetchSuppliers();
      printPaymentReceipt(receiptData);
    } catch (err) {
      alert(err.response?.data?.message || 'Error processing payment.');
    }
  };

  const handleInputChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const openAddModal = () => {
    setEditingSupplier(null);
    setForm({ name: '', contactPerson: '', phone: '', email: '', address: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (supplier) => {
    setEditingSupplier(supplier);
    setForm({ name: supplier.name, contactPerson: supplier.contactPerson || '', phone: supplier.phone || '', email: supplier.email || '', address: supplier.address || '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('pos_token');
    try {
      if (editingSupplier) {
        const res = await axios.put(`${API_BASE}/api/suppliers/${editingSupplier._id}`, form, { headers: { 'x-auth-token': token } });
        setSuppliers(suppliers.map(sup => sup._id === editingSupplier._id ? res.data : sup));
      } else {
        const res = await axios.post(`${API_BASE}/api/suppliers`, form, { headers: { 'x-auth-token': token } });
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
      await axios.delete(`${API_BASE}/api/suppliers/${id}`, { headers: { 'x-auth-token': token } });
      setSuppliers(suppliers.filter(sup => sup._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Error removing supplier');
    }
  };

  return (
    <div className="suppliers-container">
      <nav className="sidebar-min">
        <div className="nav-item" onClick={() => navigate(activeUser.shopCategory === 'Glass' ? '/glass-billing' : '/billing')} title="POS / Billing"><ShoppingCart size={20} /></div>
        <div className="nav-item" onClick={() => navigate(activeUser.shopCategory === 'Glass' ? '/glass-inventory' : '/inventory')} title="Inventory"><Package size={20} /></div>
        <div className="nav-item" onClick={() => navigate(activeUser.shopCategory === 'Glass' ? '/glass-purchases' : '/purchases')} title="Purchases"><Truck size={20} /></div>
        <div className="nav-item active" title="Suppliers"><Users size={20} /></div>
        <div className="nav-item" onClick={() => navigate('/customers')} title="Customers"><Store size={20} /></div>
        <div className="nav-item" onClick={() => navigate(activeUser.shopCategory === 'Glass' ? '/glass-sales' : '/sales-history')} title="Sales History"><List size={20} /></div>
        <div className="nav-item" onClick={() => navigate('/dashboard')} title="Dashboard"><LayoutDashboard size={20} /></div>
        <div className="nav-item" onClick={() => navigate('/reports')} title="Reports"><BarChart3 size={20} /></div>
        <div className="nav-item" onClick={() => navigate('/expenses')} title="Expenses"><DollarSign size={20} /></div>
        <div className="nav-item" onClick={() => navigate('/hr')} title="HR"><UserCheck size={20} /></div>
        <div className="nav-item" onClick={() => navigate('/settings')} title="Settings" style={{ marginTop: 'auto' }}><Settings size={20} /></div>
      </nav>

      <main className="suppliers-main">
        <header className="suppliers-header">
          <div className="suppliers-title-group">
            <h1>Vendors & Suppliers</h1>
            <p>Manage contact info and outstanding balances for your wholesalers</p>
          </div>
          <div className="header-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div className="search-wrapper" style={{ position: 'relative', width: '300px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input type="text" placeholder="Search vendors..." className="auth-input" style={{ padding: '0.6rem 1rem 0.6rem 2.5rem', width: '100%', fontSize: '0.9rem', borderRadius: '10px' }} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            {!isCashier && (
              <button className="btn-primary" onClick={openAddModal}><Plus size={18} /> Add New Supplier</button>
            )}
          </div>
        </header>

        {suppliers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '6rem 0', color: '#94a3b8' }}>
            <Truck size={64} style={{ opacity: 0.5, marginBottom: '1rem' }} />
            <h2>No Suppliers Found</h2>
            <p>You haven't added any suppliers yet.</p>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '6rem 0', color: '#94a3b8' }}>
            <Search size={64} style={{ opacity: 0.5, marginBottom: '1rem' }} />
            <h2>No Matches Found</h2>
            <p>We couldn't find a supplier matching "{searchTerm}"</p>
          </div>
        ) : (
          <div className="suppliers-list">
            {filteredSuppliers.map(supplier => (
              <div key={supplier._id} className="supplier-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                {/* Card Top: Name + Balance */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', flex: 1, paddingRight: '8px' }}>{supplier.name}</h3>
                    {!isCashier && (
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button className="btn-icon-small" onClick={() => openEditModal(supplier)}><Edit2 size={15} /></button>
                        <button className="btn-icon-small delete" onClick={() => handleDelete(supplier._id)}><Trash2 size={15} /></button>
                      </div>
                    )}
                  </div>

                  <span style={{
                    display: 'inline-block', marginBottom: '12px',
                    padding: '3px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '800',
                    background: (supplier.totalDue || 0) > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                    color: (supplier.totalDue || 0) > 0 ? '#ef4444' : '#10b981'
                  }}>
                    {(supplier.totalDue || 0) > 0 ? `Owes: Rs. ${supplier.totalDue.toLocaleString()}` : 'Cleared ✓'}
                  </span>

                  {/* Contact Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {supplier.contactPerson && <div className="supplier-info-line"><User size={14} /> <span>{supplier.contactPerson}</span></div>}
                    {supplier.phone && <div className="supplier-info-line"><Phone size={14} /> <span>{supplier.phone}</span></div>}
                    {supplier.email && <div className="supplier-info-line"><Mail size={14} /> <span>{supplier.email}</span></div>}
                    {supplier.address && <div className="supplier-info-line"><MapPin size={14} /> <span>{supplier.address}</span></div>}
                    {(supplier.totalPurchased || 0) > 0 && (
                      <div className="supplier-info-line" style={{ color: '#64748b', fontSize: '0.82rem' }}>
                        <Truck size={13} /> <span>Total Purchased: <b>Rs. {supplier.totalPurchased.toLocaleString()}</b></span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer: Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                  <button
                    onClick={() => { setCurrentSupplierId(supplier._id); setPaymentData({ amount: '', paymentMethod: 'Cash', description: `Payment to ${supplier.name}` }); setIsPaymentModalOpen(true); }}
                    style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', padding: '0.5rem 0', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                  ><DollarSign size={14} /> Pay Supplier</button>
                  <button
                    onClick={() => { setCurrentSupplierId(supplier._id); fetchSupplierLedger(supplier._id); }}
                    style={{ flex: 1, background: '#3b82f6', color: 'white', border: 'none', padding: '0.5rem 0', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                  ><FileText size={14} /> Ledger</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Supplier Payment Modal */}
      {isPaymentModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '90%', maxWidth: '420px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <form onSubmit={handlePaymentSubmit}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.2rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Pay Supplier</h2>
                <button type="button" onClick={() => setIsPaymentModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={20} /></button>
              </div>
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '0.4rem' }}>Amount Paid (Rs.)</label>
                  <input type="number" required placeholder="Amount being paid to supplier..." value={paymentData.amount} onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '0.4rem' }}>Payment Method</label>
                  <select value={paymentData.paymentMethod} onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}>
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '0.4rem' }}>Note (Optional)</label>
                  <textarea placeholder="e.g. Partial payment for invoice #123..." value={paymentData.description} onChange={(e) => setPaymentData({ ...paymentData, description: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', height: '75px', resize: 'none' }} />
                </div>
                <button type="submit" style={{ background: '#10b981', color: 'white', border: 'none', padding: '1rem', borderRadius: '10px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer' }}>
                  Confirm & Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Ledger Modal */}
      {isLedgerModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '95%', maxWidth: '1100px', maxHeight: '90vh', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem 2rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>📒 Supplier Ledger History</h2>
              <button onClick={() => setIsLedgerModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {ledgerLoading ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>Loading ledger...</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10 }}>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: '700' }}>DATE</th>
                      <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: '700' }}>TYPE</th>
                      <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: '700' }}>DESCRIPTION</th>
                      <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: '700', textAlign: 'right' }}>DEBIT (Purchased)</th>
                      <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: '700', textAlign: 'right' }}>CREDIT (Paid)</th>
                      <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: '700', textAlign: 'right' }}>BALANCE OWED</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierLedger.length === 0 ? (
                      <tr><td colSpan="6" style={{ padding: '5rem', textAlign: 'center', color: '#94a3b8', fontSize: '1.1rem' }}>No ledger history found for this supplier.</td></tr>
                    ) : (
                      supplierLedger.map((entry, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }} onMouseOver={e => e.currentTarget.style.background = '#fcfdfe'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '1rem 1.5rem', color: '#1e293b' }}>{new Date(entry.createdAt).toLocaleDateString()}</td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', background: entry.type === 'Purchase' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: entry.type === 'Purchase' ? '#ef4444' : '#10b981' }}>{entry.type}</span>
                          </td>
                          <td style={{ padding: '1rem 1.5rem', color: '#475569' }}>{entry.description}</td>
                          <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: '#ef4444', fontWeight: '700' }}>{entry.debit > 0 ? `Rs. ${entry.debit.toLocaleString()}` : '-'}</td>
                          <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: '#10b981', fontWeight: '700' }}>{entry.credit > 0 ? `Rs. ${entry.credit.toLocaleString()}` : '-'}</td>
                          <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '900', color: entry.balance > 0 ? '#ef4444' : '#0f172a', background: '#f8fafc', fontSize: '1rem' }}>Rs. {entry.balance.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
            <div style={{ padding: '1rem 2rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc', textAlign: 'right', color: '#64748b', fontSize: '0.85rem' }}>
              Showing all transactions for this supplier
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Supplier Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="supplier-modal">
            <div className="modal-header">
              <h2>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
              <button className="btn-close" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-form" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group"><label>Company / Supplier Name</label><input type="text" name="name" className="auth-input" style={{ paddingLeft: '1rem' }} value={form.name} onChange={handleInputChange} required /></div>
                <div className="form-group"><label>Contact Person (Optional)</label><input type="text" name="contactPerson" className="auth-input" style={{ paddingLeft: '1rem' }} value={form.contactPerson} onChange={handleInputChange} /></div>
                <div className="form-group"><label>Phone Number</label><input type="text" name="phone" className="auth-input" style={{ paddingLeft: '1rem' }} value={form.phone} onChange={handleInputChange} /></div>
                <div className="form-group"><label>Email Address</label><input type="email" name="email" className="auth-input" style={{ paddingLeft: '1rem' }} value={form.email} onChange={handleInputChange} /></div>
                <div className="form-group"><label>Physical Address</label><input type="text" name="address" className="auth-input" style={{ paddingLeft: '1rem' }} value={form.address} onChange={handleInputChange} /></div>
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

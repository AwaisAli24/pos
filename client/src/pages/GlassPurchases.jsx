import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE from '../config';
import { 
  BarChart3, LayoutDashboard, ShoppingCart, 
  Package, Settings, Store, Users, Trash2, Truck, List,
  Plus, X, AlertCircle, FileText, RotateCcw, DollarSign, UserCheck, Edit2, Printer
} from 'lucide-react';
import './Purchases.css';
import './GlassBilling.css';

const GlassPurchases = () => {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const activeUser = JSON.parse(localStorage.getItem('pos_user') || '{}');
  const shopRole = activeUser.role || 'User';

  // New PO State
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [poItems, setPoItems] = useState([]);

  // Partial Return States
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [selectedPOToRefund, setSelectedPOToRefund] = useState(null);
  const [refundItemsMap, setRefundItemsMap] = useState({});

  // Payment choice when creating a new PO
  const [poPaymentStatus, setPoPaymentStatus] = useState('Paid');

  // Edit PO State
  const [isEditPOOpen, setIsEditPOOpen] = useState(false);
  const [editingPO, setEditingPO] = useState(null);
  const [editPOForm, setEditPOForm] = useState({ supplierName: '', invoiceNumber: '', paymentStatus: 'Paid' });

  // Receipt State
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptPO, setReceiptPO] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('pos_token');
      const headers = { 'x-auth-token': token };
      
      const [resPO, resSup, resInv] = await Promise.all([
        axios.get(`${API_BASE}/api/purchases`, { headers }),
        axios.get(`${API_BASE}/api/suppliers`, { headers }),
        axios.get(`${API_BASE}/api/inventory?category=Glass`, { headers })
      ]);
      
      if (resPO.data) setPurchases(resPO.data);
      if (resSup.data) setSuppliers(resSup.data);
      if (resInv.data) setInventory(resInv.data.sort((a,b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error('Failure fetching PO config', err);
    }
  };

  const openEditPO = (po) => {
    setEditingPO(po);
    setEditPOForm({ supplierName: po.supplierName || '', invoiceNumber: po.invoiceNumber || '', paymentStatus: po.paymentStatus || 'Paid' });
    setIsEditPOOpen(true);
  };

  const handleEditPOSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('pos_token');
      const res = await axios.put(`${API_BASE}/api/purchases/${editingPO._id}`, editPOForm, {
        headers: { 'x-auth-token': token }
      });
      setPurchases(purchases.map(p => p._id === editingPO._id ? res.data : p));
      setIsEditPOOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating purchase.');
    }
  };

  const handleDeletePO = async (po) => {
    if (!window.confirm(`Permanently delete PO ${po.invoiceNumber || '#' + po._id.slice(-6)}? This cannot be undone.`)) return;
    try {
      const token = localStorage.getItem('pos_token');
      await axios.delete(`${API_BASE}/api/purchases/${po._id}`, { headers: { 'x-auth-token': token } });
      setPurchases(purchases.filter(p => p._id !== po._id));
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting purchase.');
    }
  };

  const handleAddItem = () => {
    setPoItems([...poItems, { product_id: '', name: '', barcode: '', costPrice: 0, qty: 1 }]);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...poItems];
    if (field === 'product_id') {
      const selected = inventory.find(i => i._id === value || i.id === value);
      if (selected) {
        newItems[index] = {
          ...newItems[index],
          product_id: selected._id || selected.id,
          name: selected.name,
          barcode: selected.barcode || 'N/A',
          costPrice: selected.costPrice || 0
        };
      }
    } else {
      newItems[index][field] = value;
    }
    setPoItems(newItems);
  };

  const handleRemoveItem = (index) => {
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const openRefundModal = (po) => {
    setSelectedPOToRefund(po);
    const initialMap = {};
    po.items.forEach(i => {
      initialMap[i.product || i._id] = 0;
    });
    setRefundItemsMap(initialMap);
    setIsRefundModalOpen(true);
  };

  const handleRefundQtyChange = (productId, val, maxVal) => {
    let num = parseInt(val) || 0;
    if (num > maxVal) num = maxVal;
    if (num < 0) num = 0;
    setRefundItemsMap({...refundItemsMap, [productId]: num});
  };

  const submitPartialPORefund = async () => {
    const payloadItems = Object.keys(refundItemsMap).map(pid => ({
      product_id: pid,
      returnQty: refundItemsMap[pid]
    })).filter(r => r.returnQty > 0);

    if (payloadItems.length === 0) {
      return alert("Please specify mathematically positive quantities to physically reverse from inventory.");
    }

    if (!window.confirm("CRITICAL WARNING: This will physically extract and mathematically reverse the selected quantities natively out of your live warehouse stock! Are you certain?")) return;
    
    try {
      const token = localStorage.getItem('pos_token');
      await axios.post(`${API_BASE}/api/purchases/${selectedPOToRefund._id}/partial-refund`, {
        refundItems: payloadItems
      }, {
        headers: { 'x-auth-token': token }
      });
      alert('Physical inventory logically deducted natively. Partial return successful.');
      setIsRefundModalOpen(false);
      fetchData(); 
    } catch (err) {
      alert(err.response?.data?.message || 'Error processing explicit partial PO return.');
    }
  };

  const submitCompletePORefund = async () => {
    if (!window.confirm("CRITICAL WARNING: This will FULLY REVERSE this purchase order and deduct ALL items from your inventory. Are you certain?")) return;
    try {
      const token = localStorage.getItem('pos_token');
      await axios.post(`${API_BASE}/api/purchases/${selectedPOToRefund._id}/refund`, {}, {
        headers: { 'x-auth-token': token }
      });
      alert('Total Supplier Return processed! All associated stock properly deducted.');
      setIsRefundModalOpen(false);
      fetchData(); 
    } catch (err) {
      alert(err.response?.data?.message || 'Error processing complete supplier return.');
    }
  };

  const calculateGrandTotal = () => {
    return poItems.reduce((sum, item) => sum + (Number(item.costPrice || 0) * Number(item.qty || 0)), 0);
  };

  const handleSubmitPO = async (e) => {
    e.preventDefault();
    if (poItems.length === 0) return alert('Please add at least one product to the restock order.');
    if (!selectedSupplier) return alert('Please select a Supplier.');

    const supObj = suppliers.find(s => String(s._id) === String(selectedSupplier));

    try {
      const token = localStorage.getItem('pos_token');
      const payload = {
        supplier: supObj._id,
        supplierName: supObj.name,
        invoiceNumber,
        items: poItems,
        grandTotal: calculateGrandTotal(),
        paymentStatus: poPaymentStatus
      };

      await axios.post(`${API_BASE}/api/purchases`, payload, {
        headers: { 'x-auth-token': token }
      });

      alert('Purchase successfully recorded! Inventory dynamically incremented.');
      setIsFormOpen(false);
      setPoItems([]);
      setInvoiceNumber('');
      setPoPaymentStatus('Paid'); // Reset payment choice
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving Purchase Order.');
    }
  };

  return (
    <div className="purchases-container">
      {/* Universal Main Sidebar Navigation */}
      <nav className="sidebar-min">
        <div className="nav-item" onClick={() => navigate('/glass-billing')} title="POS / Billing">
          <ShoppingCart size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate('/glass-inventory')} title="Inventory">
          <Package size={20} />
        </div>
        <div className="nav-item active" title="Purchases">
          <Truck size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate('/suppliers')} title="Suppliers">
          <Users size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate('/customers')} title="Customers">
          <Store size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate('/glass-sales')} title="Sales History">
          <List size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate('/dashboard')} title="Dashboard">
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

      {/* Main Area */}
      <main className="purchases-main">
        <div className="po-header">
          <div className="po-title">
            <h1>Purchases & Restocking (Glass)</h1>
            <p>Log incoming materials and dynamically update your stock levels</p>
          </div>
          {shopRole !== 'User' && (
            <button className="btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} onClick={() => setIsFormOpen(true)}>
              <Plus size={18} /> New Restock (PO)
            </button>
          )}
        </div>

        {/* PO History Grid */}
        <div className="po-wrapper-grid">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Supplier</th>
                <th>Invoice #</th>
                <th>Total Items</th>
                <th>Grand Total</th>
                <th>Log By</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map(po => (
                <tr key={po._id}>
                  <td style={{ fontWeight: '500' }}>{new Date(po.createdAt).toLocaleDateString()}</td>
                  <td style={{ fontWeight: '600', color: '#1e293b' }}>{po.supplierName}</td>
                  <td style={{ color: '#64748b' }}>{po.invoiceNumber || 'N/A'}</td>
                  <td>{po.items.length} units</td>
                  <td style={{ fontWeight: 'bold' }}>Rs. {Number(po.grandTotal || 0).toFixed(2)}</td>
                  <td style={{ color: '#64748b', fontSize: '0.9rem' }}>{po.admin?.fullName || 'Admin'}</td>
                  <td>
                    <span style={{ 
                      background: po.paymentStatus === 'Returned' ? '#fee2e2' : po.paymentStatus === 'Pending' ? '#fef3c7' : '#dcfce7', 
                      color: po.paymentStatus === 'Returned' ? '#991b1b' : po.paymentStatus === 'Pending' ? '#92400e' : '#166534', 
                      padding: '0.3rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' 
                    }}>
                      {po.paymentStatus === 'Pending' ? '🕐 Pending' : po.paymentStatus === 'Returned' ? '↩ Returned' : '✓ Paid'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <button 
                        style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', padding: '0.5rem', borderRadius: '6px', display: 'flex', alignItems: 'center', cursor: 'pointer' }} 
                        onClick={() => { setReceiptPO(po); setIsReceiptOpen(true); }}
                        title="Print Receipt"
                      >
                        <Printer size={14} />
                      </button>
                      {po.paymentStatus !== 'Returned' && shopRole !== 'User' && (
                        <button 
                          className="btn-icon-action danger" 
                          style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', padding: '0.5rem', borderRadius: '6px', display: 'flex', alignItems: 'center', cursor: 'pointer' }} 
                          onClick={() => openRefundModal(po)}
                          title="Process Return"
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
                      {shopRole !== 'User' && (
                        <button 
                          style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', padding: '0.5rem', borderRadius: '6px', display: 'flex', alignItems: 'center', cursor: 'pointer' }} 
                          onClick={() => openEditPO(po)} 
                          title="Edit Purchase"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                      {shopRole !== 'User' && (
                        <button 
                          style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.5rem', borderRadius: '6px', display: 'flex', alignItems: 'center', cursor: 'pointer' }} 
                          onClick={() => handleDeletePO(po)} 
                          title="Delete Purchase"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {purchases.length === 0 && (
                 <tr>
                   <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                     <FileText size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                     <p>No historical purchase orders exist.</p>
                   </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Edit PO Modal */}
      {isEditPOOpen && editingPO && (
        <div className="modal-overlay">
          <div className="product-modal" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h2>Edit Purchase Order</h2>
              <button className="btn-close" onClick={() => setIsEditPOOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleEditPOSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Supplier Name</label>
                <input type="text" className="auth-input" style={{ paddingLeft: '1rem' }}
                  value={editPOForm.supplierName} onChange={e => setEditPOForm({ ...editPOForm, supplierName: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Invoice Number</label>
                <input type="text" className="auth-input" style={{ paddingLeft: '1rem' }}
                  value={editPOForm.invoiceNumber} onChange={e => setEditPOForm({ ...editPOForm, invoiceNumber: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Payment Status</label>
                <select className="auth-input" style={{ paddingLeft: '1rem', appearance: 'auto' }}
                  value={editPOForm.paymentStatus} onChange={e => setEditPOForm({ ...editPOForm, paymentStatus: e.target.value })}>
                  <option>Paid</option>
                  <option>Pending</option>
                  <option>Returned</option>
                </select>
              </div>
              <div className="modal-footer" style={{ paddingTop: '1rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsEditPOOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New PO Modal */}
      {isFormOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '90%', maxWidth: '900px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem 2rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <h2>Log Incoming Purchase (Glass)</h2>
              <button onClick={() => setIsFormOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmitPO} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="po-modal-form">
                
                {/* Meta details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontWeight: '600', color: '#475569', fontSize: '0.9rem' }}>Select Supplier</label>
                    <select required value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)} style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <option value="" disabled>-- Choose Supplier --</option>
                      {suppliers.map(s => <option key={s._id} value={s._id}>{s.name} ({s.contactName})</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontWeight: '600', color: '#475569', fontSize: '0.9rem' }}>Invoice / Bill Number</label>
                    <input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="e.g. INV-2024-X" style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '0.5rem 0' }} />

                {/* Items Array */}
                <h3 style={{ color: '#1e293b', fontSize: '1.1rem' }}>Order Items</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {poItems.map((item, index) => (
                    <div key={index} className="po-item-row">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Product</label>
                        <select required value={item.product_id} onChange={(e) => handleItemChange(index, 'product_id', e.target.value)} style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                          <option value="" disabled>-- Select Catalog Item --</option>
                          {inventory.map(inv => <option key={inv._id || inv.id} value={inv._id || inv.id}>{inv.name} (Stock: {inv.currentStock})</option>)}
                        </select>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Cost Price (Rs)</label>
                        <input type="number" required min="0" step="0.01" value={item.costPrice} onChange={(e) => handleItemChange(index, 'costPrice', e.target.value)} style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Restock Qty</label>
                        <input type="number" required min="1" value={item.qty} onChange={(e) => handleItemChange(index, 'qty', e.target.value)} style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                      </div>

                      <button type="button" onClick={() => handleRemoveItem(index)} style={{ padding: '0.6rem', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  
                  <button type="button" onClick={handleAddItem} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#eff6ff', color: '#3b82f6', border: '1px dashed #93c5fd', padding: '0.8rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                    <Plus size={16} /> Add Product Row
                  </button>
                </div>

                <div className="po-total-calc">
                  Grand Total: Rs. {calculateGrandTotal().toFixed(2)}
                </div>

              </div>

              <div style={{ padding: '1.5rem 2rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setIsFormOpen(false)} style={{ padding: '0.8rem 1.5rem', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#64748b', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.8rem 1.5rem', background: '#2563eb', border: 'none', borderRadius: '8px', color: 'white', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)' }}>Record Purchase</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Partial PO Refund Modal */}
      {isRefundModalOpen && selectedPOToRefund && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '90%', maxWidth: '600px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem 2rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <h2>Partial / Full Supplier Return</h2>
              <button onClick={() => setIsRefundModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>
            
            <div style={{ padding: '0' }}>
              <div style={{ padding: '1rem 1.5rem', background: '#fef2f2', borderBottom: '2px dashed #fca5a5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: '700', color: '#991b1b', marginBottom: '0.2rem' }}>Complete Supplier Return</p>
                  <p style={{ fontSize: '0.85rem', color: '#ef4444' }}>Deducts all items from stock.</p>
                </div>
                <button
                  onClick={submitCompletePORefund}
                  style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', padding: '0.6rem 1.4rem', fontWeight: '700', cursor: 'pointer', fontSize: '0.95rem', whiteSpace: 'nowrap' }}
                >
                  Confirm Full Reverse
                </button>
              </div>

              <div style={{ padding: '1.5rem', maxHeight: '50vh', overflowY: 'auto' }}>
                <p style={{ color: '#64748b', marginBottom: '1rem', fontWeight: '600' }}>— Or process a Partial Return:</p>
              
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                     <th style={{ textAlign: 'left', paddingBottom: '0.8rem', borderBottom: '1px solid #e2e8f0' }}>Item Name</th>
                     <th style={{ textAlign: 'center', paddingBottom: '0.8rem', borderBottom: '1px solid #e2e8f0' }}>Max Qty</th>
                     <th style={{ textAlign: 'center', paddingBottom: '0.8rem', borderBottom: '1px solid #e2e8f0' }}>Return Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPOToRefund.items.map(item => (
                    <tr key={item._id || item.product}>
                      <td style={{ padding: '1rem 0', borderBottom: '1px dashed #cbd5e1', fontWeight: '500' }}>{item.name}</td>
                      <td style={{ padding: '1rem 0', borderBottom: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b' }}>{item.qty} units</td>
                      <td style={{ padding: '1rem 0', borderBottom: '1px dashed #cbd5e1', textAlign: 'center' }}>
                         <input type="number" 
                            min="0" 
                            max={item.qty}
                            value={refundItemsMap[item.product || item._id] || 0}
                            onChange={(e) => handleRefundQtyChange(item.product || item._id, e.target.value, item.qty)}
                            style={{ width: '80px', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'center' }}
                            disabled={item.qty === 0}
                         />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ padding: '1.5rem 2rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
               <button type="button" onClick={() => setIsRefundModalOpen(false)} style={{ padding: '0.8rem 1.5rem', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#64748b', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
               <button type="button" onClick={submitPartialPORefund} style={{ padding: '0.8rem 1.5rem', background: '#ef4444', border: 'none', borderRadius: '8px', color: 'white', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.2)' }}>Confirm Supplier Return</button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Receipt Modal - Glass A4 Style */}
      {isReceiptOpen && receiptPO && (
        <div className="modal-overlay" style={{ display: 'flex', justifyContent: 'center', overflowY: 'auto', padding: '2rem 0', alignItems: 'flex-start', zIndex: 1000 }}>
          <div className="glass-receipt-modal" style={{ 
            background: 'white', 
            width: '210mm', 
            minHeight: '297mm', 
            margin: '0 auto', 
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            position: 'relative',
            borderRadius: '8px',
            transform: 'scale(0.75)',
            transformOrigin: 'top center',
            marginBottom: '-70mm' // Adjust for scaled space
          }}>
            <div className="modal-header no-print" style={{ background: '#f8fafc', padding: '1rem 2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', color: '#1e293b' }}>GRN Preview <span style={{ fontSize: '0.8rem', opacity: 0.6 }}></span></h2>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn-primary" onClick={() => window.print()} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <Printer size={18} /> Print
                </button>
                <button className="btn-close" onClick={() => setIsReceiptOpen(false)} style={{ fontSize: '24px', cursor: 'pointer', background: 'none', border: 'none' }}>&times;</button>
              </div>
            </div>
            
            <div id="glass-receipt-content" className="glass-receipt-content" style={{ padding: '40px', color: '#000', background: '#fff' }}>
              {/* Header Section */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #000', paddingBottom: '20px', marginBottom: '30px' }}>
                <div>
                   <h1 style={{ margin: 0, fontSize: '3rem', fontWeight: '900', letterSpacing: '-1px' }}>GOODS RECEIVED</h1>
                   <p style={{ fontSize: '1.1rem', color: '#475569', marginTop: '4px' }}>Inventory Reconciliation & PO Report</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <img 
                    src={`${API_BASE}/logo/${activeUser.shopId}.png`} 
                    alt="Logo" 
                    style={{ height: '70px', objectFit: 'contain' }}
                    onError={(e) => e.target.style.display = 'none'}
                  />
                  <h2 style={{ margin: '8px 0 0', fontSize: '1.5rem' }}>{activeUser.shopName}</h2>
                </div>
              </div>

              {/* Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '40px', marginBottom: '40px' }}>
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ textTransform: 'uppercase', color: '#64748b', fontSize: '0.8rem', letterSpacing: '1px', marginBottom: '10px' }}>FROM (SUPPLIER)</h4>
                  <p style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 5px' }}>{receiptPO.supplierName}</p>
                  <p style={{ margin: 0, color: '#475569' }}>Invoice Ref: <strong>{receiptPO.invoiceNumber || 'N/A'}</strong></p>
                </div>
                <div style={{ textAlign: 'right', padding: '20px' }}>
                  <h4 style={{ textTransform: 'uppercase', color: '#64748b', fontSize: '0.8rem', letterSpacing: '1px', marginBottom: '10px' }}>ORDER METRICS</h4>
                  <p style={{ margin: '0 0 8px' }}>Date: <strong>{new Date(receiptPO.createdAt).toLocaleDateString()}</strong></p>
                  <p style={{ margin: '0 0 8px' }}>Status: <span style={{ 
                    background: receiptPO.paymentStatus === 'Paid' ? '#dcfce7' : '#fee2e2', 
                    color: receiptPO.paymentStatus === 'Paid' ? '#166534' : '#991b1b',
                    padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold'
                  }}>{receiptPO.paymentStatus.toUpperCase()}</span></p>
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>INTERNAL ID: {receiptPO._id.toUpperCase()}</p>
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #000' }}>
                    <th style={{ textAlign: 'left', padding: '15px 10px', fontSize: '1rem' }}>DESCRIPTION / PRODUCT NAME</th>
                    <th style={{ textAlign: 'center', padding: '15px 10px', fontSize: '1rem' }}>QTY</th>
                    <th style={{ textAlign: 'right', padding: '15px 10px', fontSize: '1rem' }}>UNIT COST</th>
                    <th style={{ textAlign: 'right', padding: '15px 10px', fontSize: '1rem' }}>TOTAL AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptPO.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '15px 10px' }}>
                         <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{item.name}</div>
                         <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Barcode: {item.barcode}</div>
                      </td>
                      <td style={{ textAlign: 'center', padding: '15px 10px', fontSize: '1.1rem' }}>{item.qty} Units</td>
                      <td style={{ textAlign: 'right', padding: '15px 10px', fontSize: '1.1rem' }}>Rs. {item.costPrice?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td style={{ textAlign: 'right', padding: '15px 10px', fontWeight: 'bold', fontSize: '1.1rem' }}>Rs. {(item.qty * item.costPrice)?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Section */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <div style={{ width: '350px' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 10px', background: '#000', color: '#fff', borderRadius: '8px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '1.4rem' }}>GRAND TOTAL</span>
                      <span style={{ fontWeight: 'bold', fontSize: '1.4rem' }}>Rs. {Number(receiptPO.grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                   </div>
                </div>
              </div>

              {/* Verification Section */}
              <div style={{ marginTop: '80px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px' }}>
                <div style={{ borderTop: '2px solid #000', textAlign: 'center', paddingTop: '10px' }}>
                  <p style={{ fontWeight: 'bold', margin: 0 }}>SUPPLIER ACKNOWLEDGEMENT</p>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Authorized Stamp & Signature</p>
                </div>
                <div style={{ borderTop: '2px solid #000', textAlign: 'center', paddingTop: '10px' }}>
                  <p style={{ fontWeight: 'bold', margin: 0 }}>RECEIVER VERIFICATION</p>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Verified by {receiptPO.admin?.fullName || 'Manager'}</p>
                </div>
              </div>

              {/* Footer Information */}
              <div style={{ textAlign: 'center', marginTop: '80px', borderTop: '1px solid #e2e8f0', paddingTop: '20px', fontSize: '0.9rem', color: '#94a3b8' }}>
                <p style={{ fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Developed By Tycoon Technologies Pvt. Ltd. Islamabad.</p>
                <p style={{ margin: 0 }}>03060626699 | www.tycoon.technology</p>
                
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlassPurchases;

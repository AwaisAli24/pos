import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE from '../config';
import { 
  BarChart3, LayoutDashboard, ShoppingCart, 
  Package, Settings, Store, Users, Trash2, Truck, List,
  Plus, X, AlertCircle, FileText, RotateCcw
} from 'lucide-react';
import './Purchases.css';

const Purchases = () => {
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
        axios.get(`${API_BASE}/api/inventory`, { headers })
      ]);
      
      if (resPO.data) setPurchases(resPO.data);
      if (resSup.data) setSuppliers(resSup.data);
      if (resInv.data) setInventory(resInv.data.sort((a,b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error('Failure fetching PO config', err);
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
        paymentStatus: 'Paid'
      };

      await axios.post(`${API_BASE}/api/purchases`, payload, {
        headers: { 'x-auth-token': token }
      });

      alert('Purchase successfully recorded! Inventory dynamically incremented.');
      setIsFormOpen(false);
      setPoItems([]);
      setInvoiceNumber('');
      fetchData(); // Refresh history
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving Purchase Order.');
    }
  };

  return (
    <div className="purchases-container">
      {/* Universal Main Sidebar Navigation */}
      <nav className="sidebar-min">
        <div className="nav-item" onClick={() => navigate('/billing')} title="POS / Billing">
          <ShoppingCart size={24} />
        </div>
        <div className="nav-item" onClick={() => navigate('/inventory')} title="Inventory">
          <Package size={24} />
        </div>
        <div className="nav-item active" title="Purchases">
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
        <div className="nav-item" onClick={() => navigate('/settings')} title="Settings" style={{ marginTop: 'auto' }}>
          <Settings size={24} />
        </div>
      </nav>

      {/* Main Area */}
      <main className="purchases-main">
        <div className="po-header">
          <div className="po-title">
            <h1>Purchases & Restocking</h1>
            <p>Log incoming purchases and dynamically update your stock levels</p>
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
                      background: po.paymentStatus === 'Returned' ? '#fee2e2' : '#dcfce7', 
                      color: po.paymentStatus === 'Returned' ? '#991b1b' : '#166534', 
                      padding: '0.3rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' 
                    }}>
                      {po.paymentStatus}
                    </span>
                  </td>
                  <td>
                    {po.paymentStatus !== 'Returned' && shopRole !== 'User' && (
                      <button className="btn-icon-action danger" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', padding: '0.4rem 0.6rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }} onClick={() => openRefundModal(po)}>
                        <RotateCcw size={14} /> Return
                      </button>
                    )}
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

      {/* New PO Modal */}
      {isFormOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '90%', maxWidth: '900px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem 2rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <h2>Log Incoming Purchase</h2>
              <button onClick={() => setIsFormOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
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
              <button onClick={() => setIsRefundModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
            </div>
            
            <div style={{ padding: '1.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
              <p style={{ color: '#64748b', marginBottom: '1rem' }}>Adjust specific quantities mathematically to deduct exactly what was returned universally to the supplier.</p>
              
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

            <div style={{ padding: '1.5rem 2rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
               <button type="button" onClick={() => setIsRefundModalOpen(false)} style={{ padding: '0.8rem 1.5rem', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#64748b', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
               <button type="button" onClick={submitPartialPORefund} style={{ padding: '0.8rem 1.5rem', background: '#ef4444', border: 'none', borderRadius: '8px', color: 'white', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.2)' }}>Confirm Supplier Return</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchases;

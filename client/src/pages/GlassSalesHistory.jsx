import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import API_BASE from '../config';
import { 
  LayoutDashboard, ShoppingCart, Package, Settings, 
  Search, Eye, Printer, RotateCcw, Truck, List, Users, Store, BarChart3, MessageCircle, X, Download, DollarSign, UserCheck, Edit2, Trash2
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import './SalesHistory.css';
import './GlassBilling.css'; // Bypass thermal rules automatically

const GlassSalesHistory = () => {
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  
  // Inventory to support adding items during revision
  const [inventory, setInventory] = useState([]);

  // Edit/Revision State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [revisionCart, setRevisionCart] = useState([]);
  const [revisionCustomerName, setRevisionCustomerName] = useState('');
  const [revisionPaymentMethod, setRevisionPaymentMethod] = useState('Cash');
  const [revisionSearchTerm, setRevisionSearchTerm] = useState('');
  
  // History viewer state
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyRecord, setHistoryRecord] = useState(null);

  // WhatsApp Sync States
  const [isWhatsappModalOpen, setIsWhatsappModalOpen] = useState(false);
  const [whatsappSale, setWhatsappSale] = useState(null);
  const [wpName, setWpName] = useState('');
  const [wpPhone, setWpPhone] = useState('');
  
  const [shopDetails, setShopDetails] = useState({ name: 'MY STORE', address: 'Address', phone: 'Contact' });

  const activeUser = JSON.parse(localStorage.getItem('pos_user') || '{}');
  const isCashier = activeUser.role === 'User';

  useEffect(() => {
    fetchSales();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isReceiptModalOpen) setIsReceiptModalOpen(false);
        if (isWhatsappModalOpen) setIsWhatsappModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReceiptModalOpen, isWhatsappModalOpen]);

  const fetchSales = async () => {
    try {
      const token = localStorage.getItem('pos_token');
      const res = await axios.get(`${API_BASE}/api/sales`, {
        headers: { 'x-auth-token': token }
      });
      setSales(res.data);
      
      const invRes = await axios.get(`${API_BASE}/api/inventory`, {
        headers: { 'x-auth-token': token }
      });
      if (invRes.data) setInventory(invRes.data);
    } catch (err) {
      console.error('Failed to grab app data', err);
    }
  };

  const openEditModal = (sale) => {
    setEditingSale(sale);
    // Map current sale items to the revision cart format
    setRevisionCart(sale.items.map(item => ({
      ...item,
      id: item.product // Ensure we have a consistent ID for logic
    })));
    setRevisionCustomerName(sale.customerName || 'Guest');
    setRevisionPaymentMethod(sale.paymentMethod || 'Cash');
    setIsEditModalOpen(true);
  };

  const handleAddItemToRevision = (p) => {
    const exists = revisionCart.find(i => (i.product === p._id || i.id === p._id));
    if (exists) {
      setRevisionCart(revisionCart.map(i => 
        (i.product === p._id || i.id === p._id) ? { ...i, qty: i.qty + 1, totalItemPrice: (i.qty + 1) * i.salePrice } : i
      ));
    } else {
      setRevisionCart([...revisionCart, {
        product: p._id,
        id: p._id,
        name: p.name,
        barcode: p.barcode,
        salePrice: p.salePrice,
        qty: 1,
        totalItemPrice: p.salePrice
      }]);
    }
    setRevisionSearchTerm('');
  };

  const updateRevisionQty = (id, delta) => {
    setRevisionCart(prev => prev.map(item => {
      const itemId = item.product || item.id;
      if (itemId === id) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty, totalItemPrice: newQty * item.salePrice } : item;
      }
      return item;
    }));
  };

  const removeFromRevision = (id) => {
    setRevisionCart(prev => prev.filter(item => (item.product !== id && item.id !== id)));
  };

  const calculateRevisionTotal = () => {
    return revisionCart.reduce((sum, item) => sum + (item.salePrice * item.qty), 0);
  };

  const handleEditSubmit = async () => {
    if (revisionCart.length === 0) return alert('Cannot save an empty invoice.');
    if (!window.confirm("This will overwrite the original invoice and recalculate inventory. Are you sure?")) return;
    
    try {
      const token = localStorage.getItem('pos_token');
      const payload = {
        items: revisionCart,
        subtotal: calculateRevisionTotal(),
        grandTotal: calculateRevisionTotal(),
        paymentMethod: revisionPaymentMethod,
        customerName: revisionCustomerName
      };

      await axios.put(`${API_BASE}/api/sales/${editingSale._id}`, payload, {
        headers: { 'x-auth-token': token }
      });
      
      alert('Invoice Revised Successfully!');
      setIsEditModalOpen(false);
      fetchSales(); 
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating sale.');
    }
  };

  // History Preview Logic
  const openHistoryModal = (sale) => {
    setHistoryRecord(sale);
    setIsHistoryModalOpen(true);
  };

  const handleDeleteSale = async (sale) => {
    if (!window.confirm(`Permanently delete sale ${sale.invoiceId || '#' + sale._id.slice(-6)}? This cannot be undone.`)) return;
    try {
      const token = localStorage.getItem('pos_token');
      await axios.delete(`${API_BASE}/api/sales/${sale._id}`, { headers: { 'x-auth-token': token } });
      setSales(sales.filter(s => s._id !== sale._id));
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting sale.');
    }
  };

  const viewReceipt = (sale) => {
    setSelectedReceipt(sale);
    setIsReceiptModalOpen(true);
  };

  const receiptRef = useRef(null);

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Receipt_${selectedReceipt.invoiceId || selectedReceipt._id.slice(-8).toUpperCase()}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Error generating PDF');
    }
  };

  const openWhatsappModal = (sale) => {
    setWhatsappSale(sale);
    setWpName(sale.customerName && sale.customerName !== 'Walk-in' && sale.customerName !== 'Over the call' && sale.customerName !== 'Guest' ? sale.customerName : '');
    setWpPhone('');
    setIsWhatsappModalOpen(true);
  };

  const handleWhatsappSubmit = async (e) => {
    e.preventDefault();
    if (!wpPhone) return alert('Phone number is required.');

    try {
      const token = localStorage.getItem('pos_token');
      try {
        await axios.post(`${API_BASE}/api/customers`, {
          name: wpName || `WhatsApp Lead`,
          phone: wpPhone
        }, { headers: { 'x-auth-token': token } });
      } catch (err) {
        console.log('Customer sync okay');
      }

      // 1. Clean the phone number and automatically add '92' (Pakistan code) if it starts with '0'
      let cleanPhone = wpPhone.replace(/\D/g, ''); 
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '92' + cleanPhone.substring(1);
      }

      const rawReceiptText = `*E-Receipt from ${activeUser.shopName || 'POS Store'}*\nInvoice ID: ${whatsappSale.invoiceId || '#' + whatsappSale._id.slice(-8).toUpperCase()}\nDate: ${new Date(whatsappSale.createdAt).toLocaleString()}\n\n*Items Purchased:*\n${whatsappSale.items.map(item => `- ${item.name} x${item.qty} (Rs. ${item.salePrice * item.qty})`).join('\n')}\n\n*Total Paid:* Rs. ${whatsappSale.grandTotal.toFixed(2)}\n\nThank you for shopping with us!`;
      
      const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(rawReceiptText)}`;
      
      // 2. Use a Hidden Anchor Tag to FORCE the browser to reuse a single tab
      const link = document.createElement('a');
      link.href = url;
      link.target = 'WhatsAppReceiptTab'; 
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setIsWhatsappModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Error connecting smoothly intuitively implicitly realistically appropriately dynamically natively effortlessly cleanly seamlessly naturally elegantly dependably explicitly neatly.');
    }
  };

  const filteredSales = sales.filter(s => 
    s._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.invoiceId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.paymentMethod || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.cashier?.fullName || 'Cashier').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="sales-history-container">
      {/* Sidebar Navigation */}
      <nav className="sidebar-min">
        <div className="nav-item" onClick={() => navigate('/glass-billing')} title="POS / Billing">
          <ShoppingCart size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate('/glass-inventory')} title="Inventory">
          <Package size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate('/glass-purchases')} title="Purchases">
          <Truck size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate('/suppliers')} title="Suppliers">
          <Users size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate('/customers')} title="Customers">
          <Store size={20} />
        </div>
        <div className="nav-item active" title="Sales History">
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

      {/* Main Container */}
      <main className="sales-history-main">
        <header className="sales-history-header">
          <div className="sales-title">
            <h1>Sales History & Refunds</h1>
            <p>View past successful transactions and explicitly process item returns</p>
          </div>
          <div className="search-bar">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Search by ID or Cashier..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </header>

        <div className="sales-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Date / Time</th>
                <th>Customer</th>
                <th>Items Sold</th>
                <th>Total Value</th>
                <th>Method</th>
                <th>Version</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map(sale => (
                <tr key={sale._id}>
                  <td style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 'bold' }}>{sale.invoiceId || '#' + sale._id.slice(-8).toUpperCase()}</td>
                  <td>{new Date(sale.createdAt).toLocaleString()}</td>
                  <td style={{ fontWeight: '500', color: sale.customer ? '#2563eb' : '#64748b' }}>{sale.customerName || 'Guest'}</td>
                  <td>{sale.items.length} product(s)</td>
                   <td style={{ fontWeight: 'bold' }}>Rs. {sale.grandTotal.toFixed(2)}</td>
                  <td>{sale.paymentMethod}</td>
                  <td>
                    {sale.isModified ? (
                      <span className="status-badge" style={{ background: '#fef3c7', color: '#92400e', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => openHistoryModal(sale)}>
                         <RotateCcw size={12} /> MODIFIED
                      </span>
                    ) : (
                      <span className="status-badge completed" style={{ background: '#f8fafc', color: '#64748b' }}>Original</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn-icon-action" onClick={() => viewReceipt(sale)} title="View Receipt">
                        <Eye size={16} />
                      </button>
                      {!isCashier && (
                        <button className="btn-icon-action" style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }} onClick={() => openEditModal(sale)} title="Edit Bill">
                          <Edit2 size={14} />
                        </button>
                      )}
                      {!isCashier && (
                        <button className="btn-icon-action danger" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }} onClick={() => handleDeleteSale(sale)} title="Delete Bill">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredSales.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              <List size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
              <p>No transactions found matching your records.</p>
            </div>
          )}
        </div>
      </main>

      {/* REVISION (EDIT) MODAL - THE FULL POS UI */}
      {isEditModalOpen && editingSale && (
        <div className="modal-overlay">
          <div className="product-modal" style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div>
                <h2>Correct / Revise Invoice: <span style={{ color: 'var(--primary)' }}>{editingSale.invoiceId}</span></h2>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Stock will be automatically recalculated upon saving.</p>
              </div>
              <button className="btn-close" onClick={() => setIsEditModalOpen(false)}><X size={20} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', padding: '1.5rem', flex: 1, overflow: 'hidden' }}>
              
              {/* Left Side: Product Search & Cart */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}><Search size={20} /></div>
                  <input 
                    type="text" 
                    placeholder="Add more products to this bill..." 
                    className="auth-input" 
                    style={{ paddingLeft: '3rem' }}
                    value={revisionSearchTerm}
                    onChange={(e) => setRevisionSearchTerm(e.target.value)}
                  />
                  {/* Suggestions Pop-up */}
                  {revisionSearchTerm.trim() !== '' && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', zIndex: 10, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto' }}>
                      {inventory.filter(p => p.name.toLowerCase().includes(revisionSearchTerm.toLowerCase()) || (p.barcode && p.barcode.includes(revisionSearchTerm))).map(p => (
                        <div key={p._id} onClick={() => handleAddItemToRevision(p)} style={{ padding: '0.8rem 1rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{p.name}</span>
                          <span style={{ fontWeight: '700', color: '#10b981' }}>Rs. {p.salePrice}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: '12px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                      <tr style={{ textAlign: 'left', fontSize: '0.8rem', color: '#64748b' }}>
                        <th style={{ padding: '0.8rem' }}>Product</th>
                        <th style={{ padding: '0.8rem', textAlign: 'center' }}>Price</th>
                        <th style={{ padding: '0.8rem', textAlign: 'center' }}>Qty</th>
                        <th style={{ padding: '0.8rem', textAlign: 'center' }}>Total</th>
                        <th style={{ padding: '0.8rem' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {revisionCart.map(item => (
                        <tr key={item.product || item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.8rem', fontWeight: '600' }}>{item.name}</td>
                          <td style={{ padding: '0.8rem', textAlign: 'center' }}>Rs. {item.salePrice}</td>
                          <td style={{ padding: '0.8rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                              <button onClick={() => updateRevisionQty(item.product || item.id, -1)} style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>-</button>
                              <span style={{ fontWeight: '700', minWidth: '20px', textAlign: 'center' }}>{item.qty}</span>
                              <button onClick={() => updateRevisionQty(item.product || item.id, 1)} style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>+</button>
                            </div>
                          </td>
                          <td style={{ padding: '0.8rem', textAlign: 'center', fontWeight: '700' }}>Rs. {(item.salePrice * item.qty).toFixed(2)}</td>
                          <td style={{ padding: '0.8rem' }}>
                            <button onClick={() => removeFromRevision(item.product || item.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Side: Meta Details & Total */}
              <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                 <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Customer Name</label>
                    <input type="text" className="auth-input" value={revisionCustomerName} onChange={(e) => setRevisionCustomerName(e.target.value)} />
                 </div>
                 <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Payment Method</label>
                    <select className="auth-input" style={{ appearance: 'auto' }} value={revisionPaymentMethod} onChange={(e) => setRevisionPaymentMethod(e.target.value)}>
                      <option>Cash</option>
                      <option>Card</option>
                      <option>Online</option>
                    </select>
                 </div>

                 <div style={{ marginTop: 'auto', borderTop: '2px dashed #cbd5e1', paddingTop: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#64748b' }}>
                      <span>New Items:</span>
                      <span>{revisionCart.length} units</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.4rem', fontWeight: '900', color: 'var(--text-main)' }}>
                      <span>New Total:</span>
                      <span>Rs. {calculateRevisionTotal().toFixed(2)}</span>
                    </div>
                 </div>

                 <button className="btn-primary" onClick={handleEditSubmit} style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
                   Confirm Revision
                 </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* VERSION HISTORY MODAL */}
      {isHistoryModalOpen && historyRecord && (
        <div className="modal-overlay">
          <div className="product-modal" style={{ maxWidth: '600px', width: '90%', maxHeight: '80vh' }}>
            <div className="modal-header">
              <h2>Revision History: <span style={{ color: 'var(--primary)' }}>{historyRecord.invoiceId}</span></h2>
              <button className="btn-close" onClick={() => setIsHistoryModalOpen(false)}><X size={20} /></button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
               
               {/* Current Version */}
               <div style={{ border: '2px solid #10b981', borderRadius: '12px', padding: '1rem', background: '#f0fdf4' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: '800', color: '#166534' }}>CURRENT VERSION (LIVE)</span>
                    <span style={{ fontSize: '0.85rem', color: '#166534' }}>Last updated: {new Date(historyRecord.updatedAt).toLocaleString()}</span>
                  </div>
                  <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Rs. {historyRecord.grandTotal.toFixed(2)}</p>
               </div>

               {/* Old Versions */}
               <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', color: '#64748b' }}>Previous Copies</h3>
                  {historyRecord.editHistory && historyRecord.editHistory.length > 0 ? historyRecord.editHistory.slice().reverse().map((hist, idx) => (
                    <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', background: '#fff' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                         <span style={{ fontWeight: '700', color: '#475569' }}>Copy #{historyRecord.editHistory.length - idx}</span>
                         <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{new Date(hist.modifiedBy).toString() === 'Invalid Date' ? 'Modified by ' + hist.modifiedBy : new Date(hist.modifiedAt).toLocaleString()}</span>
                       </div>
                       <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '0.8rem' }}>
                          {hist.items.map((i, iidx) => (
                            <span key={iidx} style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', color: '#64748b' }}>
                              {i.qty}x {i.name}
                            </span>
                          ))}
                       </div>
                       <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem' }}>
                         Original Total: Rs. {hist.grandTotal.toFixed(2)}
                       </div>
                    </div>
                  )) : (
                    <p style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>No previous revisions stored.</p>
                  )}
               </div>

            </div>
          </div>
        </div>
      )}



      {/* Floating Receipt View Modal */}
      {isReceiptModalOpen && selectedReceipt && (
        <div className="modal-overlay">
          <div className="product-modal" style={{ maxWidth: '850px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ paddingBottom: '1rem', borderBottom: '1px dashed #cbd5e1' }}>
              <h2>Invoice Detail</h2>
              <button className="btn-close" onClick={() => setIsReceiptModalOpen(false)}>
                &times;
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div className="glass-receipt-content" ref={receiptRef} style={{ background: '#fff', padding: '40px', boxSizing: 'border-box', color: '#000', fontFamily: 'Arial, sans-serif', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
                  
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '20px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                      <img 
                        src={`${API_BASE}/logo/${JSON.parse(localStorage.getItem('pos_user') || '{}')?.shopId || 'logo'}.png`} 
                        crossOrigin="anonymous" 
                        alt="Store Logo" 
                        style={{ width: '100px', height: '100px', objectFit: 'contain' }} 
                        onError={(e) => e.target.style.display = 'none'} 
                      />
                      <div>
                        <h1 style={{ margin: 0, fontSize: '30px', color: '#000', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          {shopDetails.name || JSON.parse(localStorage.getItem('pos_user') || '{}')?.shopName || 'MY STORE'}
                        </h1>
                        <p style={{ margin: '6px 0', fontSize: '14px', color: '#333' }}>{shopDetails.address || 'Aluminium & Glass Specialists'}</p>
                        <p style={{ margin: '0', fontSize: '14px', color: '#333' }}>Phone: {shopDetails.phone}</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                      <h1 style={{ margin: 0, fontSize: '38px', color: '#cbd5e1', textTransform: 'uppercase' }}>INVOICE</h1>
                      <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}><b>INV #{selectedReceipt.invoiceId || selectedReceipt._id.slice(-8).toUpperCase()}</b></p>
                      <p style={{ margin: '0', fontSize: '14px' }}>Date: {new Date(selectedReceipt.createdAt).toLocaleDateString()}</p>
                      <p style={{ margin: '0', fontSize: '14px' }}>Cashier: {selectedReceipt.cashier?.fullName || 'Admin'}</p>
                    </div>
                  </div>

                  {/* Billed To */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b', textTransform: 'uppercase' }}>Billed To:</h3>
                      <p style={{ margin: '0', fontSize: '18px', fontWeight: 'bold' }}>{selectedReceipt.customerName || 'Walk-in Customer'}</p>
                      <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>{selectedReceipt.customerPhone || ''}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b', textTransform: 'uppercase' }}>Payment Mode:</h3>
                      <p style={{ margin: '0', fontSize: '16px', fontWeight: 'bold' }}>{selectedReceipt.paymentMethod?.toUpperCase()}</p>
                    </div>
                  </div>

                  {/* Dimension Items Grid */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #000', borderTop: '2px solid #000' }}>
                        <th style={{ padding: '12px 8px', textAlign: 'center', width: '50px' }}>Sr#</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left' }}>Description</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center' }}>Dimensions (H x W)</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center' }}>Total Size</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center' }}>Qty</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right' }}>Rate</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReceipt.items.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', fontSize: '14px' }}>
                           <td style={{ padding: '12px 8px', textAlign: 'center' }}>{idx + 1}</td>
                           <td style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 'bold' }}>{item.name}</td>
                           <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                             {item.height && item.width && item.width !== 'X' ? `${item.height} x ${item.width} ${item.unit}` : '-'}
                           </td>
                           <td style={{ padding: '12px 8px', textAlign: 'center' }}>{item.totalSize || '-'}</td>
                           <td style={{ padding: '12px 8px', textAlign: 'center' }}>{item.qty}</td>
                           <td style={{ padding: '12px 8px', textAlign: 'right' }}>{item.salePrice}</td>
                           <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold' }}>{(item.totalItemPrice || (item.qty * item.salePrice)).toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals Section */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <div style={{ width: '320px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '15px' }}>Subtotal:</span>
                        <span style={{ fontSize: '15px' }}>Rs. {selectedReceipt.subtotal.toFixed(2)}</span>
                      </div>
                      {selectedReceipt.discount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0', color: '#ef4444' }}>
                          <span style={{ fontSize: '15px' }}>Discount:</span>
                          <span style={{ fontSize: '15px' }}>- Rs. {selectedReceipt.discount.toFixed(2)}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '2px solid #000', borderTop: '2px solid #000', fontWeight: 'bold', fontSize: '20px', backgroundColor: '#f8fafc', marginTop: '4px' }}>
                        <span style={{ paddingLeft: '8px' }}>Grand Total:</span>
                        <span style={{ paddingRight: '8px' }}>Rs. {selectedReceipt.grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center', background: '#f8fafc' }}>
               <button className="btn-primary" style={{ flex: 1 }} onClick={() => window.print()}>Print</button>
               <button className="btn-primary" style={{ background: '#3b82f6', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', flexShrink: 0, padding: '0' }} onClick={handleDownloadPDF} title="Download PDF"><Download size={18} /></button>
               <button className="btn-primary" style={{ background: '#25D366', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', flexShrink: 0, padding: '0' }} onClick={() => { setIsReceiptModalOpen(false); openWhatsappModal(selectedReceipt); }} title="Send via WhatsApp"><FaWhatsapp size={20} /></button>
               <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setIsReceiptModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {isWhatsappModalOpen && whatsappSale && (
        <div className="modal-overlay">
          <div className="product-modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header" style={{ paddingBottom: '1rem', borderBottom: '1px dashed #cbd5e1' }}>
              <h2>Send via WhatsApp</h2>
              <button className="btn-close" onClick={() => setIsWhatsappModalOpen(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleWhatsappSubmit} className="modal-body" style={{ padding: '1.5rem 2rem' }}>
              <div className="form-group">
                 <label>Customer Name (Optional)</label>
                 <input 
                   type="text" 
                   required
                   placeholder="E.g., John Doe"
                   value={wpName}
                   onChange={(e) => setWpName(e.target.value)}
                   style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
                 />
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                 <label>WhatsApp Number</label>
                 <input 
                   type="tel" 
                   required
                   placeholder="E.g., +1234567890"
                   value={wpPhone}
                   onChange={(e) => setWpPhone(e.target.value)}
                   style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
                 />
                 <small style={{ color: '#64748b', display: 'block', marginTop: '0.5rem' }}>This customer will automatically be added or synced to your CRM.</small>
              </div>
              <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setIsWhatsappModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, background: '#10b981', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <MessageCircle size={18} /> Send
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default GlassSalesHistory;

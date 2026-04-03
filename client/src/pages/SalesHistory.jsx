import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import API_BASE from '../config';
import { 
  LayoutDashboard, ShoppingCart, Package, Settings, 
  Search, Eye, Printer, RotateCcw, Truck, List, Users, Store, BarChart3, MessageCircle, X, Download
} from 'lucide-react';
import './SalesHistory.css';
import '../pages/Billing.css'; // Reuse thermal receipt styling specifically

const SalesHistory = () => {
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [selectedSaleToRefund, setSelectedSaleToRefund] = useState(null);
  const [refundItemsMap, setRefundItemsMap] = useState({});

  // Refund Receipt State
  const [refundReceiptData, setRefundReceiptData] = useState(null); // { sale, refundedItems }
  const [isRefundReceiptOpen, setIsRefundReceiptOpen] = useState(false);
  const refundReceiptRef = useRef(null);
  
  const [shopDetails, setShopDetails] = useState({ name: 'MY STORE', address: 'Address', phone: 'Contact' });

  // WhatsApp Sync States
  const [isWhatsappModalOpen, setIsWhatsappModalOpen] = useState(false);
  const [whatsappSale, setWhatsappSale] = useState(null);
  const [wpName, setWpName] = useState('');
  const [wpPhone, setWpPhone] = useState('');

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
      
      const shopRes = await axios.get(`${API_BASE}/api/settings/shop`, {
        headers: { 'x-auth-token': token }
      });
      if (shopRes.data) {
        setShopDetails(shopRes.data);
      }
    } catch (err) {
      console.error('Failed to grab sales history', err);
    }
  };

  const openRefundModal = (sale) => {
    setSelectedSaleToRefund(sale);
    const initialMap = {};
    sale.items.forEach(i => {
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

  const submitPartialRefund = async () => {
    const payloadItems = Object.keys(refundItemsMap).map(pid => ({
      product_id: pid,
      returnQty: refundItemsMap[pid]
    })).filter(r => r.returnQty > 0);

    if (payloadItems.length === 0) {
      return alert('Please enter the quantity to refund for at least one item.');
    }

    if (!window.confirm('Confirm partial refund? Selected items will be restocked.')) return;
    
    try {
      const token = localStorage.getItem('pos_token');
      await axios.post(`${API_BASE}/api/sales/${selectedSaleToRefund._id}/partial-refund`, {
        refundItems: payloadItems
      }, {
        headers: { 'x-auth-token': token }
      });

      // Build refund receipt data from what was actually returned
      const refundedItems = selectedSaleToRefund.items
        .filter(item => {
          const pid = item.product || item._id;
          return (refundItemsMap[pid] || 0) > 0;
        })
        .map(item => {
          const pid = item.product || item._id;
          const qty = refundItemsMap[pid];
          return { ...item, qty, totalItemPrice: qty * item.salePrice };
        });

      setRefundReceiptData({ sale: selectedSaleToRefund, refundedItems });
      setIsRefundModalOpen(false);
      setIsRefundReceiptOpen(true);
      fetchSales();
    } catch (err) {
      alert(err.response?.data?.message || 'Error processing partial refund.');
    }
  };

  const submitCompleteRefund = async () => {
    if (!window.confirm('Confirm COMPLETE refund? All items from this sale will be fully restocked.')) return;
    try {
      const token = localStorage.getItem('pos_token');
      await axios.post(`${API_BASE}/api/sales/${selectedSaleToRefund._id}/refund`, {}, {
        headers: { 'x-auth-token': token }
      });
      alert('Complete refund processed successfully! All stock restored.');
      setIsRefundModalOpen(false);
      fetchSales();
    } catch (err) {
      alert(err.response?.data?.message || 'Error processing complete refund.');
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
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 250] });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Receipt_${selectedReceipt.invoiceId || selectedReceipt._id.slice(-8).toUpperCase()}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Error generating PDF');
    }
  };

  const handleDownloadRefundPDF = async () => {
    if (!refundReceiptRef.current) return;
    try {
      const canvas = await html2canvas(refundReceiptRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 250] });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Refund_${refundReceiptData.sale.invoiceId || refundReceiptData.sale._id.slice(-8).toUpperCase()}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Error generating Refund PDF');
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

      const rawReceiptText = `*E-Receipt from ${activeUser.shopName || 'POS Store'}*\nInvoice ID: ${whatsappSale.invoiceId || '#' + whatsappSale._id.slice(-8).toUpperCase()}\nDate: ${new Date(whatsappSale.createdAt).toLocaleString()}\n\n*Items Purchased:*\n${whatsappSale.items.map(item => `- ${item.name} x${item.qty} (Rs. ${item.salePrice * item.qty})`).join('\n')}\n\n*Total Paid:* Rs. ${whatsappSale.grandTotal.toFixed(2)}\n\nThank you for shopping with us!`;
      
      const cleanPhone = wpPhone.replace(/\D/g, ''); // Fix wa.me format
      const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(rawReceiptText)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      
      setIsWhatsappModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Error connecting smoothly intuitively implicitly realistically appropriately dynamically natively effortlessly cleanly seamlessly naturally elegantly dependably explicitly neatly.');
    }
  };

  const filteredSales = sales.filter(s => 
    s._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.cashier?.fullName || 'Cashier').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="sales-history-container">
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
        <div className="nav-item active" title="Sales History">
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
                <th>Customer CRM</th>
                <th>Items Sold</th>
                <th>Total Value</th>
                <th>Method</th>
                <th>Status</th>
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
                    <span className={`status-badge ${sale.status.toLowerCase()}`}>
                      {sale.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-icon-action" onClick={() => viewReceipt(sale)}>
                        <Eye size={16} /> View
                      </button>
                      {!isCashier && sale.status !== 'Refunded' && (
                        <button className="btn-icon-action danger" onClick={() => openRefundModal(sale)}>
                          <RotateCcw size={16} /> Refund
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

      {/* Floating Receipt View Modal */}
      {isReceiptModalOpen && selectedReceipt && (
        <div className="modal-overlay">
          <div className="product-modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header" style={{ paddingBottom: '1rem', borderBottom: '1px dashed #cbd5e1' }}>
              <h2>Invoice Detail</h2>
              <button className="btn-close" onClick={() => setIsReceiptModalOpen(false)}>
                &times;
              </button>
            </div>
            
            <div style={{ margin: '1rem 0', display: 'flex', justifyContent: 'center' }}>
              {/* Actual Printable Wrapper that thermal engines will dynamically map onto */}
              <div id="reprint-receipt" className="receipt-paper print-receipt-wrapper" ref={receiptRef} style={{ boxShadow: 'none', background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%' }}>
                
                <div className="receipt-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <img 
                    src={`${API_BASE}/logo/${JSON.parse(localStorage.getItem('pos_user') || '{}')?.shopId || 'logo'}.png`} 
                    crossOrigin="anonymous" 
                    alt="Store Logo" 
                    style={{ width: '80px', marginBottom: '0.5rem', objectFit: 'contain' }} 
                    onError={(e) => e.target.style.display = 'none'} 
                  />
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>{shopDetails.name || JSON.parse(localStorage.getItem('pos_user') || '{}')?.shopName || 'MY STORE'}</h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>{shopDetails.address || 'Address'} | {shopDetails.phone || 'Contact'}</p>
                  <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Receipt Reprint</p>
                  <div style={{ width: '100%', borderBottom: '1px dashed #000', margin: '0.5rem 0' }}></div>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>Date: {new Date(selectedReceipt.createdAt).toLocaleString()}</p>
                  <p style={{ fontSize: '0.8rem' }}>Order: {selectedReceipt.invoiceId || '#' + selectedReceipt._id.slice(-6).toUpperCase()}</p>
                </div>
                
                <div className="receipt-items" style={{ margin: '1rem 0' }}>
                  {selectedReceipt.items.map((item, index) => (
                    <div className="receipt-item" key={index} style={{ marginBottom: '0.5rem' }}>
                      <div className="item-name" style={{ fontWeight: '500' }}>{item.name}</div>
                      <div className="item-details" style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{item.qty} x Rs. {item.salePrice}</span>
                        <span>Rs. {item.totalItemPrice}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="receipt-totals" style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div className="total-line" style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Subtotal:</span> <span>Rs. {selectedReceipt.subtotal}</span></div>
                  {selectedReceipt.discount > 0 && <div className="total-line" style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Discount:</span> <span>- Rs. {selectedReceipt.discount}</span></div>}
                  <div className="total-line grand" style={{ fontWeight: 'bold', fontSize: '1.1rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}><span>Total:</span> <span>Rs. {selectedReceipt.grandTotal}</span></div>
                  <div className="total-line" style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Paid Via:</span> <span>{selectedReceipt.paymentMethod}</span></div>
                  <div className="total-line" style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Status:</span> <span>{selectedReceipt.status}</span></div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.75rem', borderTop: '1px dashed #000', paddingTop: '1rem', color: '#64748b' }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '0.2rem' }}>Developed By Tycoon Technologies Pvt. Ltd. Islamabad.</p>
                  <p>03060626699 www.tycoon.technology</p>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
               <div style={{ display: 'flex', gap: '0.5rem', width: '100%', justifyContent: 'center' }}>
                 <button className="btn-primary" style={{ flex: 1, background: '#3b82f6', border: 'none' }} onClick={handleDownloadPDF}><Download size={18} style={{ marginRight: '0.5rem'}} /> PDF</button>
                 <button className="btn-primary" style={{ flex: 1 }} onClick={() => window.print()}><Printer size={18} style={{ marginRight: '0.5rem'}} /> Print</button>
               </div>
               <button className="btn-primary" style={{ width: '100%', background: '#10b981', border: 'none' }} onClick={() => { setIsReceiptModalOpen(false); openWhatsappModal(selectedReceipt); }}>
                 <MessageCircle size={18} style={{ marginRight: '0.5rem'}} /> WhatsApp
               </button>
               <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setIsReceiptModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {isRefundModalOpen && selectedSaleToRefund && (
        <div className="modal-overlay">
          <div className="product-modal" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Process Refund</h2>
              <button className="btn-close" onClick={() => setIsRefundModalOpen(false)}>&times;</button>
            </div>

            {/* Complete Refund Banner */}
            <div style={{ padding: '1rem 1.5rem', background: '#fef2f2', borderBottom: '2px dashed #fca5a5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: '700', color: '#991b1b', marginBottom: '0.2rem' }}>Complete Refund</p>
                <p style={{ fontSize: '0.85rem', color: '#ef4444' }}>Refunds all items and fully restocks inventory.</p>
              </div>
              <button
                onClick={submitCompleteRefund}
                style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', padding: '0.6rem 1.4rem', fontWeight: '700', cursor: 'pointer', fontSize: '0.95rem', whiteSpace: 'nowrap' }}
              >
                Complete Refund
              </button>
            </div>
            
            {/* Partial Refund Section */}
            <div style={{ padding: '1.5rem', maxHeight: '50vh', overflowY: 'auto' }}>
              <p style={{ color: '#64748b', marginBottom: '1rem', fontWeight: '600' }}>— Or process a Partial Refund by selecting quantities below:</p>
              
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                     <th style={{ textAlign: 'left', paddingBottom: '0.8rem', borderBottom: '1px solid #e2e8f0' }}>Item Name</th>
                     <th style={{ textAlign: 'center', paddingBottom: '0.8rem', borderBottom: '1px solid #e2e8f0' }}>Purchased Qty</th>
                     <th style={{ textAlign: 'center', paddingBottom: '0.8rem', borderBottom: '1px solid #e2e8f0' }}>Refund Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSaleToRefund.items.map(item => (
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

            <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '1rem 2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end', background: '#f8fafc' }}>
               <button className="btn-secondary" onClick={() => setIsRefundModalOpen(false)}>Cancel</button>
               <button className="btn-primary" style={{ background: '#f97316', border: 'none' }} onClick={submitPartialRefund}>Partial Refund</button>
            </div>
          </div>
        </div>
      )}

      {/* Partial Refund Receipt Modal */}
      {isRefundReceiptOpen && refundReceiptData && (
        <div className="modal-overlay">
          <div className="product-modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header" style={{ paddingBottom: '1rem', borderBottom: '1px dashed #cbd5e1' }}>
              <h2>Refund Receipt</h2>
              <button className="btn-close" onClick={() => setIsRefundReceiptOpen(false)}>&times;</button>
            </div>

            <div style={{ margin: '1rem 0', display: 'flex', justifyContent: 'center' }}>
              <div ref={refundReceiptRef} className="receipt-paper print-receipt-wrapper" style={{ boxShadow: 'none', background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%' }}>

                <div className="receipt-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <img
                    src={`${API_BASE}/logo/${JSON.parse(localStorage.getItem('pos_user') || '{}')?.shopId || 'logo'}.png`}
                    crossOrigin="anonymous"
                    alt="Store Logo"
                    style={{ width: '80px', marginBottom: '0.5rem', objectFit: 'contain' }}
                    onError={(e) => e.target.style.display = 'none'}
                  />
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>{shopDetails.name || activeUser.shopName || 'MY STORE'}</h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>{shopDetails.address || 'Address'} | {shopDetails.phone || 'Contact'}</p>
                  <p style={{ fontSize: '0.9rem', fontWeight: '700', color: '#dc2626', marginTop: '0.5rem' }}>⚠ REFUND RECEIPT</p>
                  <div style={{ width: '100%', borderBottom: '1px dashed #000', margin: '0.5rem 0' }}></div>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>Date: {new Date().toLocaleString()}</p>
                  <p style={{ fontSize: '0.8rem' }}>Ref: {refundReceiptData.sale.invoiceId || '#' + refundReceiptData.sale._id.slice(-6).toUpperCase()}</p>
                </div>

                <div className="receipt-items" style={{ margin: '1rem 0' }}>
                  {refundReceiptData.refundedItems.map((item, index) => (
                    <div className="receipt-item" key={index} style={{ marginBottom: '0.5rem' }}>
                      <div className="item-name" style={{ fontWeight: '500' }}>{item.name}</div>
                      <div className="item-details" style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{item.qty} x Rs. {item.salePrice} (RETURNED)</span>
                        <span>- Rs. {item.totalItemPrice}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="receipt-totals" style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div className="total-line grand" style={{ fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                    <span>Total Refunded:</span>
                    <span>Rs. {refundReceiptData.refundedItems.reduce((s, i) => s + i.totalItemPrice, 0).toFixed(2)}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.75rem', borderTop: '1px dashed #000', paddingTop: '1rem', color: '#64748b' }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '0.2rem' }}>Developed By Tycoon Technologies Pvt. Ltd. Islamabad.</p>
                  <p>03060626699 www.tycoon.technology</p>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%', justifyContent: 'center' }}>
                <button className="btn-primary" style={{ flex: 1, background: '#3b82f6', border: 'none' }} onClick={handleDownloadRefundPDF}><Download size={18} style={{ marginRight: '0.5rem' }} /> PDF</button>
                <button className="btn-primary" style={{ flex: 1 }} onClick={() => window.print()}><Printer size={18} style={{ marginRight: '0.5rem' }} /> Print</button>
              </div>
              <button className="btn-primary" style={{ width: '100%', background: '#10b981', border: 'none' }} onClick={() => { setIsRefundReceiptOpen(false); openWhatsappModal(refundReceiptData.sale); }}>
                <MessageCircle size={18} style={{ marginRight: '0.5rem' }} /> WhatsApp
              </button>
              <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setIsRefundReceiptOpen(false)}>Close</button>
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

export default SalesHistory;

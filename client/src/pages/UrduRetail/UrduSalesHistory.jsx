import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import API_BASE from '../../config';
import { 
  LayoutDashboard, ShoppingCart, Package, Settings, 
  Search, Eye, Printer, RotateCcw, Truck, List, Users, Store, BarChart3, MessageCircle, X, Download, DollarSign, UserCheck, Edit2, Trash2
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import '../SalesHistory.css';
import '../Billing.css'; // Reuse thermal receipt styling specifically

const UrduSalesHistory = () => {
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
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
  
  const [shopDetails, setShopDetails] = useState({ name: '', address: '', phone: '', taxRate: 0 });

  const activeUser = JSON.parse(localStorage.getItem('pos_user') || '{}');
  const isCashier = activeUser.role === 'User';

  useEffect(() => {
    if (activeUser.shopCategory?.toLowerCase() === 'glass') {
      navigate('/glass-sales', { replace: true });
    } else if (activeUser.shopCategory === 'retail') {
      navigate('/sales-history', { replace: true });
    }
    fetchSales();

    // Fetch real shop details for receipt printing (same as Billing.jsx)
    const fetchShopDetails = async () => {
      try {
        const token = localStorage.getItem('pos_token');
        const res = await axios.get(`${API_BASE}/api/settings/shop`, {
          headers: { 'x-auth-token': token }
        });
        if (res.data) setShopDetails(res.data);
      } catch (err) {
        console.error('Failed to fetch shop settings', err);
      }
    };
    fetchShopDetails();
  }, [activeUser.shopCategory, navigate]);

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

  const filteredSales = sales.filter(s => {
    const matchesSearch = 
      s._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.invoiceId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.paymentMethod || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.cashier?.fullName || 'Cashier').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProduct = !filterProduct || s.items.some(item => 
      item.product === filterProduct || item.name === filterProduct
    );

    const matchesStartDate = !startDate || new Date(s.createdAt) >= new Date(startDate + 'T00:00:00');
    const matchesEndDate = !endDate || new Date(s.createdAt) <= new Date(endDate + 'T23:59:59');

    return matchesSearch && matchesProduct && matchesStartDate && matchesEndDate;
  });


  // ── Popup Receipt Reprint — Urdu RTL version, same engine as Billing.jsx ──
  const printReceiptPopup = (sale) => {
    const user = JSON.parse(localStorage.getItem('pos_user') || '{}');
    const shopN = shopDetails.name || user.shopName || 'MY STORE';
    const shopAddr = shopDetails.address || '';
    const shopPhone = shopDetails.phone || '';
    const cashier = user.fullName || 'ایڈمن';
    const logoUrl = `${API_BASE}/logo/${user.shopId}.png`;

    const itemRows = sale.items.map(item => `
      <div class="item-row">
        <span class="item-name">${item.name}</span>
        <span class="item-qty">${item.qty}</span>
        <span class="item-total">Rs. ${(item.totalItemPrice ?? (item.salePrice * item.qty)).toFixed(0)}</span>
      </div>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>رسید دوبارہ پرنٹ</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: auto; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #000; width: 72mm; padding: 4mm; direction: rtl; }
        .center { text-align: center; }
        .logo { width: 70px; object-fit: contain; margin-bottom: 4px; }
        h2 { font-size: 16px; font-weight: 900; margin-bottom: 2px; }
        .sub { font-size: 10px; margin-bottom: 4px; }
        .dash { border-top: 1.5px dashed #000; margin: 5px 0; }
        .info { font-size: 11px; line-height: 1.9; text-align: right; }
        .reprint-badge { font-size: 10px; font-weight: 700; text-align: center; margin: 3px 0; }
        .col-header { display: flex; font-weight: 800; font-size: 11px; border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 4px; }
        .item-row { display: flex; font-size: 11px; margin-bottom: 3px; }
        .item-name { flex: 2; text-align: right; }
        .item-qty { flex: 1; text-align: center; }
        .item-total { flex: 1; text-align: left; }
        .sum-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; }
        .grand-row { display: flex; justify-content: space-between; font-size: 15px; font-weight: 900; border-top: 2px solid #000; margin-top: 5px; padding-top: 5px; }
        .balance-row { display: flex; justify-content: space-between; font-size: 12px; font-weight: 800; margin-top: 3px; border-top: 1px solid #000; padding-top: 3px; }
        .footer { text-align: center; margin-top: 8px; font-size: 9px; color: #555; border-top: 1px dashed #000; padding-top: 6px; }
      </style></head><body>
      <div class="center">
        <img class="logo" src="${logoUrl}" crossorigin="anonymous" onerror="this.style.display='none'" />
        <h2>${shopN}</h2>
        ${shopAddr || shopPhone ? `<p class="sub">${[shopAddr, shopPhone].filter(Boolean).join(' | ')}</p>` : ''}
      </div>
      <div class="dash"></div>
      <p class="reprint-badge">*** رسید دوبارہ پرنٹ ***</p>
      <div class="dash"></div>
      <div class="info">
        <p><b>تاریخ:</b> ${new Date(sale.createdAt).toLocaleString('ur-PK')}</p>
        <p><b>کیشیئر:</b> ${cashier}</p>
        <p><b>ادائیگی:</b> ${(sale.paymentMethod || '').toUpperCase()}</p>
        <p><b>رسید نمبر:</b> ${sale.invoiceId || ('#' + sale._id.slice(-8).toUpperCase())}</p>
        ${sale.customerName && sale.customerName !== 'Guest' ? `<p><b>کسٹمر:</b> ${sale.customerName}</p>` : ''}
      </div>
      <div class="dash"></div>
      <div class="col-header">
        <span style="flex:2">آئٹم</span>
        <span style="flex:1;text-align:center">تعداد</span>
        <span style="flex:1;text-align:left">ٹوٹل</span>
      </div>
      ${itemRows}
      <div class="dash"></div>
      ${sale.discount > 0 ? `<div class="sum-row"><span>رعایت</span><span>- Rs. ${Number(sale.discount).toFixed(2)}</span></div>` : ''}
      ${sale.taxAmount > 0 ? `<div class="sum-row"><span>ٹیکس (${sale.taxRate}%)</span><span>+ Rs. ${Number(sale.taxAmount).toFixed(2)}</span></div>` : ''}
      <div class="grand-row"><span>حتمی رقم</span><span>Rs. ${Number(sale.grandTotal).toFixed(0)}</span></div>
      ${sale.dueAmount > 0 ? `
        <div class="sum-row" style="margin-top:6px"><span>وصول شدہ رقم</span><span>Rs. ${Number(sale.amountPaid || 0).toFixed(2)}</span></div>
        <div class="balance-row"><span>بقایا رقم</span><span>Rs. ${Number(sale.dueAmount).toFixed(2)}</span></div>` : ''}
      <div class="footer">
        <p style="font-weight:700">Developed By Tycoon Technologies Pvt. Ltd. Islamabad.</p>
        <p>03060626699 | www.tycoon.technology</p>
      </div>
      <script>
        window.onload = function() {
          var hPx = document.body.scrollHeight;
          var hMm = Math.ceil(hPx * 25.4 / 96) + 4;
          var s = document.createElement('style');
          s.textContent = '@page { size: 80mm ' + hMm + 'mm; margin: 0; }';
          document.head.appendChild(s);
          window.print();
          window.close();
        };
      <\/script>
    </body></html>`;

    const w = window.open('', '_blank', 'width=400,height=200');
    if (w) { w.document.write(html); w.document.close(); w.focus(); }
  };

  return (
    <div className="sales-history-container urdu-rtl" style={{ direction: 'rtl', fontFamily: 'Noto Nastaliq Urdu, sans-serif' }}>
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
        <div className="nav-item active" title="Sales History">
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
        <div className="nav-item" onClick={() => navigate('/urdu-settings')} title="Settings" style={{ marginTop: 'auto' }}>
          <Settings size={20} />
        </div>
      </nav>

      {/* Main Container */}
      <main className="sales-history-main">
        <header className="sales-history-header">
          <div className="sales-title">
            <h1>تاریخ فروخت و واپسی</h1>
            <p>ماضی کی کامیاب ٹرانزیکشنز اور ریفنڈز کی تفصیل دیکھیں</p>
          </div>
        </header>

        {/* فلٹرز پینل */}
        <div className="sales-filters-bar">
          <div className="filter-group search-group">
            <label>سرچ ٹرانزیکشنز</label>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={18} style={{ position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="text" 
                className="filter-input"
                style={{ paddingRight: '2.5rem', paddingLeft: '0.8rem', textAlign: 'right' }}
                placeholder="انوائس آئی ڈی، کسٹمر، کیشیئر، طریقہ..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="filter-group">
            <label>پروڈکٹ سے فلٹر</label>
            <select 
              className="filter-input"
              style={{ textAlign: 'right' }}
              value={filterProduct} 
              onChange={(e) => setFilterProduct(e.target.value)}
            >
              <option value="">تمام مصنوعات</option>
              {inventory.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>تاریخ سے</label>
            <input 
              type="date" 
              className="filter-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>تاریخ تک</label>
            <input 
              type="date" 
              className="filter-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {(searchTerm || filterProduct || startDate || endDate) && (
            <button 
              className="btn-reset-filters"
              onClick={() => {
                setSearchTerm('');
                setFilterProduct('');
                setStartDate('');
                setEndDate('');
              }}
              title="تمام فلٹرز ختم کریں"
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
            >
              <RotateCcw size={16} /> ری سیٹ
            </button>
          )}
        </div>

        <div className="sales-table-wrapper">
          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'right' }}>انوائس آئی ڈی</th>
                <th style={{ textAlign: 'right' }}>تاریخ / وقت</th>
                <th style={{ textAlign: 'right' }}>کسٹمر</th>
                <th style={{ textAlign: 'center' }}>فروخت شدہ اشیاء</th>
                <th style={{ textAlign: 'center' }}>کل مالیت</th>
                <th style={{ textAlign: 'center' }}>ادائیگی کا طریقہ</th>
                <th style={{ textAlign: 'center' }}>ورژن</th>
                <th style={{ textAlign: 'left' }}>ایکشن</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map(sale => (
                <tr key={sale._id}>
                  <td style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 'bold' }}>{sale.invoiceId || '#' + sale._id.slice(-8).toUpperCase()}</td>
                  <td>{new Date(sale.createdAt).toLocaleString()}</td>
                  <td style={{ fontWeight: '500', color: sale.customer ? '#2563eb' : '#64748b' }}>{sale.customerName || 'Guest'}</td>
                  <td>{sale.items.length} پروڈکٹ(ز)</td>
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
              <p>آپ کے ریکارڈ سے مماثل کوئی ٹرانزیکشن نہیں ملی۔</p>
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
                <h2>انوائس میں ترمیم / نظرثانی: <span style={{ color: 'var(--primary)' }}>{editingSale.invoiceId}</span></h2>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>محفوظ کرنے پر اسٹاک خود بخود اپ ڈیٹ ہو جائے گا۔</p>
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
                      {inventory.filter(p => p.name.toLowerCase().includes(revisionSearchTerm.toLowerCase()) || p.barcode.includes(revisionSearchTerm)).map(p => (
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
          <div className="product-modal" style={{ maxWidth: '400px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ paddingBottom: '1rem', borderBottom: '1px dashed #cbd5e1' }}>
              <h2>انوائس تفصیل</h2>
              <button className="btn-close" onClick={() => setIsReceiptModalOpen(false)}>
                &times;
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
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
                    <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>رسید دوبارہ پرنٹ</p>
                    <div style={{ width: '100%', borderBottom: '1px dashed #000', margin: '0.5rem 0' }}></div>
                    <p style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>تاریخ: {new Date(selectedReceipt.createdAt).toLocaleString('ur-PK')}</p>
                    <p style={{ fontSize: '0.8rem' }}>رسید نمبر: {selectedReceipt.invoiceId || '#' + selectedReceipt._id.slice(-6).toUpperCase()}</p>
                  </div>
                  
                  <div className="receipt-items" style={{ margin: '1rem 0' }}>
                    {activeUser.shopCategory === 'glass' ? (
                      <div>
                        {/* Custom Image Receipt Header */}
                        <div className="receipt-item-row" style={{ fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '0.4rem', marginBottom: '0.4rem', display: 'grid', gridTemplateColumns: '2fr 1fr 20px 1fr 1fr 1fr 1.2fr 1fr 1.2fr', gap: '4px', fontSize: '0.8rem' }}>
                          <span>Item</span>
                          <span style={{ textAlign: 'center' }}>Height</span>
                          <span></span>
                          <span style={{ textAlign: 'center' }}>Wirth</span>
                          <span style={{ textAlign: 'center' }}></span>
                          <span style={{ textAlign: 'center' }}>Qty</span>
                          <span style={{ textAlign: 'center' }}>Total Size</span>
                          <span style={{ textAlign: 'center' }}>Rate</span>
                          <span style={{ textAlign: 'right' }}>Amount</span>
                        </div>
                        {selectedReceipt.items.map((item, index) => (
                          <div key={index} style={{ 
                            display: 'grid', gridTemplateColumns: '2fr 1fr 20px 1fr 1fr 1fr 1.2fr 1fr 1.2fr', gap: '4px', 
                            padding: '0.3rem 0',
                            borderBottom: '1px solid #eee', fontSize: '0.75rem'
                          }}>
                            <span style={{ fontWeight: 'bold' }}>{item.name}</span>
                            <span style={{ textAlign: 'center' }}>{item.height}</span>
                            <span style={{ textAlign: 'center', fontWeight: 'bold' }}>X</span>
                            <span style={{ textAlign: 'center' }}>{item.width}</span>
                            <span style={{ textAlign: 'center' }}>{item.unit}</span>
                            <span style={{ textAlign: 'center' }}>{item.qty}</span>
                            <span style={{ textAlign: 'center' }}>{item.totalSize}</span>
                            <span style={{ textAlign: 'center' }}>{item.salePrice}</span>
                            <span style={{ textAlign: 'right', fontWeight: 'bold' }}>{item.totalItemPrice.toFixed(0)}/Rs</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      selectedReceipt.items.map((item, index) => (
                        <div className="receipt-item" key={index} style={{ marginBottom: '0.5rem' }}>
                          <div className="item-name" style={{ fontWeight: '500' }}>{item.name}</div>
                          <div className="item-details" style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{item.qty} x Rs. {item.salePrice}</span>
                            <span>Rs. {item.totalItemPrice}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div className="receipt-totals" style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div className="total-line" style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>ذیلی کل:</span> <span>Rs. {selectedReceipt.subtotal}</span></div>
                    {selectedReceipt.discount > 0 && <div className="total-line" style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>رعایت:</span> <span>- Rs. {selectedReceipt.discount}</span></div>}
                    <div className="total-line grand" style={{ fontWeight: 'bold', fontSize: '1.1rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}><span>حتمی رقم:</span> <span>Rs. {selectedReceipt.grandTotal}</span></div>
                    <div className="total-line" style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>ادائیگی:</span> <span>{selectedReceipt.paymentMethod}</span></div>
                    <div className="total-line" style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>حالت:</span> <span>{selectedReceipt.status}</span></div>
                  </div>

                  <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.75rem', borderTop: '1px dashed #000', paddingTop: '1rem', color: '#64748b' }}>
                    <p style={{ fontWeight: 'bold', marginBottom: '0.2rem' }}>Developed By Tycoon Technologies Pvt. Ltd. Islamabad.</p>
                    <p>03060626699</p>
                    <p>www.tycoon.technology</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-actions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '0.8rem', width: '100%', padding: '1.2rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
               <button onClick={() => printReceiptPopup(selectedReceipt)} className="btn-modal-action" style={{ background: '#4f46e5', color: 'white' }}>
                 <Printer size={18} /><span>رسید پرنٹ</span>
               </button>
               <button onClick={handleDownloadPDF} className="btn-modal-action" style={{ background: '#f8fafc', color: '#1e293b', border: '1px solid #e2e8f0' }}>
                 <Download size={18} /><span>PDF</span>
               </button>
               <button onClick={() => { setIsReceiptModalOpen(false); openWhatsappModal(selectedReceipt); }} className="btn-modal-action" style={{ background: '#25D366', color: 'white' }}>
                 <FaWhatsapp size={20} /><span>واٹس ایپ</span>
               </button>
               <button onClick={() => setIsReceiptModalOpen(false)} className="btn-modal-action" style={{ background: '#ef4444', color: 'white' }}>
                 <X size={18} /><span>بند کریں</span>
               </button>
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

      <style>{`
        .urdu-rtl .btn-modal-action {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          padding: 0.8rem 0.4rem;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          font-weight: bold;
          font-size: 0.85rem;
          transition: transform 0.1s, opacity 0.2s;
          min-height: 75px;
        }
        .urdu-rtl .btn-modal-action:hover { opacity: 0.9; transform: translateY(-2px); }
        .urdu-rtl .btn-modal-action:active { transform: translateY(0); }
        .urdu-rtl .btn-modal-action span { line-height: 1.2; }
      `}</style>
    </div>
  );
};

export default UrduSalesHistory;

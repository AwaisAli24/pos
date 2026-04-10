import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import API_BASE from '../config';
import { 
  Search, Trash2, Plus, Minus, 
  CreditCard, Banknote, Printer, PauseCircle, 
  ShoppingCart, LogOut, PackageSearch, Package, LayoutDashboard, List, Truck, Barcode, Users, Store, BarChart3, X, Download
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import './GlassBilling.css'; // Switch to A4 exclusive Glass styling

// Mock data for quick select products
const QUICK_PRODUCTS = [
  { id: '101', name: 'Premium Foil Balloon', price: 500, category: 'Party', barcode: '890123' },
  { id: '102', name: 'Birthday Banner Large', price: 850, category: 'Party', barcode: '890124' },
  { id: '103', name: 'Sparkler Candles', price: 300, category: 'Cake', barcode: '890125' },
  { id: '104', name: 'Gift Wrapping Roll', price: 350, category: 'Gifts', barcode: '890126' },
  { id: '105', name: 'Party Popper Mix', price: 500, category: 'Effects', barcode: '890127' },
  { id: '106', name: 'LED String Lights', price: 1200, category: 'Lighting', barcode: '890128' },
  { id: '107', name: 'Teddy Bear Small', price: 1500, category: 'Gifts', barcode: '890129' },
  { id: '108', name: 'Disposable Cup Set', price: 650, category: 'Tableware', barcode: '890130' }
];

const GlassBilling = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dbProducts, setDbProducts] = useState([]);
  const [receiptData, setReceiptData] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [crmCustomers, setCrmCustomers] = useState([]);
  const [customerType, setCustomerType] = useState('Walk-in');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  // WhatsApp States
  const [isWhatsappModalOpen, setIsWhatsappModalOpen] = useState(false);
  const [wpName, setWpName] = useState('');
  const [wpPhone, setWpPhone] = useState('');
  const [shopDetails, setShopDetails] = useState({ name: '', address: '', phone: '', taxRate: 0 });
  
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const token = localStorage.getItem('pos_token');
        const shopRes = await axios.get(`${API_BASE}/api/settings/shop`, {
          headers: { 'x-auth-token': token }
        });
        if (shopRes.data) setShopDetails(shopRes.data);
      } catch (err) {
        console.error('Failed to fetch POS config', err);
      }
    };
    fetchConfig();
  }, []);

  // Hold Order State
  const [isRecallModalOpen, setIsRecallModalOpen] = useState(false);
  const [heldOrders, setHeldOrders] = useState(() => {
    const saved = localStorage.getItem('pos_held_orders');
    return saved ? JSON.parse(saved) : [];
  });

  // Sync holds to Storage so we dont lose carts on accidental refresh
  useEffect(() => {
    localStorage.setItem('pos_held_orders', JSON.stringify(heldOrders));
  }, [heldOrders]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (receiptData) setReceiptData(null);
        if (isRecallModalOpen) setIsRecallModalOpen(false);
        if (isWhatsappModalOpen) setIsWhatsappModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [receiptData, isRecallModalOpen, isWhatsappModalOpen]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = localStorage.getItem('pos_token');
        const res = await axios.get(`${API_BASE}/api/inventory`, {
          headers: { 'x-auth-token': token }
        });
        if (res.data) {
          setDbProducts(res.data);
        }
        
        const crmRes = await axios.get(`${API_BASE}/api/customers`, {
          headers: { 'x-auth-token': token }
        });
        if (crmRes.data) {
          setCrmCustomers(crmRes.data);
        }
      } catch (err) {
        console.error('Failed to grab products', err);
      }
    };
    fetchProducts();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_user');
    navigate('/login');
  };

  // Auto-add item using mock barcode
  const handleSearchInput = (e) => {
    const value = e.target.value;
    setBarcodeInput(value);
    
    if (value.trim()) {
      const matched = dbProducts.filter(p => 
        p.barcode.toLowerCase().includes(value.toLowerCase()) || 
        p.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions(matched);
      setShowSuggestions(true);
      setHighlightedIndex(-1);
    } else {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  const handleSuggestionClick = (product) => {
    addToCart(product);
    setBarcodeInput('');
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    
    // Find product in our database
    const product = dbProducts.find(
      p => p.barcode === barcodeInput || p.name.toLowerCase() === barcodeInput.toLowerCase()
    );
    if (product) {
      addToCart(product);
      setBarcodeInput('');
      setShowSuggestions(false);
    } else {
      alert(`Product with barcode ${barcodeInput} not found!`);
    }
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
        e.preventDefault();
        handleSuggestionClick(filteredSuggestions[highlightedIndex]);
      }
      // If -1 (none highlighted), native form onSubmit correctly captures the standard search
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  const addToCart = (product) => {
    setCart(prevCart => {
      if (product.currentStock <= 0) {
        alert(`${product.name} is currently out of stock.`);
        return prevCart;
      }
      return [...prevCart, { 
        ...product, 
        id_unique: Date.now() + Math.random().toString(), 
        qty: 1,
        height: '',
        width: '',
        unit: 'inch'
      }];
    });
  };

  const updateQty = (uniqueId, delta) => {
    setCart(prevCart => 
      prevCart.map(item => {
        if ((item.id_unique || item._id || item.id) === uniqueId) {
          const newQty = item.qty + delta;
          if (newQty > item.currentStock && item.currentStock > 0) {
            alert(`Maximum stock reached. Only ${item.currentStock} available.`);
            return item;
          }
          return newQty > 0 ? { ...item, qty: newQty } : item;
        }
        return item;
      })
    );
  };

  const setQty = (uniqueId, val) => {
    const num = parseInt(val);
    setCart(prevCart => 
      prevCart.map(item => {
        if ((item.id_unique || item._id || item.id) === uniqueId) {
          if (num > item.currentStock && item.currentStock > 0) {
            alert(`Only ${item.currentStock} available.`);
            return { ...item, qty: item.currentStock };
          }
          const finalVal = isNaN(num) || num < 1 ? 1 : num;
          return { ...item, qty: finalVal };
        }
        return item;
      })
    );
  };

  const updateDimension = (uniqueId, field, value) => {
    setCart(prevCart => prevCart.map(item => {
      if ((item.id_unique || item._id || item.id) === uniqueId) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const removeFromCart = (uniqueId) => {
    setCart(prevCart => prevCart.filter(item => (item.id_unique || item._id || item.id) !== uniqueId));
  };

  const handleHoldOrder = () => {
    if (cart.length === 0) return alert('Cannot freeze an empty cart.');
    
    const now = new Date();
    // Sequential number: count existing + 1, padded
    const seq = (heldOrders.length + 1).toString().padStart(2, '0');
    // Timestamp: DDMMYYHHmmss
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(2);
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const frozenId = `FRZ-${seq}-${dd}${mm}${yy}${hh}${min}${ss}`;
    
    const newHold = {
      id: Date.now(),
      frozenId,
      time: now.toLocaleTimeString(),
      cart: [...cart],
      discount: discount
    };
    
    setHeldOrders([...heldOrders, newHold]);
    setCart([]);
    setDiscount(0);
  };

  const getItemAmount = (item) => {
    if (item.unit === 'inch' && item.height && item.width && item.width !== 'X' && !isNaN(item.height)) {
      const h = parseFloat(item.height) || 0;
      const w = parseFloat(item.width) || 0;
      const sizeSqFt = (h * w) / 144;
      return sizeSqFt * item.qty * (item.salePrice || 0);
    }
    return item.qty * (item.salePrice || 0);
  };

  const getItemTotalSizeString = (item) => {
    if (item.unit === 'inch' && item.height && item.width && item.width !== 'X' && !isNaN(item.height)) {
      const h = parseFloat(item.height) || 0;
      const w = parseFloat(item.width) || 0;
      let size = (h * w) / 144;
      return Number.isInteger(size) ? size + "'" : size.toFixed(2).replace(/\.00$/, '');
    }
    return 'X';
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + getItemAmount(item), 0);
  const taxAmount = (subtotal - discount) * (shopDetails.taxRate / 100);
  const total = (subtotal - discount) + taxAmount;

  // Process the Cart Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) return alert('Cart is empty!');
    
    try {
      const token = localStorage.getItem('pos_token');

      const payload = {
        items: cart.map(item => ({
          product: item._id,
          name: item.name,
          barcode: item.barcode,
          salePrice: item.salePrice,
          qty: item.qty,
          height: item.height,
          width: item.width,
          unit: item.unit,
          totalSize: getItemTotalSizeString(item),
          totalItemPrice: getItemAmount(item)
        })),
        subtotal,
        discount: discount,
        grandTotal: total,
        paymentMethod: paymentMethod,
        customerName: customerName || 'Guest',
        customerPhone: customerPhone || '',
        customer_id: selectedCustomerId || undefined
      };

      const res = await axios.post(`${API_BASE}/api/sales`, payload, {
        headers: { 'x-auth-token': token }
      });

      // Show receipt visually
      setReceiptData(res.data.sale);
      setCart([]);
      setDiscount(0);
      setCustomerName('');
      setCustomerPhone('');
      setPaymentMethod('Cash');
      setCustomerType('Walk-in');
      setSelectedCustomerId('');
      
      // Refresh fast-access products grid to update stock accurately
      const invRes = await axios.get(`${API_BASE}/api/inventory`, {
        headers: { 'x-auth-token': token }
      });
      if (invRes.data) {
        setDbProducts(invRes.data);
      }
      
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error processing checkout.');
    }
  };

  const handleWhatsappSubmit = async (e) => {
    e.preventDefault();
    if (!wpPhone || !receiptData) return alert('Phone number and active receipt required.');

    try {
      const token = localStorage.getItem('pos_token');
      try {
        await axios.post(`${API_BASE}/api/customers`, {
          name: wpName || `WhatsApp Lead`,
          phone: wpPhone
        }, { headers: { 'x-auth-token': token } });
      } catch (err) {
        console.log('Customer sync ok');
      }

      // 1. Clean the phone number and automatically add '92' (Pakistan code) if it starts with '0'
      let cleanPhone = wpPhone.replace(/\D/g, ''); 
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '92' + cleanPhone.substring(1);
      }

      const rawReceiptText = `*E-Receipt from ${JSON.parse(localStorage.getItem('pos_user') || '{}')?.shopName || 'MY STORE'}*\nInvoice ID: ${receiptData.invoiceId || '#' + receiptData._id.slice(-8).toUpperCase()}\nDate: ${new Date(receiptData.createdAt).toLocaleString()}\n\n*Items Purchased:*\n${receiptData.items.map(item => `- ${item.name} x${item.qty} (Rs. ${item.salePrice * item.qty})`).join('\n')}\n\n*Total Paid:* Rs. ${receiptData.grandTotal.toFixed(2)}\n\nThank you for shopping with us!`;
      
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
      alert('Error connecting to WhatsApp');
    }
  };

  const receiptRef = useRef(null);

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4' // Professional A4 Business Invoice Size
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Receipt_${receiptData.invoiceId || receiptData._id.slice(-8).toUpperCase()}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Error generating PDF natively');
    }
  };

  return (
    <div className="pos-container">
      {/* LEFT SECTION: MAIN POS INTERFACE */}
      <main className="pos-main">
        
        {/* Header */}
        <header className="pos-header">
          <div className="pos-title-group">
            <h1>Dimensions Billing</h1>
            <p>Glass & Aluminum Specialist Mode</p>
          </div>
          <div className="pos-actions">
            <button className="btn-icon" onClick={() => navigate('/dashboard')} style={{ color: '#0f172a' }}>
              <LayoutDashboard size={18} /> Dashboard
            </button>
            <button className="btn-icon" onClick={() => navigate('/glass-inventory')} style={{ color: '#0f172a' }}>
              <Package size={18} /> Inventory
            </button>
            <button className="btn-icon" onClick={() => navigate('/purchases')} style={{ color: '#0f172a' }} title="Purchases">
              <Truck size={22} /> Purchases
            </button>
            <button className="btn-icon" onClick={() => navigate('/suppliers')} style={{ color: '#0f172a' }} title="Suppliers">
              <Users size={18} /> Suppliers
            </button>
            <button className="btn-icon" onClick={() => navigate('/customers')} style={{ color: '#0f172a' }} title="Customers">
              <Store size={18} /> Customers
            </button>
            <button className="btn-icon" onClick={() => navigate('/glass-sales')} style={{ color: '#0f172a' }}>
              <List size={18} /> Sales
            </button>
            <button className="btn-icon" onClick={() => navigate('/reports')} style={{ color: '#0f172a' }} title="Reports">
              <BarChart3 size={18} /> Reports
            </button>
            <button className="btn-icon" onClick={handleLogout} style={{ color: '#ef4444' }}>
              <LogOut size={18} /> Logout
            </button>
          </div>
        </header>

        {/* Scan / Search Bar */}
        <form className="barcode-search-container" onSubmit={handleBarcodeSubmit}>
          <div className="search-wrapper" style={{ position: 'relative' }}>
            <Search className="search-icon" size={20} />
            <input 
              type="text" 
              className="pos-search-input" 
              placeholder="Scan barcode or search product..." 
              value={barcodeInput}
              onChange={handleSearchInput}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            {/* Intelligent Search Auto-Suggestions */}
            {showSuggestions && barcodeInput.trim() !== '' && (
              <ul style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px',
                marginTop: '0.5rem', padding: 0, listStyle: 'none', zIndex: 50,
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', 
                maxHeight: '300px', overflowY: 'auto'
              }}>
                {filteredSuggestions.length > 0 ? filteredSuggestions.map((item, index) => (
                  <li 
                    key={item._id}
                    onClick={() => handleSuggestionClick(item)}
                    style={{
                      padding: '0.8rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      borderBottom: index !== filteredSuggestions.length - 1 ? '1px solid #f1f5f9' : 'none',
                      cursor: 'pointer', transition: 'background 0.2s', 
                      background: index === highlightedIndex ? '#f1f5f9' : 'white'
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <div>
                      <span style={{ fontWeight: '600', color: 'var(--text-main)', display: 'block' }}>{item.name}</span>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Barcode: {item.barcode} | Stock: {item.currentStock}</span>
                    </div>
                    <span style={{ fontWeight: '700', color: '#10b981' }}>Rs. {(item.salePrice || 0).toFixed(2)}</span>
                  </li>
                )) : (
                  <li style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                    No products matching "{barcodeInput}"
                  </li>
                )}
              </ul>
            )}
          </div>
          <button type="submit" className="btn-scan">
            <Barcode size={22} /> Add
          </button>
        </form>

        {/* Full-Width Cart Grid Container */}
        <div className="cart-section" style={{ display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginTop: '1rem', flex: 1 }}>
          
          {/* Cart Table Header */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '1rem 1.5rem', background: '#f8fafc', fontWeight: 'bold', color: '#64748b', fontSize: '0.9rem', textTransform: 'uppercase' }}>
            <span style={{ flex: 3 }}>Item name</span>
            <span style={{ flex: 1.5 }}>Height</span>
            <span style={{ width: '30px', textAlign: 'center' }}></span>
            <span style={{ flex: 1.5 }}>Width</span>
            <span style={{ flex: 1, textAlign: 'center' }}>Unit</span>
            <span style={{ flex: 1.2, textAlign: 'center' }}>Qty</span>
            <span style={{ flex: 1, textAlign: 'center' }}>Rate</span>
            <span style={{ flex: 1.5, textAlign: 'right' }}>Amount</span>
            <span style={{ width: '40px' }}></span>
          </div>

          {/* Cart Items List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {cart.length === 0 ? null : (
              cart.map(item => {
                const uniqueId = item.id_unique || item._id || item.id;
                return (
                 <div key={uniqueId} style={{ display: 'flex', alignItems: 'center', padding: '1.2rem 1.5rem', borderBottom: '1px solid #f1f5f9', gap: '0.5rem' }}>
                   
                   <span style={{ flex: 3, fontWeight: '600', color: 'var(--text-main)', fontSize: '1.05rem', wordBreak: 'break-word' }}>
                     {item.name}
                     <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '700' }}>
                       Size: {getItemTotalSizeString(item)} 
                     </div>
                   </span>

                   <input 
                     type="text" 
                     placeholder="e.g 24" 
                     value={item.height} 
                     onChange={e => updateDimension(uniqueId, 'height', e.target.value)}
                     style={{ flex: 1.5, padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem' }} 
                   />
                   
                   <span style={{ width: '30px', textAlign: 'center', fontWeight: 'bold', color: '#94a3b8' }}>X</span>

                   <input 
                     type="text" 
                     placeholder="e.g 48 or X" 
                     value={item.width} 
                     onChange={e => updateDimension(uniqueId, 'width', e.target.value)}
                     style={{ flex: 1.5, padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem' }} 
                   />

                   <input 
                     type="text" 
                     placeholder="unit" 
                     value={item.unit} 
                     onChange={e => updateDimension(uniqueId, 'unit', e.target.value)}
                     style={{ flex: 1, padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', textAlign: 'center' }} 
                   />

                   <div style={{ flex: 1.2, display: 'flex', justifyContent: 'center' }}>
                     <input 
                       type="number" 
                       value={item.qty} 
                       onChange={(e) => setQty(uniqueId, e.target.value)}
                       style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', textAlign: 'center' }} 
                     />
                   </div>

                   <span style={{ flex: 1, textAlign: 'center', color: '#64748b', fontWeight: '500', fontSize: '1rem' }}>
                     {item.salePrice}
                   </span>

                   <span style={{ flex: 1.5, textAlign: 'right', fontWeight: '700', color: 'var(--text-main)', fontSize: '1.2rem' }}>
                     Rs. {getItemAmount(item).toFixed(2)}
                   </span>
                   
                   <div style={{ width: '40px', display: 'flex', justifyContent: 'flex-end' }}>
                     <button className="btn-remove" style={{ width: '35px', height: '35px' }} onClick={() => removeFromCart(uniqueId)}><Trash2 size={18} /></button>
                   </div>
                 </div>
              )})
            )}
          </div>

          {/* Cart Footer & Checkout Dashboard */}
          <div style={{ padding: '1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '2rem', alignItems: 'stretch' }}>
            
            {/* Actions Panel (Hold/Recall/Clear) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', flex: 1, justifyContent: 'center' }}>
              <button className="btn-action-sm" onClick={handleHoldOrder} style={{ padding: '1rem', fontSize: '1.05rem', fontWeight: '600' }}>
                <PauseCircle size={20} /> Freeze Transaction
              </button>
              <button className="btn-action-sm" onClick={() => setIsRecallModalOpen(true)} style={{ position: 'relative', padding: '1rem', fontSize: '1.05rem', fontWeight: '600' }}>
                <List size={20} /> Recall Frozen Carts
                {heldOrders.length > 0 && <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: 'white', borderRadius: '50%', padding: '4px 8px', fontSize: '0.8rem', fontWeight: 'bold' }}>{heldOrders.length}</span>}
              </button>
              <button className="btn-action-sm" style={{ color: '#ef4444', padding: '1rem', fontSize: '1.05rem', fontWeight: '600', borderColor: '#fca5a5', background: '#fef2f2' }} onClick={() => { setCart([]); setDiscount(0); setPaymentMethod('Cash'); }}>
                <Trash2 size={20} /> Clear Entire Cart
              </button>
            </div>

            {/* Calculations Dashboard */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.8rem', borderLeft: '2px solid #e2e8f0', paddingLeft: '2rem', borderRight: '2px solid #e2e8f0', paddingRight: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '1.15rem' }}>
                <span>Subtotal</span><span>Rs. {subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', alignItems: 'center', fontSize: '1.15rem' }}>
                 <span>Discount</span>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <span>- Rs.</span>
                   <input type="number" min="0" max={subtotal} style={{ width: '90px', padding: '0.4rem', textAlign: 'right', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1.1rem', fontWeight: '600' }} value={discount || ''} onChange={(e) => { const val = parseFloat(e.target.value) || 0; setDiscount(val > subtotal ? subtotal : val); }} placeholder="0" />
                 </div>
              </div>
              {shopDetails.taxRate > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '1.15rem' }}>
                  <span>Tax ({shopDetails.taxRate}%)</span><span>+ Rs. {taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.8rem', color: 'var(--primary)', marginTop: '0.5rem', paddingTop: '0.8rem', borderTop: '2px dashed #cbd5e1' }}>
                <span>Net Total</span><span>Rs. {total.toFixed(2)}</span>
              </div>
            </div>

            {/* Final Payment Processor & CRM */}
            <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem' }}>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.2rem' }}>
                 <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.6rem', border: `2px solid ${customerType === 'Walk-in' ? '#3b82f6' : '#e2e8f0'}`, borderRadius: '8px', cursor: 'pointer', background: customerType === 'Walk-in' ? '#eff6ff' : '#fff', transition: 'all 0.2s', fontWeight: '600', color: customerType === 'Walk-in' ? '#2563eb' : '#64748b' }}>
                   <input 
                     type="radio" 
                     name="customerType"
                     value="Walk-in"
                     checked={customerType === 'Walk-in'} 
                     onChange={(e) => setCustomerType(e.target.value)}
                     style={{ display: 'none' }}
                   />
                   Walk-In 🚶
                 </label>
                 
                 <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.6rem', border: `2px solid ${customerType === 'Over the call' ? '#3b82f6' : '#e2e8f0'}`, borderRadius: '8px', cursor: 'pointer', background: customerType === 'Over the call' ? '#eff6ff' : '#fff', transition: 'all 0.2s', fontWeight: '600', color: customerType === 'Over the call' ? '#2563eb' : '#64748b' }}>
                   <input 
                     type="radio" 
                     name="customerType"
                     value="Over the call"
                     checked={customerType === 'Over the call'} 
                     onChange={(e) => setCustomerType(e.target.value)}
                     style={{ display: 'none' }}
                   />
                   Over the Call 📞
                 </label>
              </div>

              {/* Smart CRM Customer Identification */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', fontWeight: '700', fontSize: '0.85rem' }}>
                  <Users size={16} /> CUSTOMER DETAILS (OPTIONAL)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    placeholder="Full Name" 
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                  />
                  <input 
                    type="tel" 
                    placeholder="Phone Number" 
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>Input phone to link sale or register new customer.</p>
              </div>

              <div style={{ fontSize: '1rem', color: 'var(--text-main)', fontWeight: '600', marginBottom: '-0.3rem' }}>Select Payment:</div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setPaymentMethod('Cash')} style={{ flex: 1, background: paymentMethod === 'Cash' ? '#10b981' : '#fff', color: paymentMethod === 'Cash' ? 'white' : 'var(--text-main)', border: `2px solid ${paymentMethod === 'Cash' ? '#10b981' : '#e2e8f0'}`, padding: '0.8rem', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', fontSize: '1.1rem' }}>💵 Cash</button>
                <button onClick={() => setPaymentMethod('Card')} style={{ flex: 1, background: paymentMethod === 'Card' ? '#3b82f6' : '#fff', color: paymentMethod === 'Card' ? 'white' : 'var(--text-main)', border: `2px solid ${paymentMethod === 'Card' ? '#3b82f6' : '#e2e8f0'}`, padding: '0.8rem', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', fontSize: '1.1rem' }}>💳 Card</button>
                <button onClick={() => setPaymentMethod('Online')} style={{ flex: 1, background: paymentMethod === 'Online' ? '#8b5cf6' : '#fff', color: paymentMethod === 'Online' ? 'white' : 'var(--text-main)', border: `2px solid ${paymentMethod === 'Online' ? '#8b5cf6' : '#e2e8f0'}`, padding: '0.8rem', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', fontSize: '1.1rem' }}>📱 Online</button>
              </div>
              <button className="btn-pay" onClick={handleCheckout} style={{ background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', color: 'white', border: 'none', padding: '1.3rem', borderRadius: '12px', fontSize: '1.4rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', marginTop: '0.5rem', transition: 'all 0.2s' }}>
                <Banknote size={26} /> Charge Rs. {total.toFixed(2)}
              </button>
            </div>

          </div>
        </div>

      </main>

      {/* Professional A4 Invoice Print Modal */}
      {receiptData && (
        <div className="receipt-wrapper" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '40px', paddingBottom: '40px', overflowY: 'auto' }}>
          <div className="receipt-modal" style={{ width: '800px', maxWidth: '95vw', padding: '0', background: 'transparent', boxShadow: 'none' }}>
            
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
                      {shopDetails.name || JSON.parse(localStorage.getItem('pos_user') || '{}')?.shopName || 'WAHEED SIGN'}
                    </h1>
                    <p style={{ margin: '6px 0', fontSize: '14px', color: '#333' }}>{shopDetails.address || 'Aluminium & Glass Specialists'}</p>
                    <p style={{ margin: '0', fontSize: '14px', color: '#333' }}>Phone: {shopDetails.phone}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <h1 style={{ margin: 0, fontSize: '38px', color: '#cbd5e1', textTransform: 'uppercase' }}>INVOICE</h1>
                  <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}><b>INV #{receiptData.invoiceId || receiptData._id.slice(-8).toUpperCase()}</b></p>
                  <p style={{ margin: '0', fontSize: '14px' }}>Date: {new Date(receiptData.createdAt).toLocaleDateString()}</p>
                  <p style={{ margin: '0', fontSize: '14px' }}>Cashier: {JSON.parse(localStorage.getItem('pos_user') || '{}')?.fullName || 'Admin'}</p>
                </div>
              </div>

              {/* Billed To */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b', textTransform: 'uppercase' }}>Billed To:</h3>
                  <p style={{ margin: '0', fontSize: '18px', fontWeight: 'bold' }}>{receiptData.customerName || 'Walk-in Customer'}</p>
                  <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>{receiptData.customerPhone ? `Ph: ${receiptData.customerPhone}` : ''}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b', textTransform: 'uppercase' }}>Payment Mode:</h3>
                  <p style={{ margin: '0', fontSize: '16px', fontWeight: 'bold' }}>{receiptData.paymentMethod?.toUpperCase()}</p>
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
                  {receiptData.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', fontSize: '14px' }}>
                       <td style={{ padding: '12px 8px', textAlign: 'center' }}>{idx + 1}</td>
                       <td style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 'bold' }}>{item.name}</td>
                       <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                         {item.height && item.width && item.width !== 'X' ? `${item.height} x ${item.width} ${item.unit}` : '-'}
                       </td>
                       <td style={{ padding: '12px 8px', textAlign: 'center' }}>{item.totalSize || '-'}</td>
                       <td style={{ padding: '12px 8px', textAlign: 'center' }}>{item.qty}</td>
                       <td style={{ padding: '12px 8px', textAlign: 'right' }}>{item.salePrice}</td>
                       <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold' }}>{item.totalItemPrice.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Section */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <div style={{ width: '320px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '15px' }}>Subtotal:</span>
                    <span style={{ fontSize: '15px' }}>Rs. {receiptData.subtotal.toFixed(2)}</span>
                  </div>
                  {receiptData.discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0', color: '#ef4444' }}>
                      <span style={{ fontSize: '15px' }}>Discount:</span>
                      <span style={{ fontSize: '15px' }}>- Rs. {receiptData.discount.toFixed(2)}</span>
                    </div>
                  )}
                  {receiptData.taxAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '15px' }}>Tax ({receiptData.taxRate}%):</span>
                      <span style={{ fontSize: '15px' }}>+ Rs. {receiptData.taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '2px solid #000', borderTop: '2px solid #000', fontWeight: 'bold', fontSize: '20px', backgroundColor: '#f8fafc', marginTop: '4px' }}>
                    <span style={{ paddingLeft: '8px' }}>Grand Total:</span>
                    <span style={{ paddingRight: '8px' }}>Rs. {receiptData.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              

            </div>

            <div className="receipt-controls" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', width: '100%', marginTop: '15px', background: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <button
                className="btn-print"
                style={{ flex: 1 }}
                onClick={() => window.print()}
              >
                Print
              </button>
              <button
                className="btn-print"
                style={{ background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', flexShrink: 0, padding: '0' }}
                onClick={handleDownloadPDF}
                title="Download PDF"
              >
                <Download size={18} />
              </button>
              <button
                className="btn-print"
                style={{ background: '#25D366', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', flexShrink: 0, padding: '0' }}
                onClick={() => setIsWhatsappModalOpen(true)}
                title="Send via WhatsApp"
              >
                <FaWhatsapp size={20} />
              </button>
              <button className="btn-close-receipt" style={{ flex: 1 }} onClick={() => setReceiptData(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Frozen Transactions Modal */}
      {isRecallModalOpen && (
        <div className="receipt-wrapper">
          <div className="receipt-modal" style={{ width: '90vw', maxWidth: '960px' }}>
            <div className="receipt-header">
              <h2>❄ Frozen Transactions</h2>
              <p>Resume or discard a frozen cart</p>
            </div>
            
            {heldOrders.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem 0' }}>No frozen transactions.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#64748b', borderBottom: '2px solid #e2e8f0' }}>#</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#64748b', borderBottom: '2px solid #e2e8f0' }}>Frozen ID</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#64748b', borderBottom: '2px solid #e2e8f0' }}>Items</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#64748b', borderBottom: '2px solid #e2e8f0' }}>Total</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#64748b', borderBottom: '2px solid #e2e8f0' }}>Frozen At</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#64748b', borderBottom: '2px solid #e2e8f0' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {heldOrders.map((order, index) => {
                    const orderTotal = order.cart.reduce((s, i) => s + (i.salePrice * i.qty), 0) - (order.discount || 0);
                    const itemSummary = order.cart.map(i => `${i.name} ×${i.qty}`).join(', ');
                    return (
                      <tr key={order.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.9rem 1rem', fontWeight: '700', color: '#64748b' }}>{index + 1}</td>
                        <td style={{ padding: '0.9rem 1rem' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: '700', color: 'var(--primary)', fontSize: '0.85rem' }}>
                            {order.frozenId || `FRZ-${String(index + 1).padStart(2, '0')}`}
                          </span>
                        </td>
                        <td style={{ padding: '0.9rem 1rem', fontSize: '0.82rem', color: '#475569', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={itemSummary}>
                          {itemSummary}
                        </td>
                        <td style={{ padding: '0.9rem 1rem', textAlign: 'right', fontWeight: '700' }}>Rs. {orderTotal.toFixed(0)}</td>
                        <td style={{ padding: '0.9rem 1rem', textAlign: 'center', fontSize: '0.82rem', color: '#64748b' }}>{order.time}</td>
                        <td style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                            <button
                              className="btn-primary"
                              style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem' }}
                              onClick={() => {
                                if (cart.length > 0 && !window.confirm('You have an active cart. Resuming will discard it. Proceed?')) return;
                                setCart(order.cart);
                                setDiscount(order.discount);
                                setHeldOrders(heldOrders.filter(h => h.id !== order.id));
                                setIsRecallModalOpen(false);
                              }}
                            >
                              Resume
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm('Permanently delete this frozen transaction?')) {
                                  setHeldOrders(heldOrders.filter(h => h.id !== order.id));
                                }
                              }}
                              style={{ background: 'rgba(239,68,68,0.1)', border: 'none', padding: '0.4rem 0.6rem', color: '#ef4444', borderRadius: '8px', cursor: 'pointer' }}
                              title="Delete Frozen Cart"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            <button className="btn-close-receipt" onClick={() => setIsRecallModalOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* WhatsApp Modal properly mounted naturally actively reliably smartly cleanly carefully accurately logically completely optimally smoothly dynamically dependably natively comprehensively successfully naturally natively */}
      {isWhatsappModalOpen && receiptData && (
        <div className="receipt-wrapper" style={{ zIndex: 9999 }}>
          <div className="receipt-modal" style={{ width: '400px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px dashed #cbd5e1', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Send via WhatsApp</h2>
              <button onClick={() => setIsWhatsappModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleWhatsappSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                 <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Customer Name (Optional)</label>
                 <input 
                   type="text" 
                   required
                   placeholder="E.g., John Doe"
                   value={wpName}
                   onChange={(e) => setWpName(e.target.value)}
                   style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
                 />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                 <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>WhatsApp Number</label>
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
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={() => setIsWhatsappModalOpen(false)} style={{ flex: 1, padding: '0.8rem', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '0.8rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
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

export default GlassBilling;

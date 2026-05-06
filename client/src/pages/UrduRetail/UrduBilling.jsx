import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import API_BASE from '../../config';
import { 
  Search, Trash2, Plus, Minus, 
  CreditCard, Banknote, Printer, PauseCircle, 
  ShoppingCart, LogOut, PackageSearch, Package, LayoutDashboard, List, Truck, Barcode, Users, Store, BarChart3, X, Download, Gift, MessageCircle, Settings, DollarSign, UserCheck
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import '../Billing.css'; // Reuse core styles

const UrduBilling = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dbProducts, setDbProducts] = useState([]);
  const [dbDeals, setDbDeals] = useState([]);
  const [receiptData, setReceiptData] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [crmCustomers, setCrmCustomers] = useState([]);
  const [customerType, setCustomerType] = useState('Walk-in');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [printMode, setPrintMode] = useState('receipt');

  const activeUser = JSON.parse(localStorage.getItem('pos_user') || '{}');

  // Customer Autocomplete States
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [customerHighlightedIndex, setCustomerHighlightedIndex] = useState(-1);

  // WhatsApp States
  const [isWhatsappModalOpen, setIsWhatsappModalOpen] = useState(false);
  const [wpName, setWpName] = useState('');
  const [wpPhone, setWpPhone] = useState('');
  const [shopDetails, setShopDetails] = useState({ name: '', address: '', phone: '', taxRate: 0 });

  // ── Deal State ──
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [dealName, setDealName] = useState('');
  const [dealPrice, setDealPrice] = useState('');
  const [dealItems, setDealItems] = useState([]); 
  const [dealSearch, setDealSearch] = useState('');
  const [dealSearchHighlightedIndex, setDealSearchHighlightedIndex] = useState(-1);

  const fetchDeals = async () => {
    try {
      const token = localStorage.getItem('pos_token');
      const dealsRes = await axios.get(`${API_BASE}/api/deals`, {
        headers: { 'x-auth-token': token }
      });
      if (dealsRes.data) setDbDeals(dealsRes.data);
    } catch (err) { console.error('Failed to fetch deals', err); }
  };
  
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
        if (res.data) setDbProducts(res.data);
        fetchDeals();
        const crmRes = await axios.get(`${API_BASE}/api/customers`, {
          headers: { 'x-auth-token': token }
        });
        if (crmRes.data) setCrmCustomers(crmRes.data);
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

  // ── Deal Handlers ──
  const openCreateDeal = () => {
    setDealName('');
    setDealPrice('');
    setDealItems([]);
    setDealSearch('');
    setIsDealModalOpen(true);
  };

  const addProductToDeal = (product) => {
    const exists = dealItems.find(i => i.product === product._id);
    if (exists) {
      setDealItems(dealItems.map(i => i.product === product._id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setDealItems([...dealItems, { product: product._id, productName: product.name, qty: 1 }]);
    }
    setDealSearch('');
  };

  const removeDealItem = (productId) => setDealItems(dealItems.filter(i => i.product !== productId));

  const updateDealItemQty = (productId, delta) => {
    setDealItems(dealItems.map(i => {
      if (i.product !== productId) return i;
      const newQty = i.qty + delta;
      return newQty > 0 ? { ...i, qty: newQty } : i;
    }));
  };

  const handleSaveDeal = async () => {
    if (!dealName.trim()) return alert('ڈیل کا نام ضروری ہے۔');
    if (dealItems.length === 0) return alert('ڈیل میں کم از کم ایک پروڈکٹ شامل کریں۔');
    if (!dealPrice || isNaN(dealPrice) || Number(dealPrice) < 0) return alert('درست قیمت درج کریں۔');
    try {
      const token = localStorage.getItem('pos_token');
      const payload = { name: dealName.trim(), items: dealItems, dealPrice: Number(dealPrice) };
      await axios.post(`${API_BASE}/api/deals`, payload, { headers: { 'x-auth-token': token } });
      fetchDeals();
      setIsDealModalOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || 'ڈیل محفوظ کرنے میں غلطی ہوئی۔');
    }
  };

  const handleDealSearchKeyDown = (e, filtered) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setDealSearchHighlightedIndex(prev => prev < filtered.length - 1 ? prev + 1 : prev);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setDealSearchHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (dealSearchHighlightedIndex >= 0 && dealSearchHighlightedIndex < filtered.length) {
        addProductToDeal(filtered[dealSearchHighlightedIndex]);
        setDealSearchHighlightedIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setDealSearch('');
      setDealSearchHighlightedIndex(-1);
    }
  };

  const handleSearchInput = (e) => {
    const value = e.target.value;
    setBarcodeInput(value);
    
    if (value.trim()) {
      const matchedProducts = dbProducts.filter(p =>
        p.barcode.toLowerCase().includes(value.toLowerCase()) ||
        p.name.toLowerCase().includes(value.toLowerCase())
      );
      const matchedDeals = dbDeals.filter(d =>
        d.name.toLowerCase().includes(value.toLowerCase())
      ).map(d => ({ ...d, isDeal: true }));
      setFilteredSuggestions([...matchedProducts, ...matchedDeals]);
      setShowSuggestions(true);
      setHighlightedIndex(-1);
    } else {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  const handleSuggestionClick = (item) => {
    if (item.isDeal) addDealToCart(item);
    else addToCart(item);
    setBarcodeInput('');
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    const product = dbProducts.find(p => p.barcode === barcodeInput || p.name.toLowerCase() === barcodeInput.toLowerCase());
    if (product) {
      addToCart(product);
      setBarcodeInput('');
      setShowSuggestions(false);
    } else {
      alert(`بار کوڈ ${barcodeInput} والی پروڈکٹ نہیں ملی!`);
    }
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => prev < filteredSuggestions.length - 1 ? prev + 1 : prev);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
        e.preventDefault();
        handleSuggestionClick(filteredSuggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  const addDealToCart = (deal) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item._id === deal._id && item.type === 'deal');
      if (existing) {
        return prevCart.map(item =>
          item._id === deal._id && item.type === 'deal' ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prevCart, {
        _id: deal._id,
        type: 'deal',
        name: deal.name,
        salePrice: deal.dealPrice,
        qty: 1,
        totalItemPrice: deal.dealPrice,
        dealComponents: deal.items,
        currentStock: 9999,
        barcode: ''
      }];
    });
  };

  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item._id === product._id);
      if (existingItem) {
        if (existingItem.qty >= product.currentStock) {
          alert(`وارننگ: ${product.name} کے صرف ${product.currentStock} یونٹس اسٹاک میں دستیاب ہیں۔`);
          return prevCart;
        }
        return prevCart.map(item => item._id === product._id ? { ...item, qty: item.qty + 1 } : item);
      }
      if (product.currentStock <= 0) {
        alert(`${product.name} فی حال اسٹاک میں نہیں ہے۔`);
        return prevCart;
      }
      return [...prevCart, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prevCart => 
      prevCart.map(item => {
        const itemId = item._id || item.id;
        if (itemId === id) {
          const newQty = item.qty + delta;
          if (newQty > item.currentStock) {
            alert(`${item.name} کا زیادہ سے زیادہ اسٹاک پہنچ گیا۔ صرف ${item.currentStock} دستیاب ہے۔`);
            return item;
          }
          return newQty > 0 ? { ...item, qty: newQty } : item;
        }
        return item;
      })
    );
  };

  const setQty = (id, val) => {
    const num = parseInt(val);
    setCart(prevCart => 
      prevCart.map(item => {
        const itemId = item._id || item.id;
        if (itemId === id) {
          if (num > item.currentStock) {
            alert(`${item.name} کے صرف ${item.currentStock} یونٹس دستیاب ہیں۔`);
            return { ...item, qty: item.currentStock };
          }
          const finalVal = isNaN(num) || num < 1 ? 1 : num;
          return { ...item, qty: finalVal };
        }
        return item;
      })
    );
  };

  const removeFromCart = (id) => {
    setCart(prevCart => prevCart.filter(item => (item._id || item.id) !== id));
  };

  const handleHoldOrder = () => {
    if (cart.length === 0) return alert('خالی کارٹ منجمد نہیں کیا جا سکتا۔');
    const now = new Date();
    const seq = (heldOrders.length + 1).toString().padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(2);
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const frozenId = `FRZ-${seq}-${dd}${mm}${yy}${hh}${min}${ss}`;
    const newHold = { id: Date.now(), frozenId, time: now.toLocaleTimeString(), cart: [...cart], discount };
    setHeldOrders([...heldOrders, newHold]);
    setCart([]);
    setDiscount(0);
  };

  const subtotal = cart.reduce((sum, item) => sum + ((item.salePrice || 0) * item.qty), 0);
  const taxAmount = (subtotal - discount) * (shopDetails.taxRate / 100);
  const total = (subtotal - discount) + taxAmount;

  const handleCheckout = async () => {
    if (cart.length === 0) return alert('کارٹ خالی ہے!');
    const dueAmount = total - receivedAmount;
    if (dueAmount > 0 && !selectedCustomerId && !customerPhone) {
      return alert('ادھار سیل کے لیے کسٹمر کا انتخاب یا تفصیل ضروری ہے۔');
    }
    try {
      const token = localStorage.getItem('pos_token');
      const finalPaymentMethod = dueAmount > 0 ? (receivedAmount > 0 ? 'Split' : 'Credit') : paymentMethod;
      const payload = {
        items: cart, subtotal, discount, grandTotal: total,
        amountPaid: receivedAmount, dueAmount,
        paymentMethod: finalPaymentMethod,
        customerName: customerName || 'Guest',
        customerPhone: customerPhone || '',
        customer_id: selectedCustomerId || undefined
      };
      const res = await axios.post(`${API_BASE}/api/sales`, payload, { headers: { 'x-auth-token': token } });
      setReceiptData(res.data.sale);
      setCart([]);
      setDiscount(0);
      setReceivedAmount(0);
      setCustomerName('');
      setCustomerPhone('');
      setPaymentMethod('Cash');
      setCustomerType('Walk-in');
      setSelectedCustomerId('');
      const invRes = await axios.get(`${API_BASE}/api/inventory`, { headers: { 'x-auth-token': token } });
      if (invRes.data) setDbProducts(invRes.data);
    } catch (err) {
      alert(err.response?.data?.message || 'چیک آؤٹ کے دوران غلطی ہوئی۔');
    }
  };

  const handleWhatsappSubmit = async (e) => {
    e.preventDefault();
    if (!wpPhone || !receiptData) return alert('فون نمبر اور فعال رسید ضروری ہے۔');
    try {
      const token = localStorage.getItem('pos_token');
      try {
        await axios.post(`${API_BASE}/api/customers`, { name: wpName || `WhatsApp Lead`, phone: wpPhone }, { headers: { 'x-auth-token': token } });
      } catch (err) {}
      let cleanPhone = wpPhone.replace(/\D/g, ''); 
      if (cleanPhone.startsWith('0')) cleanPhone = '92' + cleanPhone.substring(1);
      const rawReceiptText = `*E-Receipt from ${JSON.parse(localStorage.getItem('pos_user') || '{}')?.shopName || 'MY STORE'}*\nInvoice ID: ${receiptData.invoiceId || '#' + receiptData._id.slice(-8).toUpperCase()}\nDate: ${new Date(receiptData.createdAt).toLocaleString()}\n\n*Items Purchased:*\n${receiptData.items.map(item => `- ${item.name} x${item.qty} (Rs. ${item.salePrice * item.qty})`).join('\n')}\n\n*Total Paid:* Rs. ${receiptData.grandTotal.toFixed(2)}\n\nThank you for shopping with us!`;
      const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(rawReceiptText)}`;
      const link = document.createElement('a');
      link.href = url; link.target = 'WhatsAppReceiptTab'; 
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      setIsWhatsappModalOpen(false);
    } catch (err) {
      alert('واٹس ایپ سے منسلک ہونے میں غلطی ہوئی۔');
    }
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
      pdf.save(`Receipt_${receiptData.invoiceId || receiptData._id.slice(-8).toUpperCase()}.pdf`);
    } catch (err) {
      alert('پی ڈی ایف بنانے میں غلطی ہوئی۔');
    }
  };

  const printReceipt = (sale) => {
    const activeUser = JSON.parse(localStorage.getItem('pos_user') || '{}');
    const shopN = shopDetails.name || activeUser.shopName || 'MY STORE';
    const shopAddr = shopDetails.address || '';
    const shopPhone = shopDetails.phone || '';
    const logoUrl = `${API_BASE}/logo/${activeUser.shopId}.png`;
    const cashier = activeUser.fullName || 'ایڈمن';

    const itemRows = sale.items.map(item => `<div class="item-row"><span class="item-name">${item.name}</span><span class="item-qty">${item.qty}</span><span class="item-total">Rs. ${(item.totalItemPrice ?? (item.salePrice * item.qty)).toFixed(0)}</span></div>`).join('');
    
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Receipt</title><style>* { box-sizing: border-box; margin: 0; padding: 0; } body { font-family: Arial, sans-serif; font-size: 12px; color: #000; width: 72mm; padding: 4mm; direction: rtl; } .center { text-align: center; } .logo { width: 90px; object-fit: contain; margin-bottom: 4px; } h2 { font-size: 16px; font-weight: 900; margin-bottom: 2px; } .sub { font-size: 10px; margin-bottom: 4px; } .dash { border-top: 1.5px dashed #000; margin: 5px 0; } .info { font-size: 11px; line-height: 1.9; text-align: right; } .col-header { display: flex; font-weight: 800; font-size: 11px; border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 4px; } .item-row { display: flex; font-size: 11px; margin-bottom: 3px; } .item-name { flex: 2; text-align: right; } .item-qty { flex: 1; text-align: center; } .item-total { flex: 1; text-align: left; } .sum-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; } .grand-row { display: flex; justify-content: space-between; font-size: 15px; font-weight: 900; border-top: 2px solid #000; margin-top: 5px; padding-top: 5px; } .balance-row { display: flex; justify-content: space-between; font-size: 12px; font-weight: 800; margin-top: 3px; border-top: 1px solid #000; padding-top: 3px; } .footer { text-align: center; margin-top: 8px; font-size: 9px; color: #555; border-top: 1px dashed #000; padding-top: 6px; } </style></head><body><div class="center"><img class="logo" src="${logoUrl}" crossorigin="anonymous" onerror="this.style.display='none'" /><h2>${shopN}</h2>${shopAddr || shopPhone ? `<p class="sub">${[shopAddr, shopPhone].filter(Boolean).join(' | ')}</p>` : ''}</div><div class="dash"></div><div class="info"><p><b>تاریخ:</b> ${new Date(sale.createdAt).toLocaleString('ur-PK')}</p><p><b>کیشیئر:</b> ${cashier}</p><p><b>ادائیگی:</b> ${(sale.paymentMethod || '').toUpperCase()}</p><p><b>رسید نمبر:</b> ${sale.invoiceId || sale._id.slice(-8).toUpperCase()}</p></div><div class="dash"></div><div class="col-header"><span style="flex:2">آئٹم</span><span style="flex:1;text-align:center">تعداد</span><span style="flex:1;text-align:left">ٹوٹل</span></div>${itemRows}<div class="dash"></div>${sale.discount > 0 ? `<div class="sum-row"><span>رعایت</span><span>- Rs. ${sale.discount.toFixed(2)}</span></div>` : ''}${sale.taxAmount > 0 ? `<div class="sum-row"><span>ٹیکس (${sale.taxRate}%)</span><span>+ Rs. ${sale.taxAmount.toFixed(2)}</span></div>` : ''}<div class="grand-row"><span>حتمی رقم</span><span>Rs. ${sale.grandTotal.toFixed(0)}</span></div>${sale.dueAmount > 0 ? `<div class="sum-row" style="margin-top:6px"><span>وصول شدہ رقم</span><span>Rs. ${(sale.amountPaid || 0).toFixed(2)}</span></div><div class="balance-row"><span>بقایا رقم</span><span>Rs. ${sale.dueAmount.toFixed(2)}</span></div>` : ''}<div class="footer"><p style="font-weight:700">Developed By Tycoon Technologies Pvt. Ltd. Islamabad.</p><p>03060626699 | www.tycoon.technology</p></div><script>window.onload = function() { var hPx = document.body.scrollHeight; var hMm = Math.ceil(hPx * 25.4 / 96) + 4; var s = document.createElement('style'); s.textContent = '@page { size: 80mm ' + hMm + 'mm; margin: 0; }'; document.head.appendChild(s); window.print(); window.close(); };</script></body></html>`;
    const w = window.open('', '_blank', 'width=400,height=600');
    w.document.write(html); w.document.close();
  };

  const printGatepass = (sale) => {
    const activeUser = JSON.parse(localStorage.getItem('pos_user') || '{}');
    const shopN = shopDetails.name || activeUser.shopName || 'MY STORE';
    const itemRows = sale.items.map(item => `<div class="item-row"><span class="item-name">${item.name}</span><span class="item-qty">${item.qty}</span></div>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Gate Pass</title><style>* { box-sizing: border-box; margin: 0; padding: 0; } body { font-family: Arial, sans-serif; font-size: 12px; color: #000; width: 72mm; padding: 4mm; direction: rtl; } .center { text-align: center; } h2 { font-size: 16px; font-weight: 900; margin-bottom: 2px; } .sub { font-size: 10px; margin-bottom: 4px; } .dash { border-top: 1.5px dashed #000; margin: 5px 0; } .gp-title { font-size: 11px; font-weight: 800; text-align: center; margin: 3px 0; } .info { font-size: 11px; line-height: 1.9; text-align: right; } .item-row { display: flex; font-size: 11px; margin-bottom: 3px; } .item-name { flex: 3; text-align: right; } .item-qty { flex: 1; text-align: center; font-weight: 700; } .sig-line { margin-top: 16px; border-top: 1px solid #000; padding-top: 4px; font-size: 10px; text-align: center; } .footer { text-align: center; margin-top: 8px; font-size: 9px; border-top: 1px dashed #000; padding-top: 6px; } </style></head><body><div class="center"><h2>${shopN}</h2></div><div class="dash"></div><p class="gp-title">گیٹ پاس / ڈیلیوری نوٹ</p><div class="dash"></div><div class="info"><p><b>بل نمبر:</b> ${sale.invoiceId || sale._id.slice(-8).toUpperCase()}</p><p><b>تاریخ:</b> ${new Date(sale.createdAt).toLocaleString('ur-PK')}</p><p><b>کسٹمر:</b> ${sale.customerName || 'Guest'}</p></div><div class="dash"></div>${itemRows}<div class="dash"></div><p class="sig-line">مہر / دستخط: ___________________</p><div class="footer"><p style="font-weight:700">Developed By Tycoon Technologies Pvt. Ltd. Islamabad.</p><p>03060626699 | www.tycoon.technology</p></div><script>window.onload = function() { var hPx = document.body.scrollHeight; var hMm = Math.ceil(hPx * 25.4 / 96) + 4; var s = document.createElement('style'); s.textContent = '@page { size: 80mm ' + hMm + 'mm; margin: 0; }'; document.head.appendChild(s); window.print(); window.close(); };</script></body></html>`;
    const w = window.open('', '_blank', 'width=400,height=600');
    w.document.write(html); w.document.close();
  };

  return (
    <div className="inventory-container urdu-rtl" style={{ direction: 'rtl', fontFamily: 'Noto Nastaliq Urdu, sans-serif' }}>
      {/* Universal Main Sidebar Navigation */}
      <nav className="sidebar-min">
        <div className="nav-item active" title="POS / Billing">
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
        <div className="nav-item" onClick={() => navigate('/urdu-sales')} title="Sales History">
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

      <main className="pos-main" style={{ flex: 1, padding: '1.5rem', background: '#f8fafc', overflowY: 'auto' }}>
        <header className="pos-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="pos-title-group">
            <h1 style={{ fontSize: '1.8rem', fontWeight: '800' }}>نئی سیل (Billing)</h1>
            <p style={{ color: '#64748b' }}>کیشیئر: {activeUser.fullName || 'ایڈمن'} | دکان: {shopDetails.name || 'Retail Store'}</p>
          </div>
          <div className="pos-actions" style={{ display: 'flex', gap: '0.8rem' }}>
            <button className="btn-icon" onClick={openCreateDeal} style={{ background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', padding: '0.6rem 1.2rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
              <Gift size={18} /> ڈیل شامل کریں
            </button>
            <button className="btn-icon" onClick={handleLogout} style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '0.6rem 1.2rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
              <LogOut size={18} /> لاگ آؤٹ
            </button>
          </div>
        </header>

        <form className="barcode-search-container" onSubmit={handleBarcodeSubmit}>
          <div className="search-wrapper" style={{ position: 'relative' }}>
            <Search className="search-icon" size={20} style={{ left: 'auto', right: '1rem' }} />
            <input 
              type="text" 
              className="pos-search-input" 
              placeholder="بار کوڈ اسکین کریں یا آئٹم تلاش کریں..." 
              value={barcodeInput}
              onChange={handleSearchInput}
              onKeyDown={handleKeyDown}
              style={{ paddingRight: '3rem', paddingLeft: '1rem', textAlign: 'right' }}
              autoFocus
            />
            {showSuggestions && barcodeInput.trim() !== '' && (
              <ul className="suggestions-list" style={{ right: 0, left: 0, textAlign: 'right' }}>
                {filteredSuggestions.length > 0 ? filteredSuggestions.map((item, index) => (
                  <li key={item._id} onClick={() => handleSuggestionClick(item)} style={{ background: index === highlightedIndex ? '#f1f5f9' : 'white', direction: 'rtl', display: 'flex', justifyContent: 'space-between', padding: '0.8rem 1rem' }} onMouseEnter={() => setHighlightedIndex(index)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      {item.isDeal && <Gift size={16} style={{ color: '#7c3aed' }} />}
                      <span>{item.name} {item.isDeal && '(ڈیل)'}</span>
                    </div>
                    <span style={{ fontWeight: 'bold', color: item.isDeal ? '#7c3aed' : '#10b981' }}>Rs. {(item.isDeal ? item.dealPrice : item.salePrice).toFixed(2)}</span>
                  </li>
                )) : <li style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>کوئی آئٹم نہیں ملا</li>}
              </ul>
            )}
          </div>
          <button type="submit" className="btn-scan" style={{ marginRight: '1rem', marginLeft: 0 }}>
            <Barcode size={22} /> شامل کریں
          </button>
        </form>

        <div className="cart-section" style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', marginTop: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '1rem 1.5rem', background: '#f8fafc', fontWeight: 'bold', color: '#64748b', fontSize: '0.9rem' }}>
            <span style={{ flex: 3 }}>آئٹم کی تفصیل</span>
            <span style={{ flex: 1, textAlign: 'center' }}>فی یونٹ قیمت</span>
            <span style={{ flex: 1, textAlign: 'center' }}>تعداد</span>
            <span style={{ flex: 1, textAlign: 'center' }}>ٹوٹل</span>
            <span style={{ width: '40px' }}></span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {cart.map(item => (
              <div key={item._id || item.id} style={{ display: 'flex', alignItems: 'center', padding: '1.2rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ flex: 3 }}>
                  <span style={{ fontWeight: '600', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {item.type === 'deal' && <Gift size={16} style={{ color: '#7c3aed' }} />}
                    {item.name}
                  </span>
                </div>
                <span style={{ flex: 1, textAlign: 'center' }}>Rs. {(item.salePrice || 0).toFixed(2)}</span>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                  <div className="qty-controls" style={{ background: '#f8fafc', padding: '0.2rem', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                    <button className="btn-qty" onClick={() => updateQty(item._id || item.id, -1)}><Minus size={14} /></button>
                    <input type="number" value={item.qty} onChange={(e) => setQty(item._id || item.id, e.target.value)} style={{ width: '40px', textAlign: 'center', border: 'none', background: 'transparent', fontWeight: 'bold' }} />
                    <button className="btn-qty" onClick={() => updateQty(item._id || item.id, 1)}><Plus size={14} /></button>
                  </div>
                </div>
                <span style={{ flex: 1, textAlign: 'center', fontWeight: 'bold' }}>Rs. {(item.salePrice * item.qty).toFixed(2)}</span>
                <button onClick={() => removeFromCart(item._id || item.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={18} /></button>
              </div>
            ))}
          </div>

          <div style={{ padding: '1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 }}>
              <button className="btn-action-sm" onClick={handleHoldOrder}><PauseCircle size={18} /> سیل منجمد کریں</button>
              <button className="btn-action-sm" onClick={() => setIsRecallModalOpen(true)} style={{ position: 'relative' }}>
                <List size={18} /> منجمد کارٹس ({heldOrders.length})
              </button>
              <button className="btn-action-sm" style={{ color: '#ef4444', borderColor: '#fca5a5' }} onClick={() => { setCart([]); setDiscount(0); }}><Trash2 size={18} /> کارٹ صاف کریں</button>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem', borderRight: '2px solid #e2e8f0', paddingRight: '2rem', borderLeft: '2px solid #e2e8f0', paddingLeft: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>ذیلی کل</span><span>Rs. {subtotal.toFixed(2)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>رعایت</span>
                <input type="number" value={discount || ''} onChange={(e) => setDiscount(Number(e.target.value))} style={{ width: '80px', textAlign: 'left', padding: '0.3rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.5rem', color: '#2563eb', borderTop: '2px dashed #cbd5e1', paddingTop: '0.5rem' }}>
                <span>حتمی کل</span><span>Rs. {total.toFixed(2)}</span>
              </div>
              <div style={{ marginTop: '0.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>وصول شدہ رقم</span>
                  <input type="number" value={receivedAmount || ''} onChange={(e) => setReceivedAmount(Number(e.target.value))} style={{ width: '100px', textAlign: 'left', padding: '0.3rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem', fontWeight: 'bold', color: receivedAmount >= total ? '#10b981' : '#ef4444' }}>
                  <span>{receivedAmount >= total ? 'بقیہ رقم:' : 'باقی ماندہ:'}</span>
                  <span>Rs. {Math.abs(receivedAmount - total).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setCustomerType('Walk-in')} style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: `2px solid ${customerType === 'Walk-in' ? '#3b82f6' : '#e2e8f0'}`, background: customerType === 'Walk-in' ? '#eff6ff' : 'white', fontWeight: 'bold' }}>واک ان 🚶</button>
                <button onClick={() => setCustomerType('Over the call')} style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: `2px solid ${customerType === 'Over the call' ? '#3b82f6' : '#e2e8f0'}`, background: customerType === 'Over the call' ? '#eff6ff' : 'white', fontWeight: 'bold' }}>فون پر 📞</button>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.8rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: '0.4rem', position: 'relative' }}>
                  <input type="text" placeholder="نام" value={customerName} onChange={(e) => { setCustomerName(e.target.value); if(e.target.value.trim()) { const m = crmCustomers.filter(c => c.name.toLowerCase().includes(e.target.value.toLowerCase())); setCustomerSuggestions(m); setShowCustomerSuggestions(true); } else setShowCustomerSuggestions(false); }} style={{ width: '50%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  <input type="tel" placeholder="فون" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} style={{ width: '50%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  {showCustomerSuggestions && customerSuggestions.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', zIndex: 100 }}>
                      {customerSuggestions.map(c => <div key={c._id} onClick={() => { setCustomerName(c.name); setCustomerPhone(c.phone || ''); setSelectedCustomerId(c._id); setShowCustomerSuggestions(false); }} style={{ padding: '0.5rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>{c.name} ({c.phone})</div>)}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {['Cash', 'Card', 'Online'].map(m => <button key={m} onClick={() => setPaymentMethod(m)} style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: `2px solid ${paymentMethod === m ? '#10b981' : '#e2e8f0'}`, background: paymentMethod === m ? '#10b981' : 'white', color: paymentMethod === m ? 'white' : 'black', fontWeight: 'bold' }}>{m === 'Cash' ? 'نقد' : m === 'Card' ? 'کارڈ' : 'آن لائن'}</button>)}
              </div>
              <button onClick={handleCheckout} style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', padding: '1rem', borderRadius: '12px', fontSize: '1.3rem', fontWeight: '800', cursor: 'pointer' }}>چیک آؤٹ Rs. {total.toFixed(0)}</button>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      {receiptData && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="receipt-modal" style={{ textAlign: 'center', padding: '2rem', maxWidth: '450px' }}>
            <h2 style={{ color: '#10b981', marginBottom: '1rem', fontWeight: 'bold' }}>سیل کامیاب!</h2>
            <div id="billing-receipt-wrapper" className="receipt-paper print-receipt-wrapper" ref={receiptRef} style={{ boxShadow: 'none', background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%', textAlign: 'right' }}>
              {/* Header Section */}
              <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '1rem' }}>
                <img 
                  src={`${API_BASE}/logo/${JSON.parse(localStorage.getItem('pos_user') || '{}')?.shopId || 'logo'}.png`} 
                  crossOrigin="anonymous" 
                  alt="Store Logo" 
                  style={{ width: '70px', height: '70px', objectFit: 'contain', marginBottom: '0.5rem' }} 
                  onError={(e) => e.target.style.display = 'none'} 
                />
                <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#1e293b', marginBottom: '0.2rem' }}>{shopDetails.name || activeUser.shopName || 'MY STORE'}</h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{shopDetails.address || ''} {shopDetails.phone ? `| ${shopDetails.phone}` : ''}</p>
                <div style={{ width: '100%', borderBottom: '1px dashed #cbd5e1', margin: '0.8rem 0' }}></div>
                <p style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>سیل رسید</p>
              </div>

              {/* Meta Data */}
              <div style={{ marginBottom: '1rem', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>رسید نمبر:</span> 
                  <span style={{ fontWeight: 'bold' }}>{receiptData.invoiceId || '#' + receiptData._id.slice(-8).toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>تاریخ:</span> 
                  <span>{new Date(receiptData.createdAt).toLocaleString('ur-PK')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>کیشیئر:</span> 
                  <span>{activeUser.fullName || 'ایڈمن'}</span>
                </div>
              </div>

              {/* Table Content */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem', fontSize: '0.8rem' }}>
                <thead style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <tr style={{ color: '#64748b' }}>
                    <th style={{ textAlign: 'right', padding: '0.5rem 0' }}>آئٹم</th>
                    <th style={{ textAlign: 'center', padding: '0.5rem 0' }}>تعداد</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0' }}>ٹوٹل</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptData.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.6rem 0', fontWeight: '500' }}>{item.name}</td>
                      <td style={{ padding: '0.6rem 0', textAlign: 'center' }}>{item.qty}</td>
                      <td style={{ padding: '0.6rem 0', textAlign: 'left', fontWeight: 'bold' }}>Rs. {(item.totalItemPrice ?? (item.salePrice * item.qty)).toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Block */}
              <div style={{ borderTop: '2px solid #f1f5f9', paddingTop: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748b' }}>ذیلی کل:</span> 
                  <span>Rs. {(receiptData.grandTotal + receiptData.discount - (receiptData.taxAmount || 0)).toLocaleString()}</span>
                </div>
                {receiptData.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#ef4444' }}>
                    <span>رعایت:</span> 
                    <span>- Rs. {receiptData.discount.toLocaleString()}</span>
                  </div>
                )}
                {receiptData.taxAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span>ٹیکس ({receiptData.taxRate}%):</span> 
                    <span>+ Rs. {receiptData.taxAmount.toLocaleString()}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: '900', color: '#1e293b', marginTop: '0.3rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem' }}>
                  <span>حتمی رقم:</span>
                  <span>Rs. {receiptData.grandTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Footer */}
              <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.7rem', borderTop: '1px dashed #cbd5e1', paddingTop: '1rem', color: '#94a3b8' }}>
                <p style={{ fontWeight: 'bold', marginBottom: '0.1rem' }}>Developed By Tycoon Technologies Pvt. Ltd. Islamabad.</p>
                <p>03060626699 | www.tycoon.technology</p>
              </div>
            </div>
            <div className="modal-actions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '0.8rem', width: '100%' }}>
              <button onClick={() => printReceipt(receiptData)} className="btn-modal-action" style={{ background: '#4f46e5', color: 'white' }}>
                <Printer size={18} /><span>رسید پرنٹ</span>
              </button>
              <button onClick={() => printGatepass(receiptData)} className="btn-modal-action" style={{ background: '#0f172a', color: 'white' }}>
                <Truck size={18} /><span>گیٹ پاس</span>
              </button>
              <button onClick={handleDownloadPDF} className="btn-modal-action" style={{ background: '#f8fafc', color: '#1e293b', border: '1px solid #e2e8f0' }}>
                <Download size={18} /><span>PDF</span>
              </button>
              <button onClick={() => setIsWhatsappModalOpen(true)} className="btn-modal-action" style={{ background: '#25D366', color: 'white' }}>
                <FaWhatsapp size={20} /><span>واٹس ایپ</span>
              </button>
              <button onClick={() => setReceiptData(null)} className="btn-modal-action" style={{ background: '#ef4444', color: 'white' }}>
                <X size={18} /><span>بند کریں</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {isRecallModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="product-modal" style={{ maxWidth: '800px' }}>
            <div className="modal-header"><h2>❄ منجمد ٹرانزیکشنز</h2><button onClick={() => setIsRecallModalOpen(false)}><X/></button></div>
            <div style={{ padding: '1rem' }}>
              {heldOrders.length === 0 ? <p style={{ textAlign: 'center' }}>کوئی ریکارڈ نہیں ملا</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: '#f8fafc' }}><th>آئی ڈی</th><th>آئٹمز</th><th>رقم</th><th>ایکشن</th></tr></thead>
                  <tbody>
                    {heldOrders.map(o => (
                      <tr key={o.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '1rem' }}>{o.frozenId}</td>
                        <td style={{ padding: '1rem' }}>{o.cart.length} آئٹمز</td>
                        <td style={{ padding: '1rem' }}>Rs. {o.cart.reduce((s, i) => s + (i.salePrice * i.qty), 0)}</td>
                        <td style={{ padding: '1rem' }}>
                          <button onClick={() => { setCart(o.cart); setDiscount(o.discount); setHeldOrders(heldOrders.filter(h => h.id !== o.id)); setIsRecallModalOpen(false); }} className="btn-primary" style={{ padding: '0.3rem 0.8rem' }}>بحال کریں</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {isWhatsappModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="product-modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header"><h2>واٹس ایپ پر بھیجیں</h2><button onClick={() => setIsWhatsappModalOpen(false)}><X/></button></div>
            <form onSubmit={handleWhatsappSubmit} style={{ padding: '1.5rem' }}>
              <input type="text" placeholder="کسٹمر کا نام" value={wpName} onChange={(e) => setWpName(e.target.value)} style={{ width: '100%', marginBottom: '1rem', padding: '0.7rem', borderRadius: '8px', border: '1px solid #ddd' }} />
              <input type="tel" placeholder="واٹس ایپ نمبر" value={wpPhone} onChange={(e) => setWpPhone(e.target.value)} style={{ width: '100%', marginBottom: '1.5rem', padding: '0.7rem', borderRadius: '8px', border: '1px solid #ddd' }} />
              <button type="submit" style={{ width: '100%', padding: '1rem', background: '#25D366', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>بھیجیں</button>
            </form>
          </div>
        </div>
      )}

      {isDealModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="product-modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header"><h2>نئی ڈیل بنائیں</h2><button onClick={() => setIsDealModalOpen(false)}><X/></button></div>
            <div style={{ padding: '1.5rem' }}>
              <label>ڈیل کا نام</label>
              <input type="text" value={dealName} onChange={e => setDealName(e.target.value)} style={{ width: '100%', padding: '0.7rem', marginBottom: '1rem' }} />
              <label>آئٹمز تلاش کریں</label>
              <input type="text" value={dealSearch} onChange={e => setDealSearch(e.target.value)} style={{ width: '100%', padding: '0.7rem', marginBottom: '1rem' }} />
              <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #eee', marginBottom: '1rem' }}>
                {dbProducts.filter(p => p.name.toLowerCase().includes(dealSearch.toLowerCase())).map(p => (
                  <div key={p._id} onClick={() => addProductToDeal(p)} style={{ padding: '0.5rem', cursor: 'pointer', borderBottom: '1px solid #f9f9f9', textAlign: 'right' }}>{p.name} - Rs.{p.salePrice}</div>
                ))}
              </div>
              <div style={{ marginBottom: '1rem' }}>
                {dealItems.map(i => <div key={i.product} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0' }}><span>{i.productName} x{i.qty}</span><button onClick={() => removeDealItem(i.product)}>❌</button></div>)}
              </div>
              <label>ڈیل کی قیمت</label>
              <input type="number" value={dealPrice} onChange={e => setDealPrice(e.target.value)} style={{ width: '100%', padding: '0.7rem' }} />
              <button onClick={handleSaveDeal} style={{ width: '100%', marginTop: '1.5rem', padding: '1rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px' }}>ڈیل محفوظ کریں</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .urdu-rtl { direction: rtl; }
        .urdu-rtl .pos-main { padding: 1.5rem; display: flex; flex-direction: column; min-height: 100vh; background: #f1f5f9; }
        .urdu-rtl .btn-qty { width: 30px; height: 30px; border-radius: 6px; border: 1px solid #cbd5e1; background: white; cursor: pointer; }
        .urdu-rtl .btn-action-sm { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem; border-radius: 8px; border: 1px solid #cbd5e1; background: white; cursor: pointer; font-weight: bold; font-size: 0.9rem; }
        .urdu-rtl .btn-icon { display: flex; align-items: center; gap: 0.5rem; background: white; border: 1px solid #e2e8f0; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
        .urdu-rtl .btn-icon:hover { background: #f8fafc; border-color: #cbd5e1; }
        .urdu-rtl .suggestions-list { position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #e2e8f0; border-radius: 12px; margin-top: 0.5rem; padding: 0; list-style: none; z-index: 100; box-shadow: 0 10px 15px rgba(0,0,0,0.1); }
        .urdu-rtl .pos-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: flex-start; }
        
        /* Modal Action Buttons Fix */
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

export default UrduBilling;

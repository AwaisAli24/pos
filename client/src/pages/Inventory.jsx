import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Barcode from 'react-barcode';
import API_BASE from '../config';
import { 
  Plus, Search, LayoutDashboard, ShoppingCart, 
  Package, Settings, AlertTriangle, ArrowUpDown, 
  Wallet, X, Printer, RefreshCw, Truck, List, Trash2, Users, Store, BarChart3, DollarSign, UserCheck
} from 'lucide-react';
import './Inventory.css';

// Mock data scaled for Pak Rupees and stock levels
const INITIAL_INVENTORY = [
  { id: '101', barcode: '890123', name: 'Premium Foil Balloon', category: 'Party', costPrice: 300, salePrice: 500, currentStock: 150, minStock: 20 },
  { id: '102', barcode: '890124', name: 'Birthday Banner Large', category: 'Party', costPrice: 500, salePrice: 850, currentStock: 45, minStock: 50 },
  { id: '103', barcode: '890125', name: 'Sparkler Candles', category: 'Cake', costPrice: 150, salePrice: 300, currentStock: 0, minStock: 15 },
  { id: '104', barcode: '890126', name: 'Gift Wrapping Roll', category: 'Gifts', costPrice: 200, salePrice: 350, currentStock: 300, minStock: 50 },
  { id: '105', barcode: '890127', name: 'Party Popper Mix', category: 'Effects', costPrice: 300, salePrice: 500, currentStock: 12, minStock: 20 },
  { id: '106', barcode: '890128', name: 'LED String Lights', category: 'Lighting', costPrice: 800, salePrice: 1200, currentStock: 60, minStock: 10 },
  { id: '107', barcode: '890129', name: 'Teddy Bear Small', category: 'Gifts', costPrice: 900, salePrice: 1500, currentStock: 25, minStock: 10 },
  { id: '108', barcode: '890130', name: 'Disposable Cup Set', category: 'Tableware', costPrice: 400, salePrice: 650, currentStock: 5, minStock: 20 }
];

const Inventory = () => {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Extract user authorization state
  const activeUser = JSON.parse(localStorage.getItem('pos_user') || '{}');
  const isCashier = activeUser.role === 'User';
  
  // Real DB Fetching
  useEffect(() => {
    // Smart redirect if the user belongs to a specific category
    if (activeUser.shopCategory?.toLowerCase() === 'glass') {
      navigate('/glass-inventory', { replace: true });
    }

    const fetchData = async () => {
      try {
        const token = localStorage.getItem('pos_token');
        const [resInv, resSup] = await Promise.all([
          axios.get(`${API_BASE}/api/inventory`, { headers: { 'x-auth-token': token } }),
          axios.get(`${API_BASE}/api/suppliers`, { headers: { 'x-auth-token': token } })
        ]);
        if (resInv.data) setInventory(resInv.data);
        if (resSup.data) setSuppliers(resSup.data);
      } catch (err) {
        console.error('Failed to grab app data', err);
      }
    };
    fetchData();
  }, []);
  
  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [isNewSubCategory, setIsNewSubCategory] = useState(false);
  const [newProduct, setNewProduct] = useState({
    barcode: '',
    name: '',
    category: '',
    subCategory: '',
    costPrice: '',
    salePrice: '',
    currentStock: '',
    minStock: '',
    expiryDate: '',
    supplier: 'Unknown'
  });

  // New Supplier inline creation state
  const [isNewSupplier, setIsNewSupplier] = useState(false);
  const [newSupplierForm, setNewSupplierForm] = useState({ name: '', phone: '', company: '' });
  const [savingSupplier, setSavingSupplier] = useState(false);

  // Adjust Product State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState(null);
  const [adjustForm, setAdjustForm] = useState({
    name: '',
    category: '',
    subCategory: '',
    currentStock: '',
    salePrice: '',
    costPrice: '',
    minStock: '',
    expiryDate: '',
    supplier: 'Unknown'
  });

  // Print Barcode State
  const [barcodeToPrint, setBarcodeToPrint] = useState(null);

  // Derived Statistics
  const totalProducts = inventory.length;
  const uniqueCategories = [...new Set(inventory.map(item => item.category).filter(Boolean))];
  
  // Calculate unique sub-categories for the currently selected category in the add modal
  const uniqueSubCategories = newProduct.category 
    ? [...new Set(inventory.filter(i => i.category === newProduct.category).map(i => i.subCategory).filter(Boolean))]
    : [];
  
  const lowStockCount = inventory.filter(item => item.currentStock <= item.minStock && item.currentStock > 0).length;
  const outOfStockCount = inventory.filter(item => item.currentStock === 0).length;
  const totalValue = inventory.reduce((sum, item) => sum + (item.costPrice * item.currentStock), 0);

  // Filtered List Bulletproof Logic
  const safeSearch = (searchTerm || '').toLowerCase();
  const filteredInventory = inventory.filter(item => {
    if (!safeSearch) return true;
    const n = (item.name || '').toLowerCase();
    const b = (item.barcode ? String(item.barcode) : '').toLowerCase();
    const c = (item.category || '').toLowerCase();
    return n.includes(safeSearch) || b.includes(safeSearch) || c.includes(safeSearch);
  });

  const getStockStatus = (current, min) => {
    if (current === 0) return { label: 'Out of Stock', class: 'out-of-stock' };
    if (current <= min) return { label: 'Low Stock', class: 'low-stock' };
    return { label: 'In Stock', class: 'in-stock' };
  };

  const handleAdjustStock = (item) => {
    setAdjustingProduct(item);
    setAdjustForm({
      name: item.name,
      category: item.category,
      subCategory: item.subCategory || '',
      currentStock: item.currentStock,
      salePrice: item.salePrice,
      costPrice: item.costPrice,
      minStock: item.minStock,
      expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : '',
      supplier: item.supplier || 'Unknown'
    });
    setIsAdjustModalOpen(true);
  };

  const handleAdjustChange = (e) => {
    setAdjustForm({ ...adjustForm, [e.target.name]: e.target.value });
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('pos_token');
    try {
      const payload = {
        name: adjustForm.name,
        category: adjustForm.category,
        subCategory: adjustForm.subCategory,
        currentStock: parseInt(adjustForm.currentStock) || 0,
        salePrice: parseFloat(adjustForm.salePrice) || 0,
        costPrice: parseFloat(adjustForm.costPrice) || 0,
        minStock: parseInt(adjustForm.minStock) || 0,
        expiryDate: adjustForm.expiryDate || null,
        supplier: adjustForm.supplier || 'Unknown'
      };

      const res = await axios.put(`${API_BASE}/api/inventory/${adjustingProduct._id}`, payload, {
        headers: { 'x-auth-token': token }
      });

      // Swap the edited item in place without destroying table order
      setInventory(inventory.map(item => item._id === adjustingProduct._id ? res.data : item));
      setIsAdjustModalOpen(false);
      setAdjustingProduct(null);
      alert('Product stock successfully updated!');
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating product');
    }
  };

  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Admin Action: Are you absolutely certain you wish to completely erase "${name}"? This action cannot be reversed.`)) return;
    try {
      const token = localStorage.getItem('pos_token');
      await axios.delete(`${API_BASE}/api/inventory/${id}`, {
        headers: { 'x-auth-token': token }
      });
      setInventory(inventory.filter(item => (item._id || item.id) !== id));
      alert('Product permanently erased.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to erase product. Unknown Error.');
    }
  };

  // Add Product Handlers
  const handleInputChange = (e) => {
    setNewProduct({ ...newProduct, [e.target.name]: e.target.value });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    
    const productPayload = {
      barcode: newProduct.barcode,
      name: newProduct.name,
      category: newProduct.category || 'General',
      subCategory: newProduct.subCategory || '',
      costPrice: parseFloat(newProduct.costPrice) || 0,
      salePrice: parseFloat(newProduct.salePrice) || 0,
      currentStock: parseInt(newProduct.currentStock) || 0,
      minStock: parseInt(newProduct.minStock) || 10,
      expiryDate: newProduct.expiryDate || null,
      supplier: newProduct.supplier || 'Unknown'
    };

    try {
      const token = localStorage.getItem('pos_token');
      const res = await axios.post(`${API_BASE}/api/inventory`, productPayload, {
        headers: { 'x-auth-token': token }
      });
      setInventory([res.data, ...inventory]);
      setIsAddModalOpen(false);
      setIsNewCategory(false);
      setIsNewSubCategory(false);
      setIsNewSupplier(false);
      setNewSupplierForm({ name: '', phone: '', company: '' });
      // Reset form
      setNewProduct({
        barcode: '', name: '', category: '', subCategory: '', costPrice: '', salePrice: '', currentStock: '', minStock: '', expiryDate: '', supplier: 'Unknown'
      });
      setIsNewCategory(false);
      setIsNewSubCategory(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Error occurred while saving product');
    }
  };

  // Create supplier inline and auto-select it
  const handleCreateSupplier = async () => {
    if (!newSupplierForm.name.trim()) return alert('Supplier name is required.');
    try {
      setSavingSupplier(true);
      const token = localStorage.getItem('pos_token');
      const res = await axios.post(`${API_BASE}/api/suppliers`, newSupplierForm, {
        headers: { 'x-auth-token': token }
      });
      const created = res.data;
      setSuppliers([...suppliers, created]);
      setNewProduct({ ...newProduct, supplier: created.name });
      setIsNewSupplier(false);
      setNewSupplierForm({ name: '', phone: '', company: '' });
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating supplier.');
    } finally {
      setSavingSupplier(false);
    }
  };

  // Generate Custom Barcode Utility
  const generateBarcode = () => {
    let uniqueNumber;
    let isDuplicate = true;
    let attempts = 0;

    // Safety check: ensure we don't loop forever if by some miracle 90M+ barcodes are used
    while (isDuplicate && attempts < 100) {
      // Generates a random 8-digit numeric code
      uniqueNumber = String(Math.floor(10000000 + Math.random() * 90000000));
      
      // Check if this number already exists in our current inventory state
      const exists = inventory.some(item => String(item.barcode) === uniqueNumber);
      
      if (!exists) {
        isDuplicate = false;
      }
      attempts++;
    }

    setNewProduct({ ...newProduct, barcode: uniqueNumber });
  };

  // Popup-window barcode printer — no CSS conflicts, fills whatever label the printer uses
  const printBarcode = (item) => {
    const shopName = activeUser.shopName || '';
    const html = `
      <!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Barcode Label</title>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
      <style>
        @page { size: 50mm auto; margin: 0; }
        html, body { height: auto; overflow: hidden; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: Arial, sans-serif;
          width: 50mm;
          background: white;
        }
        .label {
          display: flex;
          flex-direction: column;
          width: 50mm;
          padding: 1mm 2mm;
        }
        .row-barcode {
          width: 100%;
          text-align: center;
        }
        svg { max-width: 100%; display: block; margin: 0 auto; }
        .row-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          padding: 0 1mm;
          margin-top: 1px;
        }
        .price { font-size: 9px; font-weight: 900; white-space: nowrap; }
        .product-name { font-size: 8px; font-weight: 700; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 65%; }
      <\/style></head><body>
        <div class="label">
          <div class="row-barcode">
            <svg id="barcode"></svg>
          </div>
          <div class="row-info">
            <span class="price">Rs. ${item.salePrice?.toFixed ? item.salePrice.toFixed(0) : item.salePrice}</span>
            <span class="product-name">${item.name}</span>
          </div>
        </div>
        <script>
          JsBarcode("#barcode", "${item.barcode}", {
            width: 1.8,
            height: 28,
            fontSize: 9,
            displayValue: true,
            margin: 1
          });
        <\/script>
      </body></html>`;

    const w = window.open('', '_blank', 'width=200,height=130');
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 900);
  };

  return (
    <div className="inventory-container">
      
      {/* Minimal Navigation Sidebar */}
      <nav className="sidebar-min">
        <div className="nav-item" onClick={() => navigate('/billing')} title="POS / Billing">
          <ShoppingCart size={20} />
        </div>
        <div className="nav-item active" title="Inventory">
          <Package size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate('/purchases')} title="Purchases">
          <Truck size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate('/suppliers')} title="Suppliers">
          <Users size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate('/customers')} title="Customers">
          <Store size={20} />
        </div>
        <div className="nav-item" onClick={() => navigate('/sales-history')} title="Sales History">
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

      {/* Main Inventory Area */}
      <main className="inventory-main">
        <header className="inventory-header">
          <div className="header-title-group">
            <h1>Inventory Management</h1>
            <p>Monitor your stock levels and product catalog</p>
          </div>
          <div className="header-actions">
            {!isCashier && (
              <button className="btn-primary" onClick={() => setIsAddModalOpen(true)}>
                <Plus size={18} /> Add New Product
              </button>
            )}
          </div>
        </header>

        {/* Dashboard Cards */}
        <section className="summary-cards">
          <div className="summary-card">
            <div className="card-icon blue">
              <Package size={26} />
            </div>
            <div className="card-info">
              <h3>Total Products</h3>
              <p>{totalProducts}</p>
            </div>
          </div>
          <div className="summary-card">
            <div className="card-icon yellow">
              <AlertTriangle size={26} />
            </div>
            <div className="card-info">
              <h3>Low / Out of Stock</h3>
              <p>{lowStockCount + outOfStockCount} Alerts</p>
            </div>
          </div>
          <div className="summary-card">
            <div className="card-icon green">
              <Wallet size={26} />
            </div>
            <div className="card-info">
              <h3>Total Stock Value</h3>
              <p>Rs. {totalValue.toLocaleString()}</p>
            </div>
          </div>
        </section>

        {/* Inventory Table */}
        <section className="inventory-table-container">
          <div className="table-controls">
            <h2 style={{ fontSize: '1.2rem', color: 'var(--text-main)', fontWeight: '600' }}>Product List</h2>
            <div className="search-box">
              <Search size={18} color="#94a3b8" />
              <input 
                type="text" 
                placeholder="Search by name, barcode..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Barcode</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Cost (Rs)</th>
                  <th>Sale (Rs)</th>
                  <th>Stock</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map(item => {
                  const status = getStockStatus(item.currentStock, item.minStock);
                  let expiryStyle = { color: '#64748b' };
                  let expiryText = 'N/A';
                  if (item.expiryDate) {
                    const exp = new Date(item.expiryDate);
                    expiryText = exp.toLocaleDateString();
                    const daysLeft = (exp - new Date()) / (1000 * 60 * 60 * 24);
                    if (daysLeft < 0) expiryStyle = { color: '#ef4444', fontWeight: 'bold' };
                    else if (daysLeft <= 30) expiryStyle = { color: '#f59e0b', fontWeight: 'bold' };
                  }

                  return (
                    <tr key={item._id || item.id}>
                      <td style={{ color: '#64748b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {item.barcode}
                          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', display: 'flex' }} title="Print Label" onClick={() => setBarcodeToPrint(item)}>
                            <Printer size={16} />
                          </button>
                        </div>
                      </td>
                      <td style={{ fontWeight: '600' }}>{item.name || 'Unknown'}</td>
                      <td>
                        <span style={{ fontSize: '0.9rem' }}>{item.category || 'General'}</span>
                        {item.subCategory && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.subCategory}</div>
                        )}
                      </td>
                      <td>{Number(item.costPrice || 0).toFixed(2)}</td>
                      <td>{Number(item.salePrice || 0).toFixed(2)}</td>
                      <td style={{ fontWeight: '700' }}>{item.currentStock || 0}</td>
                      <td style={expiryStyle}>{expiryText}</td>
                      <td>
                        <span className={`stock-status ${status.class}`}>
                          {status.label}
                        </span>
                      </td>
                      <td>
                        {!isCashier ? (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn-adjust" onClick={() => handleAdjustStock(item)}>
                              <ArrowUpDown size={14} /> Adjust
                            </button>
                            <button className="btn-adjust" style={{ color: '#ef4444', borderColor: '#fee2e2' }} onClick={() => handleDeleteProduct(item._id || item.id, item.name)} title="Permanently Erase Product">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Protected</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            
            {filteredInventory.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                <Package size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                <p>No products found matching your search.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="product-modal">
            <div className="modal-header">
              <h2>Add New Product</h2>
              <button className="btn-close" onClick={() => setIsAddModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit}>
              <div className="modal-form">
                
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Product Name</label>
                  <input 
                    type="text" name="name" className="auth-input" 
                    style={{ paddingLeft: '1rem' }} placeholder="e.g. Helium Balloon" 
                    value={newProduct.name} onChange={handleInputChange} required 
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label>Barcode Number</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="text" name="barcode" className="auth-input" 
                        style={{ paddingLeft: '1rem', flex: 1 }} placeholder="123456789" 
                        value={newProduct.barcode} onChange={handleInputChange} required 
                      />
                      <button type="button" onClick={generateBarcode} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 1rem', cursor: 'pointer', color: '#64748b' }} title="Generate Custom Code">
                        <RefreshCw size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    {!isNewCategory && uniqueCategories.length > 0 ? (
                      <select 
                        name="category" 
                        className="auth-input" 
                        style={{ paddingLeft: '1rem', appearance: 'auto', backgroundColor: '#fff' }} 
                        value={newProduct.category} 
                        onChange={(e) => {
                          if (e.target.value === 'CREATE_NEW_CATEGORY') {
                            setIsNewCategory(true);
                            setNewProduct({...newProduct, category: ''});
                          } else {
                            handleInputChange(e);
                          }
                        }} 
                        required
                      >
                        <option value="" disabled>Select a Category...</option>
                        {uniqueCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                        <option value="CREATE_NEW_CATEGORY" style={{ fontWeight: 'bold', color: '#047857' }}>+ Create New Category</option>
                      </select>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input 
                          type="text" name="category" className="auth-input" 
                          style={{ paddingLeft: '1rem', flex: 1 }} placeholder="New category name" 
                          value={newProduct.category} onChange={handleInputChange} required autoFocus
                        />
                        {uniqueCategories.length > 0 && (
                          <button 
                            type="button" 
                            onClick={() => {
                              setIsNewCategory(false);
                              setNewProduct({...newProduct, category: ''});
                            }} 
                            style={{ background: '#f87171', color: 'white', border: 'none', borderRadius: '8px', padding: '0 0.8rem', cursor: 'pointer' }}
                            title="Cancel"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Sub Category (Optional)</label>
                    {!isNewSubCategory && uniqueSubCategories.length > 0 ? (
                      <select 
                        name="subCategory" 
                        className="auth-input" 
                        style={{ paddingLeft: '1rem', appearance: 'auto', backgroundColor: '#fff' }} 
                        value={newProduct.subCategory} 
                        onChange={(e) => {
                          if (e.target.value === 'CREATE_NEW_SUBCAT') {
                            setIsNewSubCategory(true);
                            setNewProduct({...newProduct, subCategory: ''});
                          } else {
                            handleInputChange(e);
                          }
                        }}
                      >
                        <option value="">None / Select...</option>
                        {uniqueSubCategories.map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                        <option value="CREATE_NEW_SUBCAT" style={{ fontWeight: 'bold', color: '#047857' }}>+ Create New Sub-Category</option>
                      </select>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input 
                          type="text" name="subCategory" className="auth-input" 
                          style={{ paddingLeft: '1rem', flex: 1 }} placeholder="New sub-category" 
                          value={newProduct.subCategory} onChange={handleInputChange} autoFocus={isNewSubCategory}
                        />
                        {uniqueSubCategories.length > 0 && (
                          <button 
                            type="button" 
                            onClick={() => {
                              setIsNewSubCategory(false);
                              setNewProduct({...newProduct, subCategory: ''});
                            }} 
                            style={{ background: '#f87171', color: 'white', border: 'none', borderRadius: '8px', padding: '0 0.8rem', cursor: 'pointer' }}
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Cost Price (Rs)</label>
                    <input 
                      type="number" name="costPrice" className="auth-input" 
                      style={{ paddingLeft: '1rem' }} placeholder="0.00" 
                      value={newProduct.costPrice} onChange={handleInputChange} required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Sale Price (Rs)</label>
                    <input 
                      type="number" name="salePrice" className="auth-input" 
                      style={{ paddingLeft: '1rem' }} placeholder="0.00" 
                      value={newProduct.salePrice} onChange={handleInputChange} required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Initial Stock Qty</label>
                    <input 
                      type="number" name="currentStock" className="auth-input" 
                      style={{ paddingLeft: '1rem' }} placeholder="100" 
                      value={newProduct.currentStock} onChange={handleInputChange} required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Low Stock Alert</label>
                    <input 
                      type="number" name="minStock" className="auth-input" 
                      style={{ paddingLeft: '1rem' }} placeholder="10" 
                      value={newProduct.minStock} onChange={handleInputChange} required 
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Expiry Date (Optional)</label>
                    <input 
                      type="date" name="expiryDate" className="auth-input" 
                      style={{ paddingLeft: '1rem', width: '100%' }}
                      value={newProduct.expiryDate} onChange={handleInputChange} 
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Assigned Supplier</span>
                      {!isNewSupplier && (
                        <button
                          type="button"
                          onClick={() => setIsNewSupplier(true)}
                          style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', padding: 0 }}
                        >
                          + Create New Supplier
                        </button>
                      )}
                    </label>

                    {!isNewSupplier ? (
                      <select
                        name="supplier" className="auth-input"
                        style={{ paddingLeft: '1rem', width: '100%', cursor: 'pointer' }}
                        value={newProduct.supplier} onChange={handleInputChange}
                      >
                        <option value="Unknown">Unknown (Unassigned)</option>
                        {suppliers.map(sup => (
                          <option key={sup._id} value={sup.name}>{sup.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                        <p style={{ fontSize: '0.8rem', fontWeight: '700', color: '#16a34a', marginBottom: '0.2rem' }}>🆕 New Supplier</p>
                        <input
                          type="text" className="auth-input" placeholder="Supplier Name *"
                          style={{ paddingLeft: '1rem' }}
                          value={newSupplierForm.name}
                          onChange={e => setNewSupplierForm({ ...newSupplierForm, name: e.target.value })}
                        />
                        <input
                          type="text" className="auth-input" placeholder="Phone Number"
                          style={{ paddingLeft: '1rem' }}
                          value={newSupplierForm.phone}
                          onChange={e => setNewSupplierForm({ ...newSupplierForm, phone: e.target.value })}
                        />
                        <input
                          type="text" className="auth-input" placeholder="Company / Business Name"
                          style={{ paddingLeft: '1rem' }}
                          value={newSupplierForm.company}
                          onChange={e => setNewSupplierForm({ ...newSupplierForm, company: e.target.value })}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => { setIsNewSupplier(false); setNewSupplierForm({ name: '', phone: '', company: '' }); }}
                            style={{ padding: '0.4rem 1rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '0.85rem' }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleCreateSupplier}
                            disabled={savingSupplier}
                            style={{ padding: '0.4rem 1rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}
                          >
                            {savingSupplier ? 'Saving...' : '✓ Save & Select'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {isAdjustModalOpen && adjustingProduct && (
        <div className="modal-overlay">
          <div className="product-modal">
            <div className="modal-header">
              <h2>Adjust: <span style={{ color: "var(--primary)" }}>{adjustingProduct.name}</span></h2>
              <button className="btn-close" onClick={() => setIsAdjustModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAdjustSubmit}>
              <div className="modal-form">
                
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Product Name</label>
                  <input 
                    type="text" name="name" className="auth-input" 
                    style={{ paddingLeft: '1rem' }} 
                    value={adjustForm.name} onChange={handleAdjustChange} required 
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Barcode: <b>{adjustingProduct.barcode}</b> | Category: <b>{adjustingProduct.category}</b>
                  </p>
                </div>

                <div className="form-grid-2">
                   <div className="form-group">
                    <label>Category</label>
                    <input 
                      type="text" name="category" className="auth-input" 
                      style={{ paddingLeft: '1rem' }} 
                      value={adjustForm.category} onChange={handleAdjustChange} required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Sub Category</label>
                    <input 
                      type="text" name="subCategory" className="auth-input" 
                      style={{ paddingLeft: '1rem' }} 
                      value={adjustForm.subCategory} onChange={handleAdjustChange} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Current Stock</label>
                    <input 
                      type="number" name="currentStock" className="auth-input" 
                      style={{ paddingLeft: '1rem' }} placeholder="100" 
                      value={adjustForm.currentStock} onChange={handleAdjustChange} required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Low Stock Alert Level</label>
                    <input 
                      type="number" name="minStock" className="auth-input" 
                      style={{ paddingLeft: '1rem' }} placeholder="10" 
                      value={adjustForm.minStock} onChange={handleAdjustChange} required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Cost Price (Rs)</label>
                    <input 
                      type="number" name="costPrice" className="auth-input" 
                      style={{ paddingLeft: '1rem' }} placeholder="0.00" 
                      value={adjustForm.costPrice} onChange={handleAdjustChange} required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Sale Price (Rs)</label>
                    <input 
                      type="number" name="salePrice" className="auth-input" 
                      style={{ paddingLeft: '1rem' }} placeholder="0.00" 
                      value={adjustForm.salePrice} onChange={handleAdjustChange} required 
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Expiry Date (Optional)</label>
                    <input 
                      type="date" name="expiryDate" className="auth-input" 
                      style={{ paddingLeft: '1rem', width: '100%' }}
                      value={adjustForm.expiryDate} onChange={handleAdjustChange} 
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Assigned Supplier</label>
                    <select 
                      name="supplier" className="auth-input" 
                      style={{ paddingLeft: '1rem', width: '100%', cursor: 'pointer' }}
                      value={adjustForm.supplier} onChange={handleAdjustChange} 
                    >
                      <option value="Unknown">Unknown (Unassigned)</option>
                      {suppliers.map(sup => (
                        <option key={sup._id} value={sup.name}>{sup.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsAdjustModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ background: "linear-gradient(135deg, #10b981 0%, #047857 100%)" }}>
                  Save Adjustments
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Barcode Modal */}
      {barcodeToPrint && (
        <div className="modal-overlay">
          <div className="product-modal" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div className="modal-header">
              <h2>Print Barcode</h2>
              <button className="btn-close" onClick={() => setBarcodeToPrint(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ margin: '2rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div id="printable-barcode" style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', width: '280px' }}>
                <img 
                  src={`${API_BASE}/logo/${activeUser.shopId}.png`} 
                  alt="Shop Logo" 
                  style={{ height: '40px', objectFit: 'contain', marginBottom: '0.6rem' }}
                  onError={(e) => e.target.style.display = 'none'}
                />
                <p style={{ fontWeight: 'bold', marginBottom: '0.4rem', fontSize: '1.2rem' }}>{barcodeToPrint.name}</p>
                <Barcode 
                  value={barcodeToPrint.barcode}
                  width={2.2}
                  height={70}
                  fontSize={18}
                  displayValue={true}
                />
                <p style={{ fontSize: '1.4rem', marginTop: '0.8rem', fontWeight: 'bold' }}>
                  Rs. {barcodeToPrint.salePrice?.toFixed(0)}
                </p>
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button className="btn-primary" onClick={() => printBarcode(barcodeToPrint)}>
                <Printer size={18} style={{ marginRight: '0.5rem' }} /> Print Barcode
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Inventory;

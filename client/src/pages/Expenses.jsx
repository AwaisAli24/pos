import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE from '../config';
import {
  ShoppingCart, Package, Truck, Users, Store, List,
  LayoutDashboard, BarChart3, Settings, DollarSign,
  UserCheck, Plus, Trash2, Edit2, X, Search, Calendar,
  TrendingDown, Tag, CreditCard, FileText, Info
} from 'lucide-react';
import './Inventory.css';

const CATEGORIES = ['Rent', 'Utilities', 'Salaries', 'Supplies', 'Transport', 'Marketing', 'Maintenance', 'Other'];
const CATEGORY_COLORS = {
  Rent: '#6366f1', Utilities: '#f59e0b', Salaries: '#10b981',
  Supplies: '#3b82f6', Transport: '#8b5cf6', Marketing: '#ec4899',
  Maintenance: '#f97316', Other: '#64748b'
};

const EMPTY_FORM = {
  title: '', amount: '', category: 'Other', paymentMethod: 'Cash',
  date: new Date().toISOString().slice(0, 10), notes: '',
  employeeId: '', isAdvance: false, deductDebt: false
};

const Expenses = () => {
  const navigate = useNavigate();
  const activeUser = JSON.parse(localStorage.getItem('pos_user') || '{}');
  const isCashier = activeUser.role === 'User';

  const [expenses, setExpenses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const token = localStorage.getItem('pos_token');
  const headers = { 'x-auth-token': token };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterCategory) params.category = filterCategory;
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;
      const res = await axios.get(`${API_BASE}/api/expenses`, { headers, params });
      setExpenses(res.data);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/hr/employees`, { headers });
      setEmployees(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { 
    fetchExpenses(); 
    fetchEmployees();
  }, [filterCategory, filterFrom, filterTo]);

  const openAdd = () => { setEditingExpense(null); setForm(EMPTY_FORM); setIsModalOpen(true); };
  const openEdit = (exp) => {
    setEditingExpense(exp);
    setForm({
      title: exp.title, amount: exp.amount, category: exp.category,
      paymentMethod: exp.paymentMethod, notes: exp.notes || '',
      date: exp.date ? exp.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      employeeId: exp.employee?._id || exp.employee || '',
      isAdvance: false, deductDebt: false
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingExpense) {
        await axios.put(`${API_BASE}/api/expenses/${editingExpense._id}`, form, { headers });
      } else {
        await axios.post(`${API_BASE}/api/expenses`, form, { headers });
      }
      setIsModalOpen(false);
      fetchExpenses();
      fetchEmployees(); // Refresh employee data if debt changed
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving expense.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await axios.delete(`${API_BASE}/api/expenses/${id}`, { headers });
      fetchExpenses();
    } catch (err) { alert('Error deleting expense.'); }
  };

  const filtered = expenses.filter(e =>
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.employee?.fullName && e.employee.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalExpenses = filtered.reduce((s, e) => s + e.amount, 0);

  const selectedEmp = employees.find(e => e._id === form.employeeId);

  return (
    <div className="inventory-container">
      {/* Sidebar */}
      <nav className="sidebar-min">
        <div className="nav-item" onClick={() => navigate('/billing')} title="Billing"><ShoppingCart size={20} /></div>
        <div className="nav-item" onClick={() => navigate('/inventory')} title="Inventory"><Package size={20} /></div>
        <div className="nav-item" onClick={() => navigate('/purchases')} title="Purchases"><Truck size={20} /></div>
        <div className="nav-item" onClick={() => navigate('/suppliers')} title="Suppliers"><Users size={20} /></div>
        <div className="nav-item" onClick={() => navigate('/customers')} title="Customers"><Store size={20} /></div>
        <div className="nav-item" onClick={() => navigate('/sales-history')} title="Sales History"><List size={20} /></div>
        <div className="nav-item" onClick={() => navigate('/dashboard')} title="Dashboard"><LayoutDashboard size={20} /></div>
        <div className="nav-item" onClick={() => navigate('/reports')} title="Reports"><BarChart3 size={20} /></div>
        <div className="nav-item active" title="Expenses"><DollarSign size={20} /></div>
        <div className="nav-item" onClick={() => navigate('/hr')} title="HR"><UserCheck size={20} /></div>
        <div className="nav-item" onClick={() => navigate('/settings')} title="Settings" style={{ marginTop: 'auto' }}><Settings size={20} /></div>
      </nav>

      <main className="inventory-main">
        <div className="inventory-header">
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-main)' }}>Expense Tracker</h1>
            <p style={{ color: '#64748b', marginTop: '0.3rem' }}>Record and monitor all business expenditures</p>
          </div>
          <button className="btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={20} /> Add Expense
          </button>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: '#fef2f2', borderRadius: '12px', padding: '1.2rem', border: '1px solid #fca5a5' }}>
            <p style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: '600', marginBottom: '0.3rem' }}>TOTAL EXPENSES</p>
            <p style={{ fontSize: '1.6rem', fontWeight: '800', color: '#dc2626' }}>Rs. {(totalExpenses || 0).toLocaleString()}</p>
          </div>
          {CATEGORIES.map(cat => {
            const total = filtered.filter(e => e.category === cat).reduce((s, e) => s + (e.amount || 0), 0);
            if (total === 0) return null;
            return (
              <div key={cat} style={{ background: '#f8fafc', borderRadius: '12px', padding: '1.2rem', border: `1px solid ${CATEGORY_COLORS[cat]}33` }}>
                <p style={{ fontSize: '0.8rem', color: CATEGORY_COLORS[cat], fontWeight: '600', marginBottom: '0.3rem' }}>{cat.toUpperCase()}</p>
                <p style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-main)' }}>Rs. {(total || 0).toLocaleString()}</p>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.5rem 1rem', flex: 1, minWidth: '200px' }}>
            <Search size={16} color="#94a3b8" />
            <input type="text" placeholder="Search expenses or employees..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              style={{ border: 'none', outline: 'none', fontSize: '0.9rem', width: '100%' }} />
          </div>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            style={{ padding: '0.6rem 1rem', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', background: 'white' }}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
            style={{ padding: '0.6rem 1rem', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem' }} />
          <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
            style={{ padding: '0.6rem 1rem', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem' }} />
          {(filterCategory || filterFrom || filterTo) && (
            <button onClick={() => { setFilterCategory(''); setFilterFrom(''); setFilterTo(''); }}
              style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', padding: '0.6rem 1rem', cursor: 'pointer', color: '#64748b' }}>
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="sales-table-wrapper" style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', fontSize: '0.8rem', color: '#64748b', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Date</th>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', fontSize: '0.8rem', color: '#64748b', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Title</th>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', fontSize: '0.8rem', color: '#64748b', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Target / Emp</th>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', fontSize: '0.8rem', color: '#64748b', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Category</th>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', fontSize: '0.8rem', color: '#64748b', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Method</th>
                <th style={{ textAlign: 'right', padding: '1rem 1.5rem', fontSize: '0.8rem', color: '#64748b', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Amount</th>
                {!isCashier && <th style={{ textAlign: 'center', padding: '1rem 1.5rem', fontSize: '0.8rem', color: '#64748b', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  <TrendingDown size={40} style={{ opacity: 0.4, marginBottom: '0.5rem' }} /><br />No expenses recorded.
                </td></tr>
              ) : (
                filtered.map(exp => (
                  <tr key={exp._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem', color: '#64748b' }}>
                      {new Date(exp.date).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-main)' }}>{exp.title}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      {exp.employee?.fullName ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <UserCheck size={14} color="var(--primary)" />
                          <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: '600' }}>{exp.employee.fullName}</span>
                        </div>
                      ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ background: `${CATEGORY_COLORS[exp.category]}20`, color: CATEGORY_COLORS[exp.category], padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600' }}>
                        {exp.category}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem', color: '#64748b' }}>{exp.paymentMethod}</td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '700', color: '#dc2626' }}>
                      Rs. {(exp.amount || 0).toLocaleString()}
                    </td>
                    {!isCashier && (
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button onClick={() => openEdit(exp)} style={{ background: '#eff6ff', border: 'none', color: '#3b82f6', padding: '0.4rem 0.7rem', borderRadius: '7px', cursor: 'pointer' }}><Edit2 size={15} /></button>
                          <button onClick={() => handleDelete(exp._id)} style={{ background: '#fef2f2', border: 'none', color: '#ef4444', padding: '0.4rem 0.7rem', borderRadius: '7px', cursor: 'pointer' }}><Trash2 size={15} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="product-modal" style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h2>{editingExpense ? 'Edit Expense' : 'Add Expense'}</h2>
              <button className="btn-close" onClick={() => setIsModalOpen(false)}><X size={22} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div className="form-group">
                <label>Category</label>
                <select className="auth-input" style={{ paddingLeft: '1rem', appearance: 'auto' }} 
                  value={form.category} 
                  onChange={e => setForm({ ...form, category: e.target.value, employeeId: '', isAdvance: false, deductDebt: false })}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {form.category === 'Salaries' && (
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div className="form-group" style={{ marginBottom: '0.8rem' }}>
                    <label>Select Employee *</label>
                    <select className="auth-input" style={{ paddingLeft: '1rem', appearance: 'auto' }} 
                      value={form.employeeId} 
                      onChange={e => {
                        const emp = employees.find(emp => emp._id === e.target.value);
                        setForm({ ...form, employeeId: e.target.value, title: emp ? `Salary: ${emp.fullName}` : '', amount: emp ? emp.salary : '' });
                      }} required>
                      <option value="">Choose employee...</option>
                      {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.fullName} (Salary: {emp.salary})</option>)}
                    </select>
                  </div>
                  
                  {selectedEmp && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                        <Info size={14} /> 
                        <span>Current Due from Employee: <strong>Rs. {(selectedEmp.dueAmount || 0).toLocaleString()}</strong></span>
                      </div>
                      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                          <input type="checkbox" checked={form.isAdvance} onChange={e => setForm({...form, isAdvance: e.target.checked, deductDebt: false})} />
                          Mark as Advance
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                          <input type="checkbox" checked={form.deductDebt} onChange={e => setForm({...form, deductDebt: e.target.checked, isAdvance: false})} />
                          Deduct from Debt
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="form-group">
                <label>Title</label>
                <input type="text" className="auth-input" style={{ paddingLeft: '1rem' }} placeholder="e.g. Shop Rent" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Amount (Rs)</label>
                  <input type="number" className="auth-input" style={{ paddingLeft: '1rem' }} placeholder="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" className="auth-input" style={{ paddingLeft: '1rem' }} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Payment Method</label>
                  <select className="auth-input" style={{ paddingLeft: '1rem', appearance: 'auto' }} value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })}>
                    <option>Cash</option><option>Card</option><option>Online</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Notes (Optional)</label>
                  <input type="text" className="auth-input" style={{ paddingLeft: '1rem' }} placeholder="..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>
                {editingExpense ? 'Save Changes' : 'Process Expense'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;

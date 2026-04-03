import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE from '../config';
import {
  ShoppingCart, Package, Truck, Users, Store, List,
  LayoutDashboard, BarChart3, Settings, DollarSign,
  UserCheck, Plus, Trash2, Edit2, X, Search, ChevronDown,
  ChevronUp, Calendar, User, Phone, MapPin, Briefcase,
  GraduationCap, AlertCircle, CheckCircle, Clock, XCircle
} from 'lucide-react';
import './Inventory.css';

const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Late', 'Half-day', 'Holiday'];
const STATUS_COLORS = {
  Present: { bg: '#dcfce7', text: '#16a34a' },
  Absent:  { bg: '#fef2f2', text: '#dc2626' },
  Late:    { bg: '#fef9c3', text: '#ca8a04' },
  'Half-day': { bg: '#eff6ff', text: '#2563eb' },
  Holiday: { bg: '#f3f4f6', text: '#6b7280' }
};

const EMPTY_EMP = {
  fullName: '', phone: '', address: '', age: '',
  jobTitle: '', joiningDate: '', leavingDate: '',
  education: '', experience: '',
  salary: '', advanceTaken: '', dueAmount: '', benefits: '',
  status: 'Active',
  references: [{ name: '', phone: '', relation: '' }, { name: '', phone: '', relation: '' }]
};

const HR = () => {
  const navigate = useNavigate();
  const activeUser = JSON.parse(localStorage.getItem('pos_user') || '{}');
  const isCashier = activeUser.role === 'User';

  const [activeTab, setActiveTab] = useState('employees'); // 'employees' | 'attendance'
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [salaryExpenses, setSalaryExpenses] = useState([]);

  // Employee modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [form, setForm] = useState(EMPTY_EMP);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // Expanded employee detail view
  const [expandedId, setExpandedId] = useState(null);

  const token = localStorage.getItem('pos_token');
  const headers = { 'x-auth-token': token };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/hr/employees`, { headers });
      setEmployees(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchAttendance = async (date) => {
    try {
      const res = await axios.get(`${API_BASE}/api/hr/attendance`, { headers, params: { date } });
      setAttendance(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchSalaryStatus = async () => {
    try {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const res = await axios.get(`${API_BASE}/api/expenses`, { 
        headers, 
        params: { category: 'Salaries', from: firstDay } 
      });
      setSalaryExpenses(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { 
    fetchEmployees(); 
    fetchSalaryStatus();
  }, []);
  useEffect(() => { if (activeTab === 'attendance') fetchAttendance(attendanceDate); }, [activeTab, attendanceDate]);

  const openAdd = () => {
    setEditingEmp(null);
    setForm(EMPTY_EMP);
    setPhotoFile(null);
    setPhotoPreview(null);
    setIsModalOpen(true);
  };

  const openEdit = (emp) => {
    setEditingEmp(emp);
    setForm({
      fullName: emp.fullName || '', phone: emp.phone || '', address: emp.address || '',
      age: emp.age || '', jobTitle: emp.jobTitle || '',
      joiningDate: emp.joiningDate ? emp.joiningDate.slice(0, 10) : '',
      leavingDate: emp.leavingDate ? emp.leavingDate.slice(0, 10) : '',
      education: emp.education || '', experience: emp.experience || '',
      salary: emp.salary || '', advanceTaken: emp.advanceTaken || '',
      dueAmount: emp.dueAmount || '', benefits: emp.benefits || '',
      status: emp.status || 'Active',
      references: emp.references?.length === 2 ? emp.references : [
        { name: '', phone: '', relation: '' }, { name: '', phone: '', relation: '' }
      ]
    });
    setPhotoFile(null);
    setPhotoPreview(emp.photo ? `${API_BASE}/employee-photos/${emp.photo}` : null);
    setIsModalOpen(true);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const updateRef = (index, field, value) => {
    const refs = [...form.references];
    refs[index] = { ...refs[index], [field]: value };
    setForm({ ...form, references: refs });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.keys(form).forEach(key => {
        if (key === 'references') {
          fd.append('references', JSON.stringify(form.references));
        } else {
          fd.append(key, form[key]);
        }
      });
      if (photoFile) fd.append('photo', photoFile);

      if (editingEmp) {
        await axios.put(`${API_BASE}/api/hr/employees/${editingEmp._id}`, fd, {
          headers: { 'x-auth-token': token, 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await axios.post(`${API_BASE}/api/hr/employees`, fd, {
          headers: { 'x-auth-token': token, 'Content-Type': 'multipart/form-data' }
        });
      }
      setIsModalOpen(false);
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving employee.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this employee record?')) return;
    try {
      await axios.delete(`${API_BASE}/api/hr/employees/${id}`, { headers });
      fetchEmployees();
    } catch (err) { alert('Error deleting employee.'); }
  };

  const markAttendance = async (employeeId, status) => {
    try {
      await axios.post(`${API_BASE}/api/hr/attendance`, {
        employeeId, date: attendanceDate, status
      }, { headers });
      fetchAttendance(attendanceDate);
    } catch (err) { console.error(err); }
  };

  const getAttendanceStatus = (empId) => {
    const record = attendance.find(a => a.employee?._id === empId || a.employee === empId);
    return record?.status || null;
  };

  const isSalaryPaid = (empId) => {
    return salaryExpenses.some(exp => (exp.employee?._id === empId || exp.employee === empId));
  };

  const filtered = employees.filter(e =>
    e.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.jobTitle || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const presentCount = attendance.filter(a => a.status === 'Present').length;
  const absentCount = attendance.filter(a => a.status === 'Absent').length;

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
        <div className="nav-item" onClick={() => navigate('/expenses')} title="Expenses"><DollarSign size={20} /></div>
        <div className="nav-item active" title="HR"><UserCheck size={20} /></div>
        <div className="nav-item" onClick={() => navigate('/settings')} title="Settings" style={{ marginTop: 'auto' }}><Settings size={20} /></div>
      </nav>

      <main className="inventory-main">
        {/* Header */}
        <div className="inventory-header">
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-main)' }}>Human Resources</h1>
            <p style={{ color: '#64748b', marginTop: '0.3rem' }}>Manage employees, attendance & payroll</p>
          </div>
          {!isCashier && activeTab === 'employees' && (
            <button className="btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={20} /> Add Employee
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0' }}>
          {['employees', 'attendance'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.7rem 1.5rem', border: 'none', background: 'none', cursor: 'pointer',
                fontWeight: activeTab === tab ? '700' : '500',
                color: activeTab === tab ? 'var(--primary)' : '#64748b',
                borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: '-2px', fontSize: '0.95rem', textTransform: 'capitalize'
              }}>
              {tab === 'employees' ? '👤 Employees' : '📅 Attendance'}
            </button>
          ))}
        </div>

        {/* ── EMPLOYEES TAB ─────────────────────────── */}
        {activeTab === 'employees' && (
          <>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.5rem 1rem', flex: 1 }}>
                <Search size={16} color="#94a3b8" />
                <input type="text" placeholder="Search by name or job title..." value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ border: 'none', outline: 'none', fontSize: '0.9rem', width: '100%' }} />
              </div>
            </div>

            {loading ? <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>Loading...</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filtered.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                    <UserCheck size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                    <p>No employees found. Add your first employee!</p>
                  </div>
                )}
                {filtered.map(emp => (
                  <div key={emp._id} style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    {/* Employee Row */}
                    <div style={{ padding: '1.2rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {/* Photo */}
                      <div style={{ width: '52px', height: '52px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {emp.photo
                          ? <img src={`${API_BASE}/employee-photos/${emp.photo}`} alt={emp.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <User size={20} color="#94a3b8" />}
                      </div>
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-main)' }}>{emp.fullName}</span>
                          <span style={{ background: emp.status === 'Active' ? '#dcfce7' : '#fef2f2', color: emp.status === 'Active' ? '#16a34a' : '#dc2626', fontSize: '0.75rem', fontWeight: '700', padding: '0.2rem 0.6rem', borderRadius: '20px' }}>
                            {emp.status}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>
                          {emp.jobTitle || 'No Title'} {emp.joiningDate && `· Joined ${new Date(emp.joiningDate).toLocaleDateString()}`}
                        </p>
                        <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {isSalaryPaid(emp._id) ? (
                            <span style={{ fontSize: '0.75rem', color: '#16a34a', background: '#dcfce7', padding: '0.1rem 0.6rem', borderRadius: '4px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <CheckCircle size={12} /> Paid (Current Month)
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#dc2626', background: '#fef2f2', padding: '0.1rem 0.6rem', borderRadius: '4px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <AlertCircle size={12} /> Unpaid (Current Month)
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Salary badge */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '1rem' }}>Rs. {(emp.salary || 0).toLocaleString()}<span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '400' }}>/mo</span></p>
                        {emp.dueAmount > 0 && <p style={{ fontSize: '0.8rem', color: '#ef4444' }}>Due: Rs. {emp.dueAmount.toLocaleString()}</p>}
                      </div>
                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                        {!isCashier && (
                          <>
                            <button onClick={() => openEdit(emp)} style={{ background: '#eff6ff', border: 'none', color: '#3b82f6', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}><Edit2 size={16} /></button>
                            <button onClick={() => handleDelete(emp._id)} style={{ background: '#fef2f2', border: 'none', color: '#ef4444', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}><Trash2 size={16} /></button>
                          </>
                        )}
                        <button onClick={() => setExpandedId(expandedId === emp._id ? null : emp._id)}
                          style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}>
                          {expandedId === emp._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Detail Panel */}
                    {expandedId === emp._id && (
                      <div style={{ borderTop: '1px solid #f1f5f9', padding: '1.5rem', background: '#f8fafc', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                        <div>
                          <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Personal Info</p>
                          <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.4rem' }}><Phone size={13} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />{emp.phone || '—'}</p>
                          <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.4rem' }}><MapPin size={13} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />{emp.address || '—'}</p>
                          <p style={{ fontSize: '0.85rem', color: '#475569' }}>Age: {emp.age || '—'}</p>
                        </div>

                        <div>
                          <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Background</p>
                          <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.4rem' }}><GraduationCap size={13} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />{emp.education || '—'}</p>
                          <p style={{ fontSize: '0.85rem', color: '#475569' }}><Briefcase size={13} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />{emp.experience || '—'}</p>
                        </div>

                        <div>
                          <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>References</p>
                          {(emp.references || []).map((ref, i) => (
                            <div key={i} style={{ marginBottom: '0.5rem' }}>
                              <p style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>{ref.name || '—'}</p>
                              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{ref.phone} {ref.relation && `· ${ref.relation}`}</p>
                            </div>
                          ))}
                        </div>

                        <div>
                          <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Financials</p>
                          <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.3rem' }}>Salary: <strong>Rs. {(emp.salary || 0).toLocaleString()}/mo</strong></p>
                          <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.3rem' }}>Status: {isSalaryPaid(emp._id) ? <strong style={{ color: '#059669' }}>PAID ✓</strong> : <strong style={{ color: '#dc2626' }}>UNPAID ✗</strong>}</p>
                          <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.3rem' }}>Advance Taken: <strong style={{ color: '#f97316' }}>Rs. {(emp.advanceTaken || 0).toLocaleString()}</strong></p>
                          <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.3rem' }}>Due Amount: <strong style={{ color: '#ef4444' }}>Rs. {(emp.dueAmount || 0).toLocaleString()}</strong></p>
                          {emp.benefits && <p style={{ fontSize: '0.85rem', color: '#475569' }}>Benefits: {emp.benefits}</p>}
                        </div>

                        {emp.leavingDate && (
                          <div>
                            <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Employment Period</p>
                            <p style={{ fontSize: '0.85rem', color: '#475569' }}>Joined: {new Date(emp.joiningDate).toLocaleDateString()}</p>
                            <p style={{ fontSize: '0.85rem', color: '#ef4444' }}>Left: {new Date(emp.leavingDate).toLocaleDateString()}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── ATTENDANCE TAB ─────────────────────────── */}
        {activeTab === 'attendance' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ background: '#dcfce7', borderRadius: '10px', padding: '0.6rem 1.2rem' }}>
                  <span style={{ color: '#16a34a', fontWeight: '700' }}>✓ Present: {presentCount}</span>
                </div>
                <div style={{ background: '#fef2f2', borderRadius: '10px', padding: '0.6rem 1.2rem' }}>
                  <span style={{ color: '#dc2626', fontWeight: '700' }}>✗ Absent: {absentCount}</span>
                </div>
              </div>
              <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)}
                style={{ padding: '0.6rem 1rem', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem' }} />
            </div>

            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ textAlign: 'left', padding: '1rem 1.5rem', fontSize: '0.8rem', color: '#64748b', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Employee</th>
                    <th style={{ textAlign: 'left', padding: '1rem 1.5rem', fontSize: '0.8rem', color: '#64748b', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Job Title</th>
                    <th style={{ textAlign: 'center', padding: '1rem 1.5rem', fontSize: '0.8rem', color: '#64748b', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.filter(e => e.status === 'Active').map(emp => {
                    const status = getAttendanceStatus(emp._id);
                    return (
                      <tr key={emp._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {emp.photo
                              ? <img src={`${API_BASE}/employee-photos/${emp.photo}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <User size={18} color="#94a3b8" />}
                          </div>
                          <span style={{ fontWeight: '600' }}>{emp.fullName}</span>
                        </td>
                        <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem', color: '#64748b' }}>{emp.jobTitle || '—'}</td>
                        <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {ATTENDANCE_STATUSES.map(s => (
                              <button key={s} onClick={() => !isCashier && markAttendance(emp._id, s)}
                                disabled={isCashier}
                                style={{
                                  padding: '0.3rem 0.8rem', border: 'none', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '600',
                                  cursor: isCashier ? 'default' : 'pointer',
                                  background: status === s ? STATUS_COLORS[s].bg : '#f1f5f9',
                                  color: status === s ? STATUS_COLORS[s].text : '#94a3b8',
                                  outline: status === s ? `2px solid ${STATUS_COLORS[s].text}` : 'none'
                                }}>
                                {s}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {employees.filter(e => e.status === 'Active').length === 0 && (
                    <tr><td colSpan="3" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>No active employees.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {/* Add / Edit Employee Modal */}
      {isModalOpen && (
        <div className="modal-overlay" style={{ overflowY: 'auto', alignItems: 'flex-start', padding: '2rem 0' }}>
          <div className="product-modal" style={{ maxWidth: '700px', margin: 'auto' }}>
            <div className="modal-header">
              <h2>{editingEmp ? 'Edit Employee' : 'Add Employee'}</h2>
              <button className="btn-close" onClick={() => setIsModalOpen(false)}><X size={22} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

              {/* Photo Upload */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #cbd5e1', flexShrink: 0 }}>
                  {photoPreview ? <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={32} color="#94a3b8" />}
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.4rem', color: 'var(--text-main)' }}>Employee Photo</label>
                  <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ fontSize: '0.85rem' }} />
                </div>
              </div>

              {/* Personal Info */}
              <p style={{ fontWeight: '700', color: '#475569', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Personal Information</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Full Name *</label>
                  <input type="text" className="auth-input" style={{ paddingLeft: '1rem' }} value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} required placeholder="Muhammad Ali" />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input type="text" className="auth-input" style={{ paddingLeft: '1rem' }} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="03001234567" />
                </div>
                <div className="form-group">
                  <label>Age</label>
                  <input type="number" className="auth-input" style={{ paddingLeft: '1rem' }} value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} placeholder="25" />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Address</label>
                  <input type="text" className="auth-input" style={{ paddingLeft: '1rem' }} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Full home address" />
                </div>
              </div>

              {/* Job Info */}
              <p style={{ fontWeight: '700', color: '#475569', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Job Information</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Job Title</label>
                  <input type="text" className="auth-input" style={{ paddingLeft: '1rem' }} value={form.jobTitle} onChange={e => setForm({ ...form, jobTitle: e.target.value })} placeholder="Cashier, Manager..." />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select className="auth-input" style={{ paddingLeft: '1rem', appearance: 'auto' }} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option>Active</option><option>Inactive</option><option>Terminated</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Joining Date</label>
                  <input type="date" className="auth-input" style={{ paddingLeft: '1rem' }} value={form.joiningDate} onChange={e => setForm({ ...form, joiningDate: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Leaving Date</label>
                  <input type="date" className="auth-input" style={{ paddingLeft: '1rem' }} value={form.leavingDate} onChange={e => setForm({ ...form, leavingDate: e.target.value })} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Education</label>
                  <input type="text" className="auth-input" style={{ paddingLeft: '1rem' }} value={form.education} onChange={e => setForm({ ...form, education: e.target.value })} placeholder="Matric / FA / BA / BSc..." />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Experience</label>
                  <input type="text" className="auth-input" style={{ paddingLeft: '1rem' }} value={form.experience} onChange={e => setForm({ ...form, experience: e.target.value })} placeholder="2 years in retail / Fresh graduate..." />
                </div>
              </div>

              {/* References */}
              <p style={{ fontWeight: '700', color: '#475569', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>References</p>
              {[0, 1].map(i => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.8rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px' }}>
                  <p style={{ gridColumn: '1/-1', fontSize: '0.8rem', fontWeight: '600', color: '#64748b', margin: 0 }}>Reference {i + 1}</p>
                  <div className="form-group">
                    <label>Name</label>
                    <input type="text" className="auth-input" style={{ paddingLeft: '1rem' }} value={form.references[i]?.name || ''} onChange={e => updateRef(i, 'name', e.target.value)} placeholder="Full name" />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input type="text" className="auth-input" style={{ paddingLeft: '1rem' }} value={form.references[i]?.phone || ''} onChange={e => updateRef(i, 'phone', e.target.value)} placeholder="Phone" />
                  </div>
                  <div className="form-group">
                    <label>Relation</label>
                    <input type="text" className="auth-input" style={{ paddingLeft: '1rem' }} value={form.references[i]?.relation || ''} onChange={e => updateRef(i, 'relation', e.target.value)} placeholder="Uncle / Colleague..." />
                  </div>
                </div>
              ))}

              {/* Financials */}
              <p style={{ fontWeight: '700', color: '#475569', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Financials</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Monthly Salary (Rs)</label>
                  <input type="number" className="auth-input" style={{ paddingLeft: '1rem' }} value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} placeholder="25000" />
                </div>
                <div className="form-group">
                  <label>Advance Taken (Rs)</label>
                  <input type="number" className="auth-input" style={{ paddingLeft: '1rem' }} value={form.advanceTaken} onChange={e => setForm({ ...form, advanceTaken: e.target.value })} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Due Amount (Rs)</label>
                  <input type="number" className="auth-input" style={{ paddingLeft: '1rem' }} value={form.dueAmount} onChange={e => setForm({ ...form, dueAmount: e.target.value })} placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Benefits</label>
                  <input type="text" className="auth-input" style={{ paddingLeft: '1rem' }} value={form.benefits} onChange={e => setForm({ ...form, benefits: e.target.value })} placeholder="Transport, Health, Meals..." />
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem', fontSize: '1rem' }}>
                {editingEmp ? 'Save Changes' : 'Add Employee'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HR;

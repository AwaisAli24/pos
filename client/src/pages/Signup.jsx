import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE from '../config';
import { UserPlus, User, Mail, Lock, Eye, EyeOff, Briefcase, Phone, MapPin, Tag } from 'lucide-react';

const Signup = () => {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    shopName: '',
    category: '',
    phone: '',
    address: '',
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE}/api/auth/signup`, formData);
      alert(res.data.message || 'Account created!');
      navigate('/login');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Server error during signup');
    }
  };

  return (
    <div className="auth-container" style={{ padding: '3rem 1rem' }}>
      <div className="auth-bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
      </div>

      <div className="auth-card" style={{ maxWidth: '650px' }}>
        <div className="auth-header">
          <div className="auth-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <UserPlus size={26} strokeWidth={2.5} />
          </div>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Set up your smart POS today</p>
        </div>

        <form className="auth-form auth-grid" onSubmit={handleSubmit}>
          
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <div className="input-wrapper">
              <User className="input-icon" />
              <input
                type="text"
                id="name"
                name="name"
                className="auth-input"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="shopName">Shop Name</label>
            <div className="input-wrapper">
              <Briefcase className="input-icon" />
              <input
                type="text"
                id="shopName"
                name="shopName"
                className="auth-input"
                placeholder="Shop Name"
                value={formData.shopName}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="category">Business Type</label>
            <div className="input-wrapper">
              <Tag className="input-icon" />
              <select
                id="category"
                name="category"
                className="auth-input"
                style={{ 
                  appearance: 'none', 
                  color: formData.category ? 'var(--text-main)' : '#94a3b8' 
                }}
                value={formData.category}
                onChange={handleChange}
                required
              >
                <option value="" disabled>Select category...</option>
                <option value="party" style={{ color: 'var(--text-main)' }}>Party Decorations & Gifts</option>
                <option value="retail" style={{ color: 'var(--text-main)' }}>General Retail</option>
                <option value="grocery" style={{ color: 'var(--text-main)' }}>Grocery Store</option>
                <option value="wholesale" style={{ color: 'var(--text-main)' }}>Wholesale</option>
                <option value="event" style={{ color: 'var(--text-main)' }}>Event Management</option>
                <option value="other" style={{ color: 'var(--text-main)' }}>Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <div className="input-wrapper">
              <Phone className="input-icon" />
              <input
                type="tel"
                id="phone"
                name="phone"
                className="auth-input"
                placeholder="+92 300 1234567"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group full-width">
            <label htmlFor="address">Shop Address</label>
            <div className="input-wrapper">
              <MapPin className="input-icon" />
              <input
                type="text"
                id="address"
                name="address"
                className="auth-input"
                placeholder="Shop Address"
                value={formData.address}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-wrapper">
              <Mail className="input-icon" />
              <input
                type="email"
                id="email"
                name="email"
                className="auth-input"
                placeholder="admin@pos.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                className="auth-input"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary full-width" 
            style={{ 
              background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', 
              marginTop: '0.5rem' 
            }}
          >
            Create Business Account
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? 
          <Link to="/login" className="auth-link" style={{ color: '#059669' }}>Sign In</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;

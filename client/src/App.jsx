import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Billing from './pages/Billing';
import GlassBilling from './pages/Glass/GlassBilling';
import Inventory from './pages/Inventory';
import GlassInventory from './pages/Glass/GlassInventory';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Suppliers from './pages/Suppliers';
import SalesHistory from './pages/SalesHistory';
import GlassSalesHistory from './pages/Glass/GlassSalesHistory';
import Purchases from './pages/Purchases';
import GlassPurchases from './pages/Glass/GlassPurchases';
import Reports from './pages/Reports';
import Customers from './pages/Customers';
import Expenses from './pages/Expenses';
import HR from './pages/HR';
import GlassDashboard from './pages/Glass/GlassDashboard';
import GlassCustomers from './pages/Glass/GlassCustomers';
import GlassSuppliers from './pages/Glass/GlassSuppliers';
import GlassReports from './pages/Glass/GlassReports';
import GlassSettings from './pages/Glass/GlassSettings';
import GlassExpenses from './pages/Glass/GlassExpenses';
import GlassHR from './pages/Glass/GlassHR';
import UrduBilling from './pages/UrduRetail/UrduBilling';
import UrduInventory from './pages/UrduRetail/UrduInventory';
import UrduSalesHistory from './pages/UrduRetail/UrduSalesHistory';
import UrduPurchases from './pages/UrduRetail/UrduPurchases';
import UrduSuppliers from './pages/UrduRetail/UrduSuppliers';
import UrduCustomers from './pages/UrduRetail/UrduCustomers';
import UrduDashboard from './pages/UrduRetail/UrduDashboard';
import UrduReports from './pages/UrduRetail/UrduReports';
import UrduExpenses from './pages/UrduRetail/UrduExpenses';
import UrduHR from './pages/UrduRetail/UrduHR';
import UrduSettings from './pages/UrduRetail/UrduSettings';
import SaaSAdminDashboard from './pages/SaaSAdminDashboard';

import API_BASE from './config';

// Dynamic favicon hook
const useFavicon = () => {
  const applyFavicon = () => {
    const link = document.getElementById('dynamic-favicon');
    if (!link) return;
    const token = localStorage.getItem('pos_token');
    const user = JSON.parse(localStorage.getItem('pos_user') || '{}');
    if (token && user.shopId) {
      link.href = `${API_BASE}/logo/${user.shopId}.png`;
    } else {
      link.href = ''; // Blank — no favicon when not logged in
    }
  };

  useEffect(() => {
    applyFavicon();
    // Also react to login/logout events across tabs
    window.addEventListener('storage', applyFavicon);
    return () => window.removeEventListener('storage', applyFavicon);
  }, []);
};

// Basic Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('pos_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// SaaS Admin Route wrapper
const SaaSAdminRoute = ({ children }) => {
  const token = localStorage.getItem('pos_token');
  const user = JSON.parse(localStorage.getItem('pos_user') || '{}');
  if (!token || user.role !== 'SaaS Admin') {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Floating Impersonation Banner
const ImpersonationBanner = () => {
  const saasAdminToken = localStorage.getItem('saas_admin_token');
  const user = JSON.parse(localStorage.getItem('pos_user') || '{}');

  if (!saasAdminToken) return null;

  const handleExit = () => {
    const adminToken = localStorage.getItem('saas_admin_token');
    const adminUser = localStorage.getItem('saas_admin_user');
    
    localStorage.setItem('pos_token', adminToken);
    localStorage.setItem('pos_user', adminUser);
    localStorage.removeItem('saas_admin_token');
    localStorage.removeItem('saas_admin_user');
    
    window.location.href = '/saas-admin';
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#1e293b',
      color: '#f8fafc',
      padding: '0.75rem 1.5rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 99999,
      borderTop: '3px solid #f59e0b',
      boxShadow: '0 -4px 10px rgba(0, 0, 0, 0.2)',
      fontFamily: "'Outfit', sans-serif"
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{
          backgroundColor: '#f59e0b',
          color: '#1e293b',
          padding: '0.2rem 0.6rem',
          borderRadius: '4px',
          fontWeight: 'bold',
          fontSize: '0.8rem'
        }}>IMPERSONATING</span>
        <span style={{ fontSize: '0.9rem' }}>Viewing store: <strong>{user.shopName || 'Unknown Store'}</strong> ({user.fullName || 'Admin'})</span>
      </div>
      <button 
        onClick={handleExit}
        style={{
          backgroundColor: '#ef4444',
          color: 'white',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 'bold',
          transition: 'background 0.2s',
          fontSize: '0.85rem'
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
        onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
      >
        Exit Impersonation
      </button>
    </div>
  );
};

function App() {
  useFavicon();
  return (
    <>
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      {/* Protected Routes */}
      <Route path="/billing" element={
        <ProtectedRoute>
          <Billing />
        </ProtectedRoute>
      } />
      <Route path="/glass-billing" element={
        <ProtectedRoute>
          <GlassBilling />
        </ProtectedRoute>
      } />
      <Route path="/inventory" element={
        <ProtectedRoute>
          <Inventory />
        </ProtectedRoute>
      } />
      <Route path="/glass-inventory" element={
        <ProtectedRoute>
          <GlassInventory />
        </ProtectedRoute>
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/glass-dashboard" element={
        <ProtectedRoute>
          <GlassDashboard />
        </ProtectedRoute>
      } />
      <Route path="/urdu-dashboard" element={
        <ProtectedRoute>
          <UrduDashboard />
        </ProtectedRoute>
      } />
      <Route path="/suppliers" element={
        <ProtectedRoute>
          <Suppliers />
        </ProtectedRoute>
      } />
      <Route path="/glass-suppliers" element={
        <ProtectedRoute>
          <GlassSuppliers />
        </ProtectedRoute>
      } />
      <Route path="/sales-history" element={
        <ProtectedRoute>
          <SalesHistory />
        </ProtectedRoute>
      } />
      <Route path="/glass-sales" element={
        <ProtectedRoute>
          <GlassSalesHistory />
        </ProtectedRoute>
      } />
      <Route path="/purchases" element={
        <ProtectedRoute>
          <Purchases />
        </ProtectedRoute>
      } />
      <Route path="/glass-purchases" element={
        <ProtectedRoute>
          <GlassPurchases />
        </ProtectedRoute>
      } />
      <Route path="/customers" element={
        <ProtectedRoute>
          <Customers />
        </ProtectedRoute>
      } />
      <Route path="/glass-customers" element={
        <ProtectedRoute>
          <GlassCustomers />
        </ProtectedRoute>
      } />
      <Route path="/reports" element={
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      } />
      <Route path="/glass-reports" element={
        <ProtectedRoute>
          <GlassReports />
        </ProtectedRoute>
      } />
      <Route path="/urdu-reports" element={
        <ProtectedRoute>
          <UrduReports />
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      } />
      <Route path="/glass-settings" element={
        <ProtectedRoute>
          <GlassSettings />
        </ProtectedRoute>
      } />
      <Route path="/expenses" element={
        <ProtectedRoute>
          <Expenses />
        </ProtectedRoute>
      } />
      <Route path="/glass-expenses" element={
        <ProtectedRoute>
          <GlassExpenses />
        </ProtectedRoute>
      } />
      <Route path="/hr" element={
        <ProtectedRoute>
          <HR />
        </ProtectedRoute>
      } />
      <Route path="/glass-hr" element={
        <ProtectedRoute>
          <GlassHR />
        </ProtectedRoute>
      } />
      <Route path="/urdu-billing" element={
        <ProtectedRoute>
          <UrduBilling />
        </ProtectedRoute>
      } />
      <Route path="/urdu-inventory" element={
        <ProtectedRoute>
          <UrduInventory />
        </ProtectedRoute>
      } />
      <Route path="/urdu-sales" element={
        <ProtectedRoute>
          <UrduSalesHistory />
        </ProtectedRoute>
      } />
      <Route path="/urdu-purchases" element={
        <ProtectedRoute>
          <UrduPurchases />
        </ProtectedRoute>
      } />
      <Route path="/urdu-suppliers" element={
        <ProtectedRoute>
          <UrduSuppliers />
        </ProtectedRoute>
      } />
      <Route path="/urdu-customers" element={
        <ProtectedRoute>
          <UrduCustomers />
        </ProtectedRoute>
      } />
      <Route path="/urdu-expenses" element={
        <ProtectedRoute>
          <UrduExpenses />
        </ProtectedRoute>
      } />
      <Route path="/urdu-hr" element={
        <ProtectedRoute>
          <UrduHR />
        </ProtectedRoute>
      } />
      <Route path="/urdu-settings" element={
        <ProtectedRoute>
          <UrduSettings />
        </ProtectedRoute>
      } />
      <Route path="/saas-admin" element={
        <SaaSAdminRoute>
          <SaaSAdminDashboard />
        </SaaSAdminRoute>
      } />
    </Routes>
    <ImpersonationBanner />
    </>
  );
}

export default App;

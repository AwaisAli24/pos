import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Billing from './pages/Billing';
import GlassBilling from './pages/GlassBilling';
import Inventory from './pages/Inventory';
import GlassInventory from './pages/GlassInventory';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Suppliers from './pages/Suppliers';
import SalesHistory from './pages/SalesHistory';
import GlassSalesHistory from './pages/GlassSalesHistory';
import Purchases from './pages/Purchases';
import GlassPurchases from './pages/GlassPurchases';
import Reports from './pages/Reports';
import Customers from './pages/Customers';
import Expenses from './pages/Expenses';
import HR from './pages/HR';
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

function App() {
  useFavicon();
  return (
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
      <Route path="/suppliers" element={
        <ProtectedRoute>
          <Suppliers />
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
      <Route path="/reports" element={
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      } />
      <Route path="/expenses" element={
        <ProtectedRoute>
          <Expenses />
        </ProtectedRoute>
      } />
      <Route path="/hr" element={
        <ProtectedRoute>
          <HR />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default App;

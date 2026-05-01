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
    </Routes>
  );
}

export default App;

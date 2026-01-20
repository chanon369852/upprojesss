import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { ForgotPasswordForm } from './components/auth/ForgotPasswordForm';
import { ResetPasswordForm } from './components/auth/ResetPasswordForm';
import VerifyEmailPage from './components/auth/VerifyEmailPage';
import OAuthCallback from './components/OAuthCallback';
import WebhookEvents from './components/WebhookEvents';
import SyncHistory from './components/SyncHistory';
import { TermsOfService } from './components/legal/TermsOfService';
import { PrivacyPolicy } from './components/legal/PrivacyPolicy';
import { Dashboard } from './components/Dashboard';
import ProfilePage from './components/ProfilePage';
import IntegrationManager from './components/IntegrationManager';
import ProductPerformanceDetails from './components/ProductPerformanceDetails';
import UsersPage from './components/UsersPage';
import SyncCenter from './components/SyncCenter';
import MetricsImport from './components/MetricsImport';
import CampaignsPage from './components/CampaignsPage';
import MetricsPage from './components/MetricsPage';
import AlertsPage from './components/AlertsPage';
import ReportsPage from './components/ReportsPage';
import AiPage from './components/AiPage';
import ApiSetup from './components/ApiSetup';
import { getStoredRole, hasPermission, PERMISSIONS, type Permission } from './lib/rbac';

const FloatingLoginShortcut: React.FC<{ isAuthenticated: boolean }> = ({ isAuthenticated }) => {
  const location = useLocation();
  const navigate = useNavigate();

  if (isAuthenticated) return null;

  const hiddenOnPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/oauth/callback', '/verify-email'];
  if (hiddenOnPaths.includes(location.pathname)) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        type="button"
        onClick={() => navigate('/login')}
        className="group inline-flex items-center gap-2 rounded-full border border-gray-200/80 bg-white/90 px-4 py-3 text-sm font-semibold text-gray-900 shadow-lg backdrop-blur transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/60"
        aria-label="Go to login"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          In
        </span>
        <span className="max-w-0 overflow-hidden whitespace-nowrap transition-all duration-200 group-hover:max-w-[160px] group-focus:max-w-[160px]">
          เข้าสู่ระบบ
        </span>
      </button>
    </div>
  );
};

// FLOW START: App component (EN)
// จุดเริ่มต้น: คอมโพเนนต์หลักของแอป (TH)

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const isMvpMode = process.env.REACT_APP_MVP_MODE === 'true';

  function clearEphemeralUiCache() {
    if (typeof window === 'undefined') return;
    try {
      const keysToRemove = [
        'mockIntegrationConnections',
        'rga_scroll_target',
        'seed.providers',
        'seed.days',
      ];

      keysToRemove.forEach((key) => {
        try {
          window.localStorage.removeItem(key);
        } catch {
          // ignore
        }
      });
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    // FLOW START: Read session from localStorage (EN)
    // จุดเริ่มต้น: อ่าน token/tenant จาก localStorage (TH)
    const token = localStorage.getItem('token');
    const tenantId = localStorage.getItem('tenantId');
    const tenantSlug = localStorage.getItem('tenantSlug');
    if (token && (tenantId || tenantSlug)) {
      setIsAuthenticated(true);
    }
    setLoading(false);

    // FLOW END: Read session from localStorage (EN)
    // จุดสิ้นสุด: อ่าน token/tenant จาก localStorage (TH)
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    clearEphemeralUiCache();
    const id = window.setInterval(clearEphemeralUiCache, 15 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  const handleLogout = () => {
    // FLOW START: Logout (EN)
    // จุดเริ่มต้น: ออกจากระบบ (ล้าง session) (TH)
    localStorage.removeItem('token');
    localStorage.removeItem('tenantId');
    localStorage.removeItem('tenantSlug');
    setIsAuthenticated(false);

    // FLOW END: Logout (EN)
    // จุดสิ้นสุด: ออกจากระบบ (ล้าง session) (TH)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const RequirePermission: React.FC<{ permission: Permission; children: React.ReactNode }> = ({
    permission,
    children,
  }) => {
    // FLOW START: RBAC guard (EN)
    // จุดเริ่มต้น: ตรวจสิทธิ์ก่อนเข้าหน้า (TH)
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    const role = getStoredRole();
    if (!hasPermission(role, permission)) return <Navigate to="/dashboard" replace />;
    return <>{children}</>;
  };

  const RequireReportsAccess: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    const role = getStoredRole();
    const canSeeReports =
      hasPermission(role, PERMISSIONS.export_logs) ||
      hasPermission(role, PERMISSIONS.manage_alerts) ||
      hasPermission(role, PERMISSIONS.manage_users) ||
      hasPermission(role, PERMISSIONS.manage_system);
    if (!canSeeReports) return <Navigate to="/dashboard" replace />;
    return <>{children}</>;
  };

  return (
    // FLOW START: Router + Routes (EN)
    // จุดเริ่มต้น: กำหนดเส้นทางหน้าเว็บ (TH)
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={
          <LoginForm 
            onForgotPassword={() => window.location.href = '/forgot-password'}
            onRegister={() => window.location.href = '/register'}
            onLoginSuccess={() => setIsAuthenticated(true)}
          />
        } />
        <Route path="/register" element={
          <RegisterForm 
            onBackToLogin={() => window.location.href = '/login'}
          />
        } />
        <Route path="/forgot-password" element={
          <ForgotPasswordForm 
            onBackToLogin={() => window.location.href = '/login'}
          />
        } />
        <Route path="/reset-password" element={<ResetPasswordForm />} />
        <Route path="/verify-email" element={<VerifyEmailPage onVerified={() => setIsAuthenticated(true)} />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        
        {/* Legal Pages */}
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        
        {/* Protected Routes */}
        <Route
          path="/checklist"
          element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
        />
        <Route path="/dashboard" element={
          isAuthenticated ? <Dashboard onLogout={handleLogout} /> : <Navigate to="/login" replace />
        } />
        <Route path="/campaigns" element={
          isAuthenticated ? <CampaignsPage /> : <Navigate to="/login" replace />
        } />
        <Route path="/metrics" element={
          isAuthenticated ? <MetricsPage /> : <Navigate to="/login" replace />
        } />
        <Route path="/alerts" element={
          <RequirePermission permission={PERMISSIONS.manage_alerts}>
            <AlertsPage />
          </RequirePermission>
        } />
        <Route path="/reports" element={
          <RequireReportsAccess>
            <ReportsPage />
          </RequireReportsAccess>
        } />
        <Route path="/ai" element={
          isAuthenticated ? <AiPage /> : <Navigate to="/login" replace />
        } />
        <Route path="/integrations" element={
          <RequirePermission permission={PERMISSIONS.manage_integrations}>
            <IntegrationManager />
          </RequirePermission>
        } />
        <Route path="/profile" element={
          isAuthenticated ? <ProfilePage /> : <Navigate to="/login" replace />
        } />
        <Route path="/webhooks" element={
          <RequirePermission permission={PERMISSIONS.manage_integrations}>
            <WebhookEvents />
          </RequirePermission>
        } />
        <Route path="/history" element={
          isAuthenticated ? <SyncHistory /> : <Navigate to="/login" replace />
        } />
        <Route path="/sync-center" element={
          <RequirePermission permission={PERMISSIONS.manage_integrations}>
            <SyncCenter />
          </RequirePermission>
        } />
        <Route path="/metrics-import" element={
          <RequirePermission permission={PERMISSIONS.manage_integrations}>
            <MetricsImport />
          </RequirePermission>
        } />
        <Route path="/api-setup" element={
          <RequirePermission permission={PERMISSIONS.manage_integrations}>
            <ApiSetup />
          </RequirePermission>
        } />
        <Route path="/users" element={
          isAuthenticated ? (
            getStoredRole() === 'super_admin' ? (
              <UsersPage />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        } />
        <Route path="/product-performance-details" element={
          isAuthenticated ? (isMvpMode ? <Navigate to="/dashboard" replace /> : <ProductPerformanceDetails />) : <Navigate to="/login" replace />
        } />
        
        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <FloatingLoginShortcut isAuthenticated={isAuthenticated} />
      
    </Router>
  );
};

// FLOW END: App component (EN)
// จุดสิ้นสุด: คอมโพเนนต์หลักของแอป (TH)

export default App;

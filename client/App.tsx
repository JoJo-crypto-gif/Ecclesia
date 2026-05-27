import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Zones from './pages/Zones';
import Attendance from './pages/Attendance';
import Messaging from './pages/Messaging';
import CheckIn from './pages/CheckIn';
import Calendar from './pages/Calendar';
import Celebrations from './pages/Celebrations';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ChangeTemporaryPassword from './pages/ChangeTemporaryPassword';
import KioskMode from './pages/KioskMode';
import { DataProvider, useData } from './context/DataContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { User } from './types';
import ZoneDashboard from './pages/ZoneDashboard';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import AuditLogs from './pages/AuditLogs';
import MobileHeader from './components/MobileHeader';
import { useLocation } from 'react-router-dom';
import { apiFetch } from './utils/api';

// Protected Route Wrapper
interface ProtectedLayoutProps {
  children: React.ReactNode;
  module?: string;
  action?: 'read' | 'create' | 'edit' | 'delete';
  user: User | null;
  authLoading: boolean;
  onLogout: () => Promise<void>;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const ProtectedLayout: React.FC<ProtectedLayoutProps & { isMobileMenuOpen: boolean; setIsMobileMenuOpen: (o: boolean) => void }> = ({ 
  children, module, action = 'read', user, authLoading, onLogout, isSidebarCollapsed, toggleSidebar, isMobileMenuOpen, setIsMobileMenuOpen
}) => {
  const { hasPermission } = useAuth();
  const { settings } = useData();

  const churchName = settings?.church_name || 'Ecclesia';
  const churchLogo = settings?.church_logo || '';

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500">
        Loading...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (module && !hasPermission(module, action)) {
    return <Navigate to={hasPermission('dashboard', 'read') ? '/' : '/login'} replace />;
  }
  
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans transition-colors duration-500 ease-in-out">
      <Sidebar 
          onLogout={onLogout} 
          isCollapsed={isSidebarCollapsed} 
          toggleSidebar={toggleSidebar} 
          user={user}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <MobileHeader 
            isOpen={isMobileMenuOpen} 
            toggleMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            title={churchName}
            logo={churchLogo}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative scroll-smooth">
          <div className="max-w-7xl mx-auto transition-all duration-500 ease-spring">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

const AppInner: React.FC = () => {
  const { user, authLoading, login, logout } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { refreshData, fetchMembers, fetchMessages, fetchSettings, fetchEmailTemplates } = useData();
  const location = useLocation();

  // Close mobile menu on navigate
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogin = async (email: string, password: string) => {
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data?.error?.message || 'Login failed' };
      }
      
      if (data.mfaRequired) {
        return { 
          success: true, 
          mfaRequired: true, 
          userId: data.userId, 
          channel: data.channel, 
          recipient: data.recipient 
        };
      }

      login(data.data);
      return { success: true, role: data.data.role, mustChangePassword: data.data.mustChangePassword };
    } catch {
      return { success: false, error: 'Login failed' };
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      logout();
    }
  };
  const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);

  useEffect(() => {
    if (user && !user.mustChangePassword) {
      // Session restored or login happened — re-fetch all data now that we're authenticated
      Promise.all([
        refreshData(),
        fetchMembers(),
        fetchMessages(),
        fetchSettings(),
        fetchEmailTemplates()
      ]).catch(console.error);
    }
  }, [user, refreshData, fetchMembers, fetchMessages, fetchSettings, fetchEmailTemplates]);


  return (
    <Routes>
        <Route path="/login" element={
          user ? <Navigate to={user.mustChangePassword ? '/change-password' : user.role === 'zone_leader' ? '/zone-dashboard' : '/'} replace /> : <Login onLogin={handleLogin} />
        } />
        <Route path="/forgot-password" element={
          user ? <Navigate to={user.mustChangePassword ? '/change-password' : user.role === 'zone_leader' ? '/zone-dashboard' : '/'} replace /> : <ForgotPassword />
        } />
        <Route path="/change-password" element={<ChangeTemporaryPassword />} />
        
        {/* Public Route for QR Check-in (Self-service via phone) */}
        <Route path="/check-in/:instanceId" element={<CheckIn />} />

        {/* Kiosk Mode (Ideally semi-protected, but separate route for full screen) */}
        <Route path="/kiosk/:instanceId" element={
          user ? (user.mustChangePassword ? <Navigate to="/change-password" replace /> : <KioskMode />) : <Navigate to="/login" replace />
        } />

        {/* Protected Routes */}
        <Route path="/" element={
          <ProtectedLayout 
            module="dashboard"
            user={user} 
            authLoading={authLoading} 
            onLogout={handleLogout}
            isSidebarCollapsed={isSidebarCollapsed}
            toggleSidebar={toggleSidebar}
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
          >
            <Dashboard />
          </ProtectedLayout>
        } />

        <Route path="/zone-dashboard" element={
          <ProtectedLayout module="dashboard" user={user} authLoading={authLoading} onLogout={handleLogout} isSidebarCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen}>
            <ZoneDashboard user={user} />
          </ProtectedLayout>
        } />

        <Route path="/calendar" element={
          <ProtectedLayout 
            module="events"

            user={user} 
            authLoading={authLoading} 
            onLogout={handleLogout} 
            isSidebarCollapsed={isSidebarCollapsed} 
            toggleSidebar={toggleSidebar} 
            isMobileMenuOpen={isMobileMenuOpen} 
            setIsMobileMenuOpen={setIsMobileMenuOpen}
          >
            <Calendar user={user} />
          </ProtectedLayout>
        } />

        <Route path="/celebrations" element={
          <ProtectedLayout
            module="members"
            user={user}
            authLoading={authLoading}
            onLogout={handleLogout}
            isSidebarCollapsed={isSidebarCollapsed}
            toggleSidebar={toggleSidebar}
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
          >
            <Celebrations user={user} />
          </ProtectedLayout>
        } />
        
        <Route path="/members" element={
          <ProtectedLayout 
            module="members"

            user={user} 
            authLoading={authLoading} 
            onLogout={handleLogout} 
            isSidebarCollapsed={isSidebarCollapsed} 
            toggleSidebar={toggleSidebar} 
            isMobileMenuOpen={isMobileMenuOpen} 
            setIsMobileMenuOpen={setIsMobileMenuOpen}
          >
            <Members user={user} />
          </ProtectedLayout>
        } />

        <Route path="/zones" element={
          <ProtectedLayout 
            module="zones"

            user={user} 
            authLoading={authLoading} 
            onLogout={handleLogout} 
            isSidebarCollapsed={isSidebarCollapsed} 
            toggleSidebar={toggleSidebar} 
            isMobileMenuOpen={isMobileMenuOpen} 
            setIsMobileMenuOpen={setIsMobileMenuOpen}
          >
            <Zones />
          </ProtectedLayout>
        } />

        <Route path="/attendance" element={
          <ProtectedLayout 
            module="attendance"

            user={user} 
            authLoading={authLoading} 
            onLogout={handleLogout} 
            isSidebarCollapsed={isSidebarCollapsed} 
            toggleSidebar={toggleSidebar} 
            isMobileMenuOpen={isMobileMenuOpen} 
            setIsMobileMenuOpen={setIsMobileMenuOpen}
          >
            <Attendance user={user} />
          </ProtectedLayout>
        } />

        <Route path="/messaging" element={
          <ProtectedLayout 
            module="messaging"

            user={user} 
            authLoading={authLoading} 
            onLogout={handleLogout} 
            isSidebarCollapsed={isSidebarCollapsed} 
            toggleSidebar={toggleSidebar} 
            isMobileMenuOpen={isMobileMenuOpen} 
            setIsMobileMenuOpen={setIsMobileMenuOpen}
          >
            <Messaging user={user} />
          </ProtectedLayout>
        } />

        <Route path="/reports" element={
          <ProtectedLayout 
            module="reports"

            user={user} 
            authLoading={authLoading} 
            onLogout={handleLogout} 
            isSidebarCollapsed={isSidebarCollapsed} 
            toggleSidebar={toggleSidebar} 
            isMobileMenuOpen={isMobileMenuOpen} 
            setIsMobileMenuOpen={setIsMobileMenuOpen}
          >
            <Reports user={user} />
          </ProtectedLayout>
        } />

        <Route path="/settings" element={
          <ProtectedLayout 
            module="settings"

            user={user} 
            authLoading={authLoading} 
            onLogout={handleLogout} 
            isSidebarCollapsed={isSidebarCollapsed} 
            toggleSidebar={toggleSidebar} 
            isMobileMenuOpen={isMobileMenuOpen} 
            setIsMobileMenuOpen={setIsMobileMenuOpen}
          >
            <Settings />
          </ProtectedLayout>
        } />

        <Route path="/audit-logs" element={
          <ProtectedLayout 
            user={user} 
            authLoading={authLoading} 
            onLogout={handleLogout} 
            isSidebarCollapsed={isSidebarCollapsed} 
            toggleSidebar={toggleSidebar} 
            isMobileMenuOpen={isMobileMenuOpen} 
            setIsMobileMenuOpen={setIsMobileMenuOpen}
          >
            {user?.role === 'admin' ? <AuditLogs /> : <Navigate to="/" replace />}
          </ProtectedLayout>
        } />
        
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <ToastProvider>
        <AuthProvider>
          <DataProvider>
            <AppInner />
          </DataProvider>
        </AuthProvider>
      </ToastProvider>
    </HashRouter>
  );
};

export default App;

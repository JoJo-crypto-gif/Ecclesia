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
import KioskMode from './pages/KioskMode';
import { DataProvider, useData } from './context/DataContext';
import { User } from './types';
import ZoneDashboard from './pages/ZoneDashboard';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import MobileHeader from './components/MobileHeader';
import { useLocation } from 'react-router-dom';

// Protected Route Wrapper
interface ProtectedLayoutProps {
  children: React.ReactNode;
  roles?: Array<User['role']>;
  user: User | null;
  authLoading: boolean;
  onLogout: () => Promise<void>;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const ProtectedLayout: React.FC<ProtectedLayoutProps & { isMobileMenuOpen: boolean; setIsMobileMenuOpen: (o: boolean) => void }> = ({ 
  children, roles, user, authLoading, onLogout, isSidebarCollapsed, toggleSidebar, isMobileMenuOpen, setIsMobileMenuOpen
}) => {
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500">
        Loading...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to={user.role === 'zone_leader' ? '/zone-dashboard' : '/'} replace />;
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
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { refreshData, fetchMembers, fetchMessages, fetchSettings } = useData();
  const location = useLocation();

  // Close mobile menu on navigate
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogin = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data?.error?.message || 'Login failed' };
      }
      setUser(data.data);
      await Promise.all([refreshData(), fetchMembers(), fetchMessages(), fetchSettings()]);
      return { success: true, role: data.data.role };
    } catch {
      return { success: false, error: 'Login failed' };
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // ignore
    } finally {
      setUser(null);
    }
  };
  const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setUser(data.data);
            // Session restored — re-fetch all data now that we're authenticated
            await Promise.all([refreshData(), fetchMembers(), fetchMessages(), fetchSettings()]);
          }
        } else {
          setUser(null);
        }
      } finally {
        setAuthLoading(false);
      }
    };
    loadUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return (
    <Routes>
        <Route path="/login" element={
          user ? <Navigate to={user.role === 'zone_leader' ? '/zone-dashboard' : '/'} replace /> : <Login onLogin={handleLogin} />
        } />
        
        {/* Public Route for QR Check-in (Self-service via phone) */}
        <Route path="/check-in/:instanceId" element={<CheckIn />} />

        {/* Kiosk Mode (Ideally semi-protected, but separate route for full screen) */}
        <Route path="/kiosk/:instanceId" element={
          user ? <KioskMode /> : <Navigate to="/login" replace />
        } />

        {/* Protected Routes */}
        <Route path="/" element={
          <ProtectedLayout 
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
          <ProtectedLayout roles={['admin', 'zone_leader']} user={user} authLoading={authLoading} onLogout={handleLogout} isSidebarCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen}>
            <ZoneDashboard user={user} />
          </ProtectedLayout>
        } />

        <Route path="/calendar" element={
          <ProtectedLayout 
            roles={['admin', 'zone_leader']} 
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
            roles={['admin', 'zone_leader']}
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
            roles={['admin', 'zone_leader']} 
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
            roles={['admin']} 
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
            roles={['admin', 'zone_leader']} 
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
            roles={['admin', 'zone_leader']} 
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
            roles={['admin']} 
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
            roles={['admin', 'zone_leader']} 
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
        
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <DataProvider>
        <AppInner />
      </DataProvider>
    </HashRouter>
  );
};

export default App;

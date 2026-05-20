import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Map, LogOut, ChevronLeft, Moon, Sun, QrCode, MessageSquare, Calendar, Settings as SettingsIcon, Gift, FileBarChart, History } from 'lucide-react';
import { useData } from '../context/DataContext';
import Logo from './Logo';
import { User } from '../types';

interface SidebarProps {
  onLogout: () => void;
  isCollapsed: boolean;
  toggleSidebar: () => void;
  user: User;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onLogout, isCollapsed, toggleSidebar, user, isMobileOpen = false, onCloseMobile }) => {
  const { theme, toggleTheme, settings } = useData();
  const churchName = settings.church_name || 'Ecclesia';
  const churchLogo = settings.church_logo || '';
  const isAdmin = user.role === 'admin';
  const hasPermission = (module: string, action: 'read' | 'create' | 'edit' | 'delete' = 'read') => {
    if (isAdmin) return true;
    return user.permissions?.[module]?.[action] === true;
  };

  const displayName = user.name || user.email;
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'U';

  const navClasses = ({ isActive }: { isActive: boolean }) =>
    `group relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 ease-spring preserve-3d ${
      isActive 
        ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 translate-x-1' 
        : 'text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-0.5 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400 dark:hover:shadow-none'
    }`;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70] animate-in fade-in duration-300"
          onClick={onCloseMobile}
        />
      )}

      <div 
        className={`${
          isCollapsed ? 'lg:w-24' : 'lg:w-72'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } fixed lg:relative z-[80] lg:z-20 w-64 lg:flex-shrink-0 bg-slate-50/80 border-r border-slate-200/60 flex flex-col h-full backdrop-blur-xl dark:bg-slate-900/90 dark:border-slate-800 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]`}
      >
        {/* Toggle Button (Desktop only) */}
        <button 
          onClick={toggleSidebar}
          className="hidden lg:flex absolute -right-3 top-12 w-6 h-6 bg-white border border-slate-200 rounded-full items-center justify-center text-slate-500 hover:text-indigo-600 hover:scale-110 transition-all shadow-sm z-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
        >
          <ChevronLeft size={14} className={`transition-transform duration-500 ${isCollapsed ? 'rotate-180' : ''}`} />
        </button>

      {/* Header / Logo */}
      <div className={`p-6 pb-2 transition-all duration-500 ${isCollapsed ? 'items-center px-4' : ''}`}>
        <div className={`flex items-center gap-3 text-indigo-600 font-bold text-2xl tracking-tight dark:text-indigo-400 overflow-hidden whitespace-nowrap`}>
          <div className="flex items-center justify-center hover:rotate-6 transition-transform duration-300">
            <Logo size="md" overrideSrc={churchLogo} />
          </div>
          <span className={`transition-all duration-500 ${isCollapsed ? 'opacity-0 w-0 translate-x-10' : 'opacity-100 w-auto translate-x-0'}`}>
            {churchName}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-3 py-8 overflow-x-hidden">
        {!isCollapsed && (
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest px-4 mb-2 dark:text-slate-500 animate-enter">
                Menu
            </div>
        )}
        
        {hasPermission('dashboard') ? (
          <NavLink to="/" className={navClasses}>
            <LayoutDashboard size={22} className="min-w-[22px] transition-transform group-hover:scale-110 group-hover:rotate-3" />
            <span className={`font-medium whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>Dashboard</span>
            {isCollapsed && (
              <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap shadow-lg">
                  Dashboard
              </div>
            )}
          </NavLink>
        ) : (
          <NavLink to="/zone-dashboard" className={navClasses}>
            <LayoutDashboard size={22} className="min-w-[22px] transition-transform group-hover:scale-110 group-hover:rotate-3" />
            <span className={`font-medium whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>My Zone</span>
            {isCollapsed && (
              <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap shadow-lg">
                  My Zone
              </div>
            )}
          </NavLink>
        )}

        {hasPermission('events') && (
          <NavLink to="/calendar" className={navClasses}>
            <Calendar size={22} className="min-w-[22px] transition-transform group-hover:scale-110 group-hover:-rotate-3" />
            <span className={`font-medium whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>Calendar</span>
             {isCollapsed && (
              <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap shadow-lg">
                  Calendar
              </div>
            )}
          </NavLink>
        )}

        {hasPermission('members') && (
          <NavLink to="/celebrations" className={navClasses}>
            <Gift size={22} className="min-w-[22px] transition-transform group-hover:scale-110 group-hover:rotate-3" />
            <span className={`font-medium whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>Celebrations</span>
             {isCollapsed && (
              <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap shadow-lg">
                  Celebrations
              </div>
            )}
          </NavLink>
        )}

        {hasPermission('members') && (
          <NavLink to="/members" className={navClasses}>
            <Users size={22} className="min-w-[22px] transition-transform group-hover:scale-110 group-hover:-rotate-3" />
            <span className={`font-medium whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>Members</span>
             {isCollapsed && (
              <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap shadow-lg">
                  Members
              </div>
            )}
          </NavLink>
        )}

        {hasPermission('zones') && (
          <NavLink to="/zones" className={navClasses}>
            <Map size={22} className="min-w-[22px] transition-transform group-hover:scale-110 group-hover:rotate-3" />
            <span className={`font-medium whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>Zones</span>
             {isCollapsed && (
              <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap shadow-lg">
                  Zones
              </div>
            )}
          </NavLink>
        )}

        {hasPermission('attendance') && (
          <NavLink to="/attendance" className={navClasses}>
            <QrCode size={22} className="min-w-[22px] transition-transform group-hover:scale-110 group-hover:-rotate-3" />
            <span className={`font-medium whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>Attendance</span>
             {isCollapsed && (
              <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap shadow-lg">
                  Attendance
              </div>
            )}
          </NavLink>
        )}

        {hasPermission('messaging') && (
          <NavLink to="/messaging" className={navClasses}>
            <MessageSquare size={22} className="min-w-[22px] transition-transform group-hover:scale-110 group-hover:rotate-3" />
            <span className={`font-medium whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>Messaging</span>
             {isCollapsed && (
              <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap shadow-lg">
                  Messaging
              </div>
            )}
          </NavLink>
        )}

        {hasPermission('reports') && (
          <NavLink to="/reports" className={navClasses}>
            <FileBarChart size={22} className="min-w-[22px] transition-transform group-hover:scale-110 group-hover:-rotate-3" />
            <span className={`font-medium whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>Reports</span>
             {isCollapsed && (
              <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap shadow-lg">
                  Reports
              </div>
            )}
          </NavLink>
        )}

        {isAdmin && (
          <NavLink to="/audit-logs" className={navClasses}>
            <History size={22} className="min-w-[22px] transition-transform group-hover:scale-110 group-hover:rotate-3" />
            <span className={`font-medium whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>Audit Logs</span>
             {isCollapsed && (
              <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap shadow-lg">
                  Audit Logs
              </div>
            )}
          </NavLink>
        )}

        {hasPermission('settings') && (
          <NavLink to="/settings" className={navClasses}>
            <SettingsIcon size={22} className="min-w-[22px] transition-transform group-hover:scale-110 group-hover:rotate-3" />
            <span className={`font-medium whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>Settings</span>
             {isCollapsed && (
              <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap shadow-lg">
                  Settings
              </div>
            )}
          </NavLink>
        )}
      </nav>

      {/* Footer / User Profile */}
      <div className={`p-4 m-4 bg-white/50 backdrop-blur-sm rounded-3xl border border-slate-200/50 shadow-sm dark:bg-slate-950/50 dark:border-slate-800 transition-all duration-500 ${isCollapsed ? 'items-center justify-center p-2 m-2' : ''}`}>
        
        {/* Theme Toggle */}
        <div className={`flex items-center mb-4 transition-all duration-300 ${isCollapsed ? 'justify-center mb-0' : 'justify-between'}`}>
             {!isCollapsed && <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Theme</div>}
             <button 
                onClick={toggleTheme}
                className="relative p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all overflow-hidden w-10 h-10 flex items-center justify-center dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 hover:scale-105 active:scale-95 shadow-sm"
                title="Toggle Theme"
             >
                <div className="relative w-5 h-5">
                    <Sun 
                        size={20} 
                        className={`absolute inset-0 transition-all duration-500 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)] ${
                            theme === 'dark' ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
                        }`} 
                    />
                    <Moon 
                        size={20} 
                        className={`absolute inset-0 transition-all duration-500 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)] ${
                            theme === 'dark' ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
                        }`} 
                    />
                </div>
             </button>
        </div>

        {/* User Info (Hidden when collapsed) */}
        <div className={`flex items-center gap-3 mb-3 overflow-hidden transition-all duration-500 ${isCollapsed ? 'h-0 opacity-0 mb-0' : 'h-auto opacity-100'}`}>
          <div className="w-10 h-10 min-w-[2.5rem] rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-md transform hover:rotate-12 transition-transform">
            {initials}
          </div>
          <div className="whitespace-nowrap">
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{displayName}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{user.email}</div>
          </div>
        </div>

        {/* Logout Button */}
        <button 
          onClick={onLogout}
          className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-red-900/20 dark:hover:text-red-400 dark:hover:border-red-900/30 ${isCollapsed ? 'justify-center mt-2' : 'justify-center'}`}
          title="Sign Out"
        >
          <LogOut size={16} />
          <span className={`whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>Sign Out</span>
        </button>
      </div>
      </div>
    </>
  );
};

export default Sidebar;

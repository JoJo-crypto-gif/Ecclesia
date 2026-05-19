import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, PermissionSet } from '../types';
import { apiFetch } from '../utils/api';

interface AuthContextType {
  user: User | null;
  authLoading: boolean;
  login: (data: User) => void;
  logout: () => void;
  hasPermission: (module: string, action: keyof PermissionSet) => boolean;
  can: (module: string, action: keyof PermissionSet) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    apiFetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUser(data.data);
        }
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const login = (data: User) => setUser(data);
  const logout = () => setUser(null);

  const hasPermission = React.useCallback((module: string, action: keyof PermissionSet): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;

    const modulePerms = user.permissions?.[module];
    if (!modulePerms) return false;
    return !!modulePerms[action];
  }, [user]);

  const can = hasPermission;

  return (
    <AuthContext.Provider value={{ user, authLoading, login, logout, hasPermission, can }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

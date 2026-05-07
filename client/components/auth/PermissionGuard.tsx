import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { PermissionSet } from '../../types';

interface PermissionGuardProps {
  module: string;
  action: keyof PermissionSet;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({ module, action, children, fallback = null }) => {
  const { hasPermission } = useAuth();
  
  if (hasPermission(module, action)) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
};

export default PermissionGuard;

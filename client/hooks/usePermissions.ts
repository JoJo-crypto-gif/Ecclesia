import { useAuth } from '../context/AuthContext';

export const usePermissions = () => {
  const { can, hasPermission, user } = useAuth();
  return { can, hasPermission, user };
};

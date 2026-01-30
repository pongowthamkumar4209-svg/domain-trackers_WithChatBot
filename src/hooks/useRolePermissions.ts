import { useAuth } from '@/contexts/AuthContext';
import { ROLE_PERMISSIONS, AppRole } from '@/types/roles';

export function useRolePermissions() {
  const { userRole } = useAuth();
  
  const role = (userRole as AppRole) || 'viewer';
  const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.viewer;

  return {
    role,
    ...permissions,
    isAdmin: role === 'admin',
    isEditor: role === 'editor',
    isViewer: role === 'viewer',
  };
}

export type AppRole = 'admin' | 'editor' | 'viewer';

export const ROLE_PERMISSIONS = {
  admin: {
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canManageUsers: true,
    canUpload: true,
  },
  editor: {
    canCreate: true,
    canEdit: true,
    canDelete: false,
    canManageUsers: false,
    canUpload: true,
  },
  viewer: {
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canManageUsers: false,
    canUpload: false,
  },
} as const;

export type RolePermissions = typeof ROLE_PERMISSIONS[AppRole];

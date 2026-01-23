import { Permission, PermissionTarget, PermissionRole, UserRole } from '@/types';

const STORAGE_KEY = 'csm_permissions';

// Get all permissions
export const getPermissions = (): Permission[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

// Save all permissions
export const savePermissions = (permissions: Permission[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(permissions));
};

// Get permission for a specific target
export const getPermission = (targetType: PermissionTarget, targetId: string): Permission | null => {
  const permissions = getPermissions();
  return permissions.find(p => p.targetType === targetType && p.targetId === targetId) || null;
};

// Set permission for a target
export const setPermission = (
  targetType: PermissionTarget,
  targetId: string,
  role: PermissionRole,
  enabled: boolean = true
): Permission => {
  const permissions = getPermissions();
  const existingIndex = permissions.findIndex(p => p.targetType === targetType && p.targetId === targetId);
  
  const permission: Permission = {
    id: existingIndex >= 0 ? permissions[existingIndex].id : Date.now().toString(),
    targetType,
    targetId,
    role,
    enabled,
    createdAt: existingIndex >= 0 ? permissions[existingIndex].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  if (existingIndex >= 0) {
    permissions[existingIndex] = permission;
  } else {
    permissions.push(permission);
  }
  
  savePermissions(permissions);
  return permission;
};

// Remove permission for a target (restores default: all access)
export const removePermission = (targetType: PermissionTarget, targetId: string): void => {
  const permissions = getPermissions().filter(
    p => !(p.targetType === targetType && p.targetId === targetId)
  );
  savePermissions(permissions);
};

// Check if a user role can access a target
export const canAccess = (
  userRole: UserRole,
  targetType: PermissionTarget,
  targetId: string
): boolean => {
  const permission = getPermission(targetType, targetId);
  
  // No permission set = default to all access
  if (!permission) return true;
  
  // Disabled = no access for anyone except admin
  if (!permission.enabled) return userRole === 'admin';
  
  // Admin always has access
  if (userRole === 'admin') return true;
  
  // Check role-based access
  switch (permission.role) {
    case 'all':
      return true;
    case 'eleves':
      return userRole === 'eleve';
    case 'instructeurs':
      return userRole === 'instructeur';
    case 'none':
      return false;
    default:
      return true;
  }
};

// Get all permissions for a specific target type
export const getPermissionsByType = (targetType: PermissionTarget): Permission[] => {
  return getPermissions().filter(p => p.targetType === targetType);
};

// Bulk set permissions
export const setPermissionsBulk = (permissions: Omit<Permission, 'id' | 'createdAt' | 'updatedAt'>[]): void => {
  const existing = getPermissions();
  const now = new Date().toISOString();
  
  for (const perm of permissions) {
    const existingIndex = existing.findIndex(
      p => p.targetType === perm.targetType && p.targetId === perm.targetId
    );
    
    const newPerm: Permission = {
      id: existingIndex >= 0 ? existing[existingIndex].id : Date.now().toString() + Math.random().toString(36).substr(2, 5),
      ...perm,
      createdAt: existingIndex >= 0 ? existing[existingIndex].createdAt : now,
      updatedAt: now
    };
    
    if (existingIndex >= 0) {
      existing[existingIndex] = newPerm;
    } else {
      existing.push(newPerm);
    }
  }
  
  savePermissions(existing);
};

// Clear all permissions
export const clearAllPermissions = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

// Export permissions with data
export const exportPermissions = (): Permission[] => {
  return getPermissions();
};

// Import permissions
export const importPermissions = (permissions: Permission[], mode: 'replace' | 'merge' = 'replace'): void => {
  if (mode === 'replace') {
    savePermissions(permissions);
  } else {
    const existing = getPermissions();
    const merged = [...existing];
    
    for (const perm of permissions) {
      const existingIndex = merged.findIndex(
        p => p.targetType === perm.targetType && p.targetId === perm.targetId
      );
      if (existingIndex < 0) {
        merged.push(perm);
      }
    }
    
    savePermissions(merged);
  }
};

import { Permission, PermissionTarget, PermissionRole, UserRole } from '@/types';
import { getStages, getCourseTypes, getSportCourses, getCourseTitles, getFiles } from './storage';

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

// Get parent hierarchy for inheritance
const getParentChain = (targetType: PermissionTarget, targetId: string): { type: PermissionTarget; id: string }[] => {
  const chain: { type: PermissionTarget; id: string }[] = [];
  
  if (targetType === 'file') {
    const files = getFiles();
    const file = files.find(f => f.id === targetId);
    if (file) {
      chain.push({ type: 'heading', id: file.courseTitleId });
      // Get parent heading
      const titles = getCourseTitles();
      const title = titles.find(t => t.id === file.courseTitleId);
      if (title) {
        chain.push({ type: 'lecon', id: title.sportCourseId });
        // Get parent lecon
        const courses = getSportCourses();
        const course = courses.find(c => c.id === title.sportCourseId);
        if (course) {
          chain.push({ type: 'courseType', id: course.courseTypeId });
          chain.push({ type: 'stage', id: course.stageId });
        }
      }
    }
  } else if (targetType === 'heading') {
    const titles = getCourseTitles();
    const title = titles.find(t => t.id === targetId);
    if (title) {
      chain.push({ type: 'lecon', id: title.sportCourseId });
      const courses = getSportCourses();
      const course = courses.find(c => c.id === title.sportCourseId);
      if (course) {
        chain.push({ type: 'courseType', id: course.courseTypeId });
        chain.push({ type: 'stage', id: course.stageId });
      }
    }
  } else if (targetType === 'lecon') {
    const courses = getSportCourses();
    const course = courses.find(c => c.id === targetId);
    if (course) {
      chain.push({ type: 'courseType', id: course.courseTypeId });
      chain.push({ type: 'stage', id: course.stageId });
    }
  } else if (targetType === 'courseType') {
    // CourseType doesn't have a single parent stage, check if targetId contains stage info
    if (targetId.includes('-')) {
      const [stageId] = targetId.split('-');
      chain.push({ type: 'stage', id: stageId });
    }
  }
  
  return chain;
};

// Get effective permission with inheritance
export const getEffectivePermission = (
  targetType: PermissionTarget,
  targetId: string
): Permission | null => {
  // First check direct permission
  const directPerm = getPermission(targetType, targetId);
  if (directPerm) return directPerm;
  
  // Check parent chain for inherited permissions
  const parentChain = getParentChain(targetType, targetId);
  for (const parent of parentChain) {
    const parentPerm = getPermission(parent.type, parent.id);
    if (parentPerm) return { ...parentPerm, targetType, targetId }; // Inherited
  }
  
  return null;
};

// Check if a user role can access a target (with inheritance)
export const canAccess = (
  userRole: UserRole,
  targetType: PermissionTarget,
  targetId: string,
  stageId?: string
): boolean => {
  // Admin always has access
  if (userRole === 'admin') return true;
  
  // Convert 'user' mode to 'instructeur' for permission check
  const effectiveRole: UserRole = userRole === 'instructeur' ? 'instructeur' : userRole;
  
  // Check effective permission (with inheritance)
  const permission = getEffectivePermission(targetType, targetId);
  
  // No permission set = default to all access
  if (!permission) return true;
  
  // Disabled = no access for anyone except admin
  if (!permission.enabled) return false;
  
  // Check role-based access
  switch (permission.role) {
    case 'all':
      return true;
    case 'eleves':
      return effectiveRole === 'eleve';
    case 'instructeurs':
      return effectiveRole === 'instructeur';
    case 'none':
      return false;
    default:
      return true;
  }
};

// Check stage access with role targeting
export const canAccessStage = (
  userRole: UserRole,
  stageId: string
): boolean => {
  if (userRole === 'admin') return true;
  
  const stages = getStages();
  const stage = stages.find(s => s.id === stageId);
  
  // Stage not found or disabled globally
  if (!stage || !stage.enabled) return false;
  
  // Check disabledFor targeting
  if (stage.disabledFor) {
    const effectiveRole = userRole === 'instructeur' ? 'instructeurs' : userRole === 'eleve' ? 'eleves' : null;
    if (stage.disabledFor === 'all') return false;
    if (effectiveRole && stage.disabledFor === effectiveRole) return false;
  }
  
  // Check stage-level permission
  return canAccess(userRole, 'stage', stageId);
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

// Apply permission to all children (cascade)
export const applyPermissionToChildren = (
  targetType: PermissionTarget,
  targetId: string,
  role: PermissionRole,
  enabled: boolean
): number => {
  const permissionsToSet: Omit<Permission, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  
  if (targetType === 'stage') {
    // Get all courses for this stage
    const courses = getSportCourses().filter(c => c.stageId === targetId);
    for (const course of courses) {
      permissionsToSet.push({ targetType: 'lecon', targetId: course.id, role, enabled });
      
      // Get titles for this course
      const titles = getCourseTitles().filter(t => t.sportCourseId === course.id);
      for (const title of titles) {
        permissionsToSet.push({ targetType: 'heading', targetId: title.id, role, enabled });
        
        // Get files for this title
        const files = getFiles().filter(f => f.courseTitleId === title.id);
        for (const file of files) {
          permissionsToSet.push({ targetType: 'file', targetId: file.id, role, enabled });
        }
      }
    }
  } else if (targetType === 'lecon') {
    const titles = getCourseTitles().filter(t => t.sportCourseId === targetId);
    for (const title of titles) {
      permissionsToSet.push({ targetType: 'heading', targetId: title.id, role, enabled });
      const files = getFiles().filter(f => f.courseTitleId === title.id);
      for (const file of files) {
        permissionsToSet.push({ targetType: 'file', targetId: file.id, role, enabled });
      }
    }
  } else if (targetType === 'heading') {
    const files = getFiles().filter(f => f.courseTitleId === targetId);
    for (const file of files) {
      permissionsToSet.push({ targetType: 'file', targetId: file.id, role, enabled });
    }
  }
  
  if (permissionsToSet.length > 0) {
    setPermissionsBulk(permissionsToSet);
  }
  
  return permissionsToSet.length;
};

// Clear children permissions (reset to inherit)
export const clearChildrenPermissions = (
  targetType: PermissionTarget,
  targetId: string
): number => {
  const permissions = getPermissions();
  let count = 0;
  
  const shouldRemove = (p: Permission): boolean => {
    if (targetType === 'stage') {
      const courses = getSportCourses().filter(c => c.stageId === targetId);
      const courseIds = courses.map(c => c.id);
      if (p.targetType === 'lecon' && courseIds.includes(p.targetId)) return true;
      
      const titles = getCourseTitles().filter(t => courseIds.includes(t.sportCourseId));
      const titleIds = titles.map(t => t.id);
      if (p.targetType === 'heading' && titleIds.includes(p.targetId)) return true;
      
      const files = getFiles().filter(f => titleIds.includes(f.courseTitleId));
      if (p.targetType === 'file' && files.some(f => f.id === p.targetId)) return true;
    } else if (targetType === 'lecon') {
      const titles = getCourseTitles().filter(t => t.sportCourseId === targetId);
      const titleIds = titles.map(t => t.id);
      if (p.targetType === 'heading' && titleIds.includes(p.targetId)) return true;
      
      const files = getFiles().filter(f => titleIds.includes(f.courseTitleId));
      if (p.targetType === 'file' && files.some(f => f.id === p.targetId)) return true;
    } else if (targetType === 'heading') {
      const files = getFiles().filter(f => f.courseTitleId === targetId);
      if (p.targetType === 'file' && files.some(f => f.id === p.targetId)) return true;
    }
    return false;
  };
  
  const filtered = permissions.filter(p => {
    if (shouldRemove(p)) {
      count++;
      return false;
    }
    return true;
  });
  
  savePermissions(filtered);
  return count;
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

// Get permission stats
export const getPermissionStats = () => {
  const perms = getPermissions();
  return {
    total: perms.length,
    byRole: {
      all: perms.filter(p => p.role === 'all').length,
      eleves: perms.filter(p => p.role === 'eleves').length,
      instructeurs: perms.filter(p => p.role === 'instructeurs').length,
      none: perms.filter(p => p.role === 'none').length,
    },
    disabled: perms.filter(p => !p.enabled).length,
    byType: {
      stage: perms.filter(p => p.targetType === 'stage').length,
      courseType: perms.filter(p => p.targetType === 'courseType').length,
      lecon: perms.filter(p => p.targetType === 'lecon').length,
      heading: perms.filter(p => p.targetType === 'heading').length,
      file: perms.filter(p => p.targetType === 'file').length,
    }
  };
};

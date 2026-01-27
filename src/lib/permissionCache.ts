/**
 * Permission Cache - Optimized permission checking with in-memory caching
 * Reduces localStorage reads and O(n) lookups for low-hardware performance
 */

import { Permission, PermissionTarget, PermissionRole, UserRole } from '@/types';

const STORAGE_KEY = 'csm_permissions';

// In-memory cache
let permissionMap: Map<string, Permission> | null = null;
let cacheVersion = 0;

// Entity caches for parent chain lookups
let stagesCache: Map<string, any> | null = null;
let coursesCache: Map<string, any> | null = null;
let titlesCache: Map<string, any> | null = null;
let filesCache: Map<string, any> | null = null;

// Create composite key for permission lookup
const makeKey = (type: PermissionTarget, id: string) => `${type}:${id}`;

// Initialize or refresh the permission cache
export const initPermissionCache = (): Map<string, Permission> => {
  if (permissionMap) return permissionMap;
  
  const data = localStorage.getItem(STORAGE_KEY);
  const permissions: Permission[] = data ? JSON.parse(data) : [];
  
  permissionMap = new Map();
  for (const p of permissions) {
    permissionMap.set(makeKey(p.targetType, p.targetId), p);
  }
  
  return permissionMap;
};

// Invalidate cache (call after any permission change)
export const invalidatePermissionCache = (): void => {
  permissionMap = null;
  cacheVersion++;
};

// Invalidate entity caches (call after data changes)
export const invalidateEntityCaches = (): void => {
  stagesCache = null;
  coursesCache = null;
  titlesCache = null;
  filesCache = null;
};

// Build entity caches for O(1) lookups
export const buildEntityCaches = (
  stages: any[],
  courses: any[],
  titles: any[],
  files: any[]
): void => {
  stagesCache = new Map(stages.map(s => [s.id, s]));
  coursesCache = new Map(courses.map(c => [c.id, c]));
  titlesCache = new Map(titles.map(t => [t.id, t]));
  filesCache = new Map(files.map(f => [f.id, f]));
};

// Get cached permission (O(1) lookup)
export const getCachedPermission = (type: PermissionTarget, id: string): Permission | null => {
  const cache = initPermissionCache();
  return cache.get(makeKey(type, id)) || null;
};

// Get parent chain using cached entity lookups
const getParentChainCached = (
  targetType: PermissionTarget,
  targetId: string
): { type: PermissionTarget; id: string }[] => {
  const chain: { type: PermissionTarget; id: string }[] = [];
  
  if (!filesCache || !titlesCache || !coursesCache) {
    // Fallback: load from storage
    const { getFiles, getCourseTitles, getSportCourses } = require('./storage');
    buildEntityCaches([], getSportCourses(), getCourseTitles(), getFiles());
  }
  
  if (targetType === 'file') {
    const file = filesCache?.get(targetId);
    if (file) {
      chain.push({ type: 'heading', id: file.courseTitleId });
      const title = titlesCache?.get(file.courseTitleId);
      if (title) {
        chain.push({ type: 'lecon', id: title.sportCourseId });
        const course = coursesCache?.get(title.sportCourseId);
        if (course) {
          chain.push({ type: 'courseType', id: course.courseTypeId });
          chain.push({ type: 'stage', id: course.stageId });
        }
      }
    }
  } else if (targetType === 'heading') {
    const title = titlesCache?.get(targetId);
    if (title) {
      chain.push({ type: 'lecon', id: title.sportCourseId });
      const course = coursesCache?.get(title.sportCourseId);
      if (course) {
        chain.push({ type: 'courseType', id: course.courseTypeId });
        chain.push({ type: 'stage', id: course.stageId });
      }
    }
  } else if (targetType === 'lecon') {
    const course = coursesCache?.get(targetId);
    if (course) {
      chain.push({ type: 'courseType', id: course.courseTypeId });
      chain.push({ type: 'stage', id: course.stageId });
    }
  } else if (targetType === 'courseType' && targetId.includes('-')) {
    const [stageId] = targetId.split('-');
    chain.push({ type: 'stage', id: stageId });
  }
  
  return chain;
};

// Get effective permission with caching (replaces getEffectivePermission)
export const getEffectivePermissionCached = (
  type: PermissionTarget,
  id: string
): Permission | null => {
  // Direct permission check
  const direct = getCachedPermission(type, id);
  if (direct) return direct;
  
  // Check parent chain for inherited permissions
  const chain = getParentChainCached(type, id);
  for (const parent of chain) {
    const parentPerm = getCachedPermission(parent.type, parent.id);
    if (parentPerm) return { ...parentPerm, targetType: type, targetId: id };
  }
  
  return null;
};

// Fast access check with caching
export const canAccessCached = (
  userRole: UserRole,
  targetType: PermissionTarget,
  targetId: string
): boolean => {
  // Admin always has access
  if (userRole === 'admin') return true;
  
  const effectiveRole: UserRole = userRole === 'instructeur' ? 'instructeur' : userRole;
  const permission = getEffectivePermissionCached(targetType, targetId);
  
  // No permission = default to all access
  if (!permission) return true;
  
  // Disabled = no access
  if (!permission.enabled) return false;
  
  // Role check
  switch (permission.role) {
    case 'all': return true;
    case 'eleves': return effectiveRole === 'eleve';
    case 'instructeurs': return effectiveRole === 'instructeur';
    case 'none': return false;
    default: return true;
  }
};

// Fast stage access check
export const canAccessStageCached = (
  userRole: UserRole,
  stageId: string,
  stage?: any
): boolean => {
  if (userRole === 'admin') return true;
  
  // Get stage from cache if not provided
  if (!stage && stagesCache) {
    stage = stagesCache.get(stageId);
  }
  
  // Stage not found or disabled
  if (!stage || !stage.enabled) return false;
  
  // Check disabledFor targeting
  if (stage.disabledFor) {
    const effectiveRole = userRole === 'instructeur' ? 'instructeurs' : userRole === 'eleve' ? 'eleves' : null;
    if (stage.disabledFor === 'all') return false;
    if (effectiveRole && stage.disabledFor === effectiveRole) return false;
  }
  
  return canAccessCached(userRole, 'stage', stageId);
};

// Batch access check for filtering arrays efficiently
export const filterAccessible = <T extends { id: string }>(
  items: T[],
  userRole: UserRole,
  targetType: PermissionTarget,
  getId?: (item: T) => string
): T[] => {
  if (userRole === 'admin') return items;
  
  return items.filter(item => {
    const id = getId ? getId(item) : item.id;
    return canAccessCached(userRole, targetType, id);
  });
};

// Get cache version (for React dependencies)
export const getCacheVersion = () => cacheVersion;

// Save permission and invalidate cache
export const setPermissionCached = (
  targetType: PermissionTarget,
  targetId: string,
  role: PermissionRole,
  enabled: boolean = true
): Permission => {
  const data = localStorage.getItem(STORAGE_KEY);
  const permissions: Permission[] = data ? JSON.parse(data) : [];
  const existingIndex = permissions.findIndex(
    p => p.targetType === targetType && p.targetId === targetId
  );
  
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
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(permissions));
  invalidatePermissionCache();
  
  return permission;
};

// Remove permission and invalidate cache
export const removePermissionCached = (targetType: PermissionTarget, targetId: string): void => {
  const data = localStorage.getItem(STORAGE_KEY);
  const permissions: Permission[] = data ? JSON.parse(data) : [];
  const filtered = permissions.filter(
    p => !(p.targetType === targetType && p.targetId === targetId)
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  invalidatePermissionCache();
};

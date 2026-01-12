// Permanence App Storage - localStorage & IndexedDB utilities
import { Soldier, PermanenceRecord, PermanenceSettings, Grade, PermanenceUserMode } from '@/types/permanence';

// Storage Keys
const STORAGE_KEYS = {
  SOLDIERS: 'permanence_soldiers',
  RECORDS: 'permanence_records',
  SETTINGS: 'permanence_settings',
  USER_MODE: 'permanence_user_mode',
  CURRENT_CHEF: 'permanence_current_chef',
} as const;

// Default Settings
const DEFAULT_SETTINGS: PermanenceSettings = {
  lastRotationDate: '',
  rotationHour: 8,
  adminPassword: 'admin123',
  userPassword: 'user123',
};

// ============ UTILITY FUNCTIONS ============

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

const getCurrentHour = (): number => {
  return new Date().getHours();
};

// ============ SOLDIERS MANAGEMENT ============

export const getSoldiers = (): Soldier[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SOLDIERS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveSoldiers = (soldiers: Soldier[]): void => {
  localStorage.setItem(STORAGE_KEYS.SOLDIERS, JSON.stringify(soldiers));
};

export const addSoldier = (soldier: Omit<Soldier, 'id' | 'createdAt' | 'isActive'>): Soldier => {
  const soldiers = getSoldiers();
  const newSoldier: Soldier = {
    ...soldier,
    id: generateId(),
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  soldiers.push(newSoldier);
  saveSoldiers(soldiers);
  return newSoldier;
};

export const updateSoldier = (id: string, updates: Partial<Soldier>): void => {
  const soldiers = getSoldiers();
  const index = soldiers.findIndex(s => s.id === id);
  if (index !== -1) {
    soldiers[index] = { ...soldiers[index], ...updates };
    saveSoldiers(soldiers);
  }
};

export const deleteSoldier = (id: string): void => {
  const soldiers = getSoldiers().filter(s => s.id !== id);
  saveSoldiers(soldiers);
  // Also remove any permanence records for this soldier
  const records = getPermanenceRecords().filter(r => r.soldierId !== id);
  savePermanenceRecords(records);
};

export const getActiveSoldiers = (): Soldier[] => {
  return getSoldiers().filter(s => s.isActive);
};

export const toggleSoldierActive = (id: string): void => {
  const soldiers = getSoldiers();
  const index = soldiers.findIndex(s => s.id === id);
  if (index !== -1) {
    soldiers[index].isActive = !soldiers[index].isActive;
    saveSoldiers(soldiers);
  }
};

// ============ PERMANENCE RECORDS ============

export const getPermanenceRecords = (): PermanenceRecord[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.RECORDS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const savePermanenceRecords = (records: PermanenceRecord[]): void => {
  localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
};

export const getTodayPermanence = (): PermanenceRecord | null => {
  const today = getTodayDateString();
  const records = getPermanenceRecords();
  return records.find(r => r.visionnement === today) || null;
};

export const getPermanenceByDate = (date: string): PermanenceRecord | null => {
  const records = getPermanenceRecords();
  return records.find(r => r.visionnement === date) || null;
};

export const addPermanenceRecord = (record: Omit<PermanenceRecord, 'id' | 'createdAt'>): PermanenceRecord => {
  const records = getPermanenceRecords();
  // Remove existing record for the same date if exists
  const filteredRecords = records.filter(r => r.visionnement !== record.visionnement);
  
  const newRecord: PermanenceRecord = {
    ...record,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  
  filteredRecords.push(newRecord);
  savePermanenceRecords(filteredRecords);
  
  // Update soldier's last permanence date
  updateSoldier(record.soldierId, { lastPermanenceDate: record.visionnement });
  
  return newRecord;
};

export const updatePermanenceRecord = (id: string, updates: Partial<PermanenceRecord>): void => {
  const records = getPermanenceRecords();
  const index = records.findIndex(r => r.id === id);
  if (index !== -1) {
    records[index] = { ...records[index], ...updates };
    savePermanenceRecords(records);
  }
};

// ============ CHEF ROTATION LOGIC ============

/**
 * Select the next chef for permanence
 * Priority: Soldiers who haven't had permanence recently
 * Random selection among those with oldest/no permanence date
 */
export const selectNextChef = (): Soldier | null => {
  const activeSoldiers = getActiveSoldiers();
  
  if (activeSoldiers.length === 0) return null;
  if (activeSoldiers.length === 1) return activeSoldiers[0];
  
  // Sort by last permanence date (null/undefined first, then oldest)
  const sorted = [...activeSoldiers].sort((a, b) => {
    if (!a.lastPermanenceDate && !b.lastPermanenceDate) return 0;
    if (!a.lastPermanenceDate) return -1;
    if (!b.lastPermanenceDate) return 1;
    return new Date(a.lastPermanenceDate).getTime() - new Date(b.lastPermanenceDate).getTime();
  });
  
  // Get soldiers with the oldest/no permanence date
  const oldestDate = sorted[0].lastPermanenceDate;
  const eligibleSoldiers = sorted.filter(s => s.lastPermanenceDate === oldestDate);
  
  // Random selection from eligible soldiers
  const randomIndex = Math.floor(Math.random() * eligibleSoldiers.length);
  return eligibleSoldiers[randomIndex];
};

/**
 * Check and perform rotation if needed
 * Returns the current chef for today
 */
export const checkAndRotate = (): { chef: Soldier | null; record: PermanenceRecord | null } => {
  const settings = getSettings();
  const today = getTodayDateString();
  const currentHour = getCurrentHour();
  
  // Check if we already have a permanence for today
  let todayRecord = getTodayPermanence();
  
  if (todayRecord) {
    const chef = getSoldiers().find(s => s.id === todayRecord!.soldierId) || null;
    return { chef, record: todayRecord };
  }
  
  // Check if it's time to rotate (past rotation hour)
  if (currentHour >= settings.rotationHour) {
    const nextChef = selectNextChef();
    
    if (nextChef) {
      todayRecord = addPermanenceRecord({
        visionnement: today,
        soldierId: nextChef.id,
        wasSkipped: false,
        assignedBy: 'system',
      });
      
      // Update last rotation date
      saveSettings({ ...settings, lastRotationDate: today });
      
      return { chef: nextChef, record: todayRecord };
    }
  }
  
  return { chef: null, record: null };
};

/**
 * Skip current chef and select a new one
 */
export const skipCurrentChef = (note?: string): { chef: Soldier | null; record: PermanenceRecord | null } => {
  const today = getTodayDateString();
  const currentRecord = getTodayPermanence();
  
  if (currentRecord) {
    // Mark current as skipped
    updatePermanenceRecord(currentRecord.id, { wasSkipped: true, note: note || 'Skipped by admin' });
  }
  
  // Get active soldiers excluding the current one
  const activeSoldiers = getActiveSoldiers();
  const currentChefId = currentRecord?.soldierId;
  const eligibleSoldiers = activeSoldiers.filter(s => s.id !== currentChefId);
  
  if (eligibleSoldiers.length === 0) {
    return { chef: null, record: null };
  }
  
  // Select random from eligible
  const randomIndex = Math.floor(Math.random() * eligibleSoldiers.length);
  const newChef = eligibleSoldiers[randomIndex];
  
  const newRecord = addPermanenceRecord({
    visionnement: today,
    soldierId: newChef.id,
    wasSkipped: false,
    assignedBy: 'admin',
    note: 'Assigned after skip',
  });
  
  return { chef: newChef, record: newRecord };
};

/**
 * Manually assign a specific soldier for a date
 */
export const assignChefForDate = (soldierId: string, date: string, note?: string): PermanenceRecord => {
  return addPermanenceRecord({
    visionnement: date,
    soldierId,
    wasSkipped: false,
    assignedBy: 'admin',
    note,
  });
};

// ============ SETTINGS ============

export const getSettings = (): PermanenceSettings => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings: PermanenceSettings): void => {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
};

// ============ AUTHENTICATION ============

export const verifyAdminPassword = (password: string): boolean => {
  return password === getSettings().adminPassword;
};

export const verifyUserPassword = (password: string): boolean => {
  return password === getSettings().userPassword;
};

export const setAdminPassword = (password: string): void => {
  const settings = getSettings();
  saveSettings({ ...settings, adminPassword: password });
};

export const setUserPassword = (password: string): void => {
  const settings = getSettings();
  saveSettings({ ...settings, userPassword: password });
};

export const getUserMode = (): PermanenceUserMode => {
  return localStorage.getItem(STORAGE_KEYS.USER_MODE) as PermanenceUserMode;
};

export const setUserMode = (mode: 'admin' | 'user'): void => {
  localStorage.setItem(STORAGE_KEYS.USER_MODE, mode);
};

export const clearUserMode = (): void => {
  localStorage.removeItem(STORAGE_KEYS.USER_MODE);
};

// ============ HISTORY ============

export const getPermanenceHistory = (limit?: number): Array<PermanenceRecord & { soldier: Soldier | null }> => {
  const records = getPermanenceRecords();
  const soldiers = getSoldiers();
  
  const enriched = records
    .map(record => ({
      ...record,
      soldier: soldiers.find(s => s.id === record.soldierId) || null,
    }))
    .sort((a, b) => new Date(b.visionnement).getTime() - new Date(a.visionnement).getTime());
  
  return limit ? enriched.slice(0, limit) : enriched;
};

// ============ STATISTICS ============

export const getStatistics = () => {
  const soldiers = getSoldiers();
  const records = getPermanenceRecords();
  const activeSoldiers = soldiers.filter(s => s.isActive);
  
  const permanenceCount: Record<string, number> = {};
  soldiers.forEach(s => {
    permanenceCount[s.id] = records.filter(r => r.soldierId === s.id && !r.wasSkipped).length;
  });
  
  return {
    totalSoldiers: soldiers.length,
    activeSoldiers: activeSoldiers.length,
    totalPermanences: records.filter(r => !r.wasSkipped).length,
    skippedCount: records.filter(r => r.wasSkipped).length,
    permanenceCount,
  };
};

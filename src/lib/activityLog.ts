/**
 * Activity Log - Track user sessions, page visits, and file views
 * Stores in localStorage for offline support
 */

export interface ActivitySession {
  id: string;
  userId: string;
  userType: 'admin' | 'instructeur' | 'eleve';
  userName?: string;
  startTime: string;
  endTime?: string;
  duration?: number; // in seconds
  pageViews: PageView[];
  fileViews: FileView[];
}

export interface PageView {
  path: string;
  title: string;
  timestamp: string;
  duration?: number; // seconds spent on page
}

export interface FileView {
  fileId: string;
  fileName: string;
  fileType: string;
  coursePath: string; // stage > type > leçon
  timestamp: string;
  action: 'view' | 'download';
}

const STORAGE_KEY = 'csm_activity_log';
const CURRENT_SESSION_KEY = 'csm_current_session';
const MAX_SESSIONS = 100; // Keep last 100 sessions

// Get all sessions
export const getActivitySessions = (): ActivitySession[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

// Save sessions
const saveSessions = (sessions: ActivitySession[]): void => {
  // Keep only last MAX_SESSIONS
  const trimmed = sessions.slice(-MAX_SESSIONS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
};

// Get current session
export const getCurrentSession = (): ActivitySession | null => {
  const data = localStorage.getItem(CURRENT_SESSION_KEY);
  return data ? JSON.parse(data) : null;
};

// Save current session
const saveCurrentSession = (session: ActivitySession): void => {
  localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
};

// Start a new session
export const startSession = (
  userId: string,
  userType: 'admin' | 'instructeur' | 'eleve',
  userName?: string
): ActivitySession => {
  const session: ActivitySession = {
    id: Date.now().toString(),
    userId,
    userType,
    userName,
    startTime: new Date().toISOString(),
    pageViews: [],
    fileViews: []
  };
  
  saveCurrentSession(session);
  return session;
};

// End current session
export const endSession = (): void => {
  const session = getCurrentSession();
  if (!session) return;
  
  const endTime = new Date().toISOString();
  const startMs = new Date(session.startTime).getTime();
  const endMs = new Date(endTime).getTime();
  const duration = Math.round((endMs - startMs) / 1000);
  
  const completedSession: ActivitySession = {
    ...session,
    endTime,
    duration
  };
  
  // Add to history
  const sessions = getActivitySessions();
  sessions.push(completedSession);
  saveSessions(sessions);
  
  // Clear current
  localStorage.removeItem(CURRENT_SESSION_KEY);
};

// Log page view
export const logPageView = (path: string, title: string): void => {
  const session = getCurrentSession();
  if (!session) return;
  
  // Calculate duration of previous page
  if (session.pageViews.length > 0) {
    const lastView = session.pageViews[session.pageViews.length - 1];
    const lastMs = new Date(lastView.timestamp).getTime();
    const nowMs = Date.now();
    lastView.duration = Math.round((nowMs - lastMs) / 1000);
  }
  
  session.pageViews.push({
    path,
    title,
    timestamp: new Date().toISOString()
  });
  
  saveCurrentSession(session);
};

// Log file view/download
export const logFileView = (
  fileId: string,
  fileName: string,
  fileType: string,
  coursePath: string,
  action: 'view' | 'download' = 'view'
): void => {
  const session = getCurrentSession();
  if (!session) return;
  
  session.fileViews.push({
    fileId,
    fileName,
    fileType,
    coursePath,
    timestamp: new Date().toISOString(),
    action
  });
  
  saveCurrentSession(session);
};

// Get sessions for a date range
export const getSessionsByDateRange = (
  startDate: Date,
  endDate: Date
): ActivitySession[] => {
  const sessions = getActivitySessions();
  return sessions.filter(s => {
    const sessionDate = new Date(s.startTime);
    return sessionDate >= startDate && sessionDate <= endDate;
  });
};

// Get sessions by user type
export const getSessionsByUserType = (
  userType: 'admin' | 'instructeur' | 'eleve'
): ActivitySession[] => {
  return getActivitySessions().filter(s => s.userType === userType);
};

// Get activity statistics
export const getActivityStats = () => {
  const sessions = getActivitySessions();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todaySessions = sessions.filter(s => new Date(s.startTime) >= today);
  const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const totalFileViews = sessions.reduce((sum, s) => sum + s.fileViews.length, 0);
  const totalPageViews = sessions.reduce((sum, s) => sum + s.pageViews.length, 0);
  
  // Most viewed files
  const fileViewCounts: Record<string, { name: string; count: number }> = {};
  for (const session of sessions) {
    for (const fv of session.fileViews) {
      if (!fileViewCounts[fv.fileId]) {
        fileViewCounts[fv.fileId] = { name: fv.fileName, count: 0 };
      }
      fileViewCounts[fv.fileId].count++;
    }
  }
  
  const topFiles = Object.entries(fileViewCounts)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10)
    .map(([id, data]) => ({ id, ...data }));
  
  return {
    totalSessions: sessions.length,
    todaySessions: todaySessions.length,
    totalDurationSeconds: totalDuration,
    avgSessionDuration: sessions.length > 0 ? Math.round(totalDuration / sessions.length) : 0,
    totalFileViews,
    totalPageViews,
    topFiles,
    byUserType: {
      admin: sessions.filter(s => s.userType === 'admin').length,
      instructeur: sessions.filter(s => s.userType === 'instructeur').length,
      eleve: sessions.filter(s => s.userType === 'eleve').length
    }
  };
};

// Clear all activity logs
export const clearActivityLog = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(CURRENT_SESSION_KEY);
};

// Export activity log as JSON
export const exportActivityLog = (): string => {
  const sessions = getActivitySessions();
  return JSON.stringify(sessions, null, 2);
};

// Format duration for display
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
};

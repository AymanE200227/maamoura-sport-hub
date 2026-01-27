import { useState, useMemo } from 'react';
import { 
  Activity, Clock, User, FileText, Download, Trash2, 
  Calendar, Filter, ChevronDown, ChevronRight, Eye
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  getActivitySessions,
  getActivityStats,
  clearActivityLog,
  exportActivityLog,
  formatDuration,
  ActivitySession
} from '@/lib/activityLog';
import { useToast } from '@/hooks/use-toast';

interface SessionItemProps {
  session: ActivitySession;
  expanded: boolean;
  onToggle: () => void;
}

const userTypeLabels = {
  admin: 'Admin',
  instructeur: 'Instructeur',
  eleve: 'Élève'
};

const userTypeColors = {
  admin: 'bg-red-500/20 text-red-400',
  instructeur: 'bg-amber-500/20 text-amber-400',
  eleve: 'bg-blue-500/20 text-blue-400'
};

const SessionItem = ({ session, expanded, onToggle }: SessionItemProps) => {
  const startDate = new Date(session.startTime);
  const formattedDate = startDate.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const formattedTime = startDate.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors"
      >
        <span className="text-muted-foreground">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>
        
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${userTypeColors[session.userType]}`}>
          {userTypeLabels[session.userType]}
        </span>
        
        <div className="flex-1 text-left">
          <span className="text-sm font-medium">
            {session.userName || session.userId}
          </span>
        </div>
        
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formattedDate} {formattedTime}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {session.duration ? formatDuration(session.duration) : 'En cours'}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {session.pageViews.length} pages
          </span>
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {session.fileViews.length} fichiers
          </span>
        </div>
      </button>
      
      {expanded && (
        <div className="border-t border-border/50 bg-muted/20 p-3 space-y-3">
          {/* Page Views */}
          {session.pageViews.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <Eye className="w-3 h-3" /> Pages visitées
              </h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {session.pageViews.map((pv, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs bg-muted/30 px-2 py-1 rounded">
                    <span className="truncate flex-1">{pv.title || pv.path}</span>
                    <span className="text-muted-foreground shrink-0 ml-2">
                      {pv.duration ? formatDuration(pv.duration) : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* File Views */}
          {session.fileViews.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <FileText className="w-3 h-3" /> Fichiers consultés
              </h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {session.fileViews.map((fv, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs bg-muted/30 px-2 py-1 rounded">
                    <span className="truncate flex-1">{fv.fileName}</span>
                    <span className={`shrink-0 ml-2 px-1.5 py-0.5 rounded text-[10px] ${
                      fv.action === 'download' ? 'bg-blue-500/20 text-blue-400' : 'bg-muted text-muted-foreground'
                    }`}>
                      {fv.action === 'download' ? 'Téléchargé' : 'Consulté'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {session.pageViews.length === 0 && session.fileViews.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Aucune activité enregistrée
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default function ActivityLogSection() {
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'admin' | 'instructeur' | 'eleve'>('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week');
  
  const sessions = useMemo(() => {
    let all = getActivitySessions();
    
    // Filter by user type
    if (filterType !== 'all') {
      all = all.filter(s => s.userType === filterType);
    }
    
    // Filter by date
    const now = new Date();
    if (dateRange === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      all = all.filter(s => new Date(s.startTime) >= today);
    } else if (dateRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      all = all.filter(s => new Date(s.startTime) >= weekAgo);
    } else if (dateRange === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      all = all.filter(s => new Date(s.startTime) >= monthAgo);
    }
    
    // Sort by most recent
    return all.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [filterType, dateRange]);
  
  const stats = useMemo(() => getActivityStats(), []);
  
  const handleExport = () => {
    const data = exportActivityLog();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-log-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Export réussi', description: 'Le journal a été téléchargé' });
  };
  
  const handleClear = () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer tout l\'historique ?')) {
      clearActivityLog();
      toast({ title: 'Historique supprimé' });
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <User className="w-4 h-4" />
            <span className="text-xs">Sessions totales</span>
          </div>
          <p className="text-2xl font-bold">{stats.totalSessions}</p>
        </div>
        <div className="glass-card p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Activity className="w-4 h-4" />
            <span className="text-xs">Aujourd'hui</span>
          </div>
          <p className="text-2xl font-bold">{stats.todaySessions}</p>
        </div>
        <div className="glass-card p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs">Durée moyenne</span>
          </div>
          <p className="text-2xl font-bold">{formatDuration(stats.avgSessionDuration)}</p>
        </div>
        <div className="glass-card p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <FileText className="w-4 h-4" />
            <span className="text-xs">Fichiers vus</span>
          </div>
          <p className="text-2xl font-bold">{stats.totalFileViews}</p>
        </div>
      </div>
      
      {/* Filters & Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          
          {/* User Type Filter */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as any)}
            className="text-sm bg-muted border border-border rounded-lg px-3 py-1.5"
          >
            <option value="all">Tous les utilisateurs</option>
            <option value="admin">Admins</option>
            <option value="instructeur">Instructeurs</option>
            <option value="eleve">Élèves</option>
          </select>
          
          {/* Date Filter */}
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value as any)}
            className="text-sm bg-muted border border-border rounded-lg px-3 py-1.5"
          >
            <option value="today">Aujourd'hui</option>
            <option value="week">7 derniers jours</option>
            <option value="month">30 derniers jours</option>
            <option value="all">Tout l'historique</option>
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Exporter
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Effacer
          </button>
        </div>
      </div>
      
      {/* Sessions List */}
      <ScrollArea className="h-[400px] pr-2">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Activity className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-sm">Aucune session enregistrée</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map(session => (
              <SessionItem
                key={session.id}
                session={session}
                expanded={expandedId === session.id}
                onToggle={() => setExpandedId(expandedId === session.id ? null : session.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts';
import {
  Users,
  FileText,
  Clock,
  Activity,
  Eye,
  Download,
  TrendingUp,
  Monitor,
} from 'lucide-react';
import {
  getActivitySessions,
  getCurrentSession,
  getActivityStats,
  formatDuration,
  ActivitySession,
} from '@/lib/activityLog';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

const LiveActivityDashboard = () => {
  const [stats, setStats] = useState(getActivityStats());
  const [currentSession, setCurrentSession] = useState<ActivitySession | null>(null);
  const [recentSessions, setRecentSessions] = useState<ActivitySession[]>([]);
  const [hourlyData, setHourlyData] = useState<{ hour: string; sessions: number; views: number }[]>([]);

  // Refresh data every 5 seconds for live updates
  useEffect(() => {
    const updateData = () => {
      setStats(getActivityStats());
      setCurrentSession(getCurrentSession());
      
      const sessions = getActivitySessions();
      setRecentSessions(sessions.slice(-10).reverse());
      
      // Build hourly activity data for the last 24 hours
      const now = new Date();
      const hourlyMap: Record<string, { sessions: number; views: number }> = {};
      
      for (let i = 23; i >= 0; i--) {
        const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
        const key = hour.getHours().toString().padStart(2, '0') + 'h';
        hourlyMap[key] = { sessions: 0, views: 0 };
      }
      
      sessions.forEach(session => {
        const sessionDate = new Date(session.startTime);
        const hoursDiff = Math.floor((now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60));
        if (hoursDiff < 24) {
          const key = sessionDate.getHours().toString().padStart(2, '0') + 'h';
          if (hourlyMap[key]) {
            hourlyMap[key].sessions++;
            hourlyMap[key].views += session.fileViews.length;
          }
        }
      });
      
      setHourlyData(Object.entries(hourlyMap).map(([hour, data]) => ({
        hour,
        sessions: data.sessions,
        views: data.views,
      })));
    };

    updateData();
    const interval = setInterval(updateData, 5000);
    return () => clearInterval(interval);
  }, []);

  const userTypeData = [
    { name: 'Admin', value: stats.byUserType.admin, fill: 'hsl(var(--primary))' },
    { name: 'Instructeur', value: stats.byUserType.instructeur, fill: 'hsl(var(--secondary))' },
    { name: 'Élève', value: stats.byUserType.eleve, fill: 'hsl(var(--accent))' },
  ].filter(d => d.value > 0);

  const chartConfig = {
    sessions: { label: 'Sessions', color: 'hsl(var(--primary))' },
    views: { label: 'Fichiers vus', color: 'hsl(var(--secondary))' },
  };

  return (
    <div className="space-y-6">
      {/* Live indicator */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
        <span className="text-sm text-muted-foreground">Tableau de bord en temps réel</span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalSessions}</p>
                <p className="text-xs text-muted-foreground">Sessions totales</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Activity className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.todaySessions}</p>
                <p className="text-xs text-muted-foreground">Aujourd'hui</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalFileViews}</p>
                <p className="text-xs text-muted-foreground">Fichiers consultés</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatDuration(stats.avgSessionDuration)}</p>
                <p className="text-xs text-muted-foreground">Durée moyenne</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Activity Timeline */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Activité des dernières 24h
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <LineChart data={hourlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <XAxis 
                  dataKey="hour" 
                  tick={{ fontSize: 10 }} 
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 10 }} 
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="sessions" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="views" 
                  stroke="hsl(var(--secondary))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* User Type Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Répartition utilisateurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userTypeData.length > 0 ? (
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={userTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {userTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 -mt-2">
                  {userTypeData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-1.5 text-xs">
                      <div 
                        className="w-2.5 h-2.5 rounded-full" 
                        style={{ backgroundColor: entry.fill }}
                      />
                      <span>{entry.name}: {entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                Aucune donnée
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Current Session */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Session active
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentSession ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{currentSession.userName || currentSession.userId}</p>
                    <Badge variant="outline" className="text-xs capitalize mt-1">
                      {currentSession.userType}
                    </Badge>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Démarré: {new Date(currentSession.startTime).toLocaleTimeString('fr-FR')}</p>
                    <p>{currentSession.pageViews.length} pages • {currentSession.fileViews.length} fichiers</p>
                  </div>
                </div>
                
                {currentSession.pageViews.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Dernière page:</p>
                    <p className="text-sm truncate">
                      {currentSession.pageViews[currentSession.pageViews.length - 1]?.title}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Monitor className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucune session active</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Files */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Fichiers les plus consultés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[150px]">
              {stats.topFiles.length > 0 ? (
                <div className="space-y-2">
                  {stats.topFiles.slice(0, 5).map((file, index) => (
                    <div 
                      key={file.id} 
                      className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/50"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-muted-foreground w-4">{index + 1}.</span>
                        <span className="text-sm truncate">{file.name}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {file.count} vues
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucun fichier consulté</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Sessions récentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            {recentSessions.length > 0 ? (
              <div className="space-y-2">
                {recentSessions.map((session) => (
                  <div 
                    key={session.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        session.userType === 'admin' ? 'bg-primary' :
                        session.userType === 'instructeur' ? 'bg-blue-500' : 'bg-green-500'
                      }`} />
                      <div>
                        <p className="font-medium text-sm">{session.userName || session.userId}</p>
                        <p className="text-xs text-muted-foreground capitalize">{session.userType}</p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{new Date(session.startTime).toLocaleDateString('fr-FR')}</p>
                      <div className="flex items-center gap-2 justify-end mt-0.5">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {session.pageViews.length}
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="h-3 w-3" /> {session.fileViews.length}
                        </span>
                        {session.duration && (
                          <span>{formatDuration(session.duration)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>Aucune session enregistrée</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveActivityDashboard;

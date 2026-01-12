import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Award, Clock, LogOut, History, Users, Calendar,
  ChevronRight, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  checkAndRotate,
  getPermanenceHistory,
  getStatistics,
  getUserMode,
  clearUserMode,
} from '@/lib/permanenceStorage';
import { Soldier, getGradeLabel, PermanenceRecord } from '@/types/permanence';
import logoImage from '@/assets/logo-official.png';

const PermanenceConsultation = () => {
  const navigate = useNavigate();
  
  // Check auth
  useEffect(() => {
    if (getUserMode() !== 'user') {
      navigate('/permanence');
    }
  }, [navigate]);

  // State
  const [currentChef, setCurrentChef] = useState<Soldier | null>(null);
  const [currentRecord, setCurrentRecord] = useState<PermanenceRecord | null>(null);
  const [activeSection, setActiveSection] = useState<'dashboard' | 'history'>('dashboard');

  // Load data
  useEffect(() => {
    const { chef, record } = checkAndRotate();
    setCurrentChef(chef);
    setCurrentRecord(record);
    
    // Check rotation every minute
    const interval = setInterval(() => {
      const { chef, record } = checkAndRotate();
      setCurrentChef(chef);
      setCurrentRecord(record);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Statistics and history
  const stats = useMemo(() => getStatistics(), []);
  const history = useMemo(() => getPermanenceHistory(20), [currentRecord]);

  // Current time display
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    clearUserMode();
    navigate('/permanence');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="glass-panel border-b border-border/50 px-4 lg:px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <img src={logoImage} alt="Logo" className="w-7 h-7 object-contain" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-foreground">Gestion Permanence</h1>
              <p className="text-xs text-muted-foreground">Mode Consultation</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg">
            <Clock className="w-4 h-4" />
            {currentTime.toLocaleTimeString('fr-FR')}
          </div>
          <Badge variant="outline" className="hidden sm:flex bg-blue-500/10 text-blue-600 border-blue-500/20">
            <Users className="w-3 h-3 mr-1" />
            Consultation
          </Badge>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Déconnexion">
            <LogOut className="w-5 h-5 text-muted-foreground hover:text-destructive" />
          </Button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b border-border/50 bg-background/50 backdrop-blur-sm sticky top-[64px] z-40">
        <div className="container mx-auto px-4">
          <nav className="flex gap-1">
            <button
              onClick={() => setActiveSection('dashboard')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all ${
                activeSection === 'dashboard'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Aujourd'hui</span>
            </button>
            <button
              onClick={() => setActiveSection('history')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all ${
                activeSection === 'history'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Historique</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {activeSection === 'dashboard' && (
          <div className="space-y-6">
            {/* Date Display */}
            <div className="text-center">
              <Badge className="bg-primary/10 text-primary text-lg px-4 py-2">
                <Calendar className="w-5 h-5 mr-2" />
                {currentTime.toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </Badge>
            </div>

            {/* Today's Chef Card - Main Focus */}
            <Card className="overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-2xl">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl text-muted-foreground font-normal">
                  Chef de Permanence du Jour
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center py-8">
                {currentChef ? (
                  <div className="space-y-6">
                    <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-5xl font-bold shadow-2xl shadow-primary/40 ring-4 ring-primary/20">
                      {currentChef.prenom.charAt(0)}{currentChef.nom.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-4xl font-bold text-foreground mb-2">
                        {currentChef.prenom} {currentChef.nom}
                      </h2>
                      <div className="flex items-center justify-center gap-4">
                        <Badge className="text-lg px-4 py-1.5" variant="secondary">
                          {getGradeLabel(currentChef.grade)}
                        </Badge>
                        <span className="text-lg text-muted-foreground font-mono">
                          Mle: {currentChef.matricule}
                        </span>
                      </div>
                    </div>
                    {currentRecord?.note && (
                      <p className="text-muted-foreground italic max-w-md mx-auto">
                        "{currentRecord.note}"
                      </p>
                    )}
                    {currentRecord && (
                      <Badge variant="outline" className="text-sm">
                        Assigné: {currentRecord.assignedBy === 'admin' ? 'Manuellement' : 'Automatiquement'}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-muted-foreground">
                    <Shield className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-xl">Aucun chef de permanence assigné</p>
                    <p className="text-sm mt-2">Contactez l'administrateur</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Current Time Display */}
            <Card className="glass-panel">
              <CardContent className="py-6">
                <div className="flex items-center justify-center gap-4">
                  <Clock className="w-8 h-8 text-primary" />
                  <span className="text-4xl font-mono font-bold text-foreground">
                    {currentTime.toLocaleTimeString('fr-FR')}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="glass-panel">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary">{stats.activeSoldiers}</p>
                    <p className="text-sm text-muted-foreground">Soldats en rotation</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-panel">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary">{stats.totalPermanences}</p>
                    <p className="text-sm text-muted-foreground">Permanences effectuées</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeSection === 'history' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground">Historique des Permanences</h2>
              <p className="text-muted-foreground">Consultez les assignations passées</p>
            </div>

            <Card className="glass-panel">
              <CardContent className="pt-6">
                {history.length > 0 ? (
                  <div className="space-y-3">
                    {history.map((record, index) => (
                      <div 
                        key={record.id} 
                        className={`flex items-center justify-between p-4 rounded-xl transition-colors border ${
                          index === 0 
                            ? 'bg-primary/10 border-primary/30' 
                            : 'bg-muted/30 border-border/50 hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                            index === 0 
                              ? 'bg-gradient-to-br from-primary to-primary/60 text-primary-foreground'
                              : 'bg-primary/10 text-primary'
                          }`}>
                            {record.soldier ? `${record.soldier.prenom.charAt(0)}${record.soldier.nom.charAt(0)}` : '?'}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">
                              {record.soldier ? `${record.soldier.prenom} ${record.soldier.nom}` : 'Soldat supprimé'}
                            </p>
                            {record.soldier && (
                              <p className="text-sm text-muted-foreground">
                                {getGradeLabel(record.soldier.grade)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant={index === 0 ? 'default' : 'secondary'}>
                            {new Date(record.visionnement).toLocaleDateString('fr-FR', { 
                              weekday: 'short', 
                              day: 'numeric', 
                              month: 'short' 
                            })}
                          </Badge>
                          {index === 0 && (
                            <span className="text-xs text-primary font-medium">Aujourd'hui</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun historique disponible</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default PermanenceConsultation;

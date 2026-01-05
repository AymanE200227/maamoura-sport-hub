import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Settings, GraduationCap, Shield, Users, Eye, EyeOff } from 'lucide-react';
import { verifyAdminPassword, verifyUserPassword, verifyStudentCredentials, setUserMode, isBackgroundEnabled, getBackgroundImage } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { useClickSound } from '@/hooks/useClickSound';
import bgImage from '@/assets/bg.jpg';
import logoImage from '@/assets/logo-new.png';

// Play auth sound
const playAuthSound = () => {
  try {
    const audio = new Audio('/sounds/auth-success.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch (e) {
    console.error('Error playing auth sound:', e);
  }
};

const Login = () => {
  const [activeTab, setActiveTab] = useState<'admin' | 'user' | 'eleve'>('user');
  
  // Admin state
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  
  // User state
  const [userPassword, setUserPassword] = useState('');
  const [showUserPassword, setShowUserPassword] = useState(false);
  
  // Eleve state
  const [eleveMatricule, setEleveMatricule] = useState('');
  const [eleveCin, setEleveCin] = useState('');
  const [showEleveCin, setShowEleveCin] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { playClick } = useClickSound();

  const handleAdminLogin = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    playClick();
    if (verifyAdminPassword(adminPassword)) {
      setUserMode('admin');
      playAuthSound();
      toast({
        title: 'Connexion réussie',
        description: 'Bienvenue, Administrateur!',
      });
      navigate('/accueil');
    } else {
      toast({
        title: 'Erreur',
        description: 'Mot de passe administrateur incorrect',
        variant: 'destructive',
      });
    }
  }, [adminPassword, navigate, toast, playClick]);

  const handleUserLogin = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    playClick();
    if (verifyUserPassword(userPassword)) {
      setUserMode('user');
      playAuthSound();
      toast({
        title: 'Connexion réussie',
        description: 'Bienvenue!',
      });
      navigate('/accueil');
    } else {
      toast({
        title: 'Erreur',
        description: 'Mot de passe utilisateur incorrect',
        variant: 'destructive',
      });
    }
  }, [userPassword, navigate, toast, playClick]);

  const handleEleveLogin = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    playClick();
    
    const student = verifyStudentCredentials(eleveMatricule, eleveCin);
    if (student) {
      setUserMode('eleve');
      playAuthSound();
      toast({
        title: 'Connexion réussie',
        description: `Bienvenue, ${student.prenom || student.nom || 'Élève'}!`,
      });
      navigate('/accueil');
    } else {
      toast({
        title: 'Erreur',
        description: 'Matricule ou CIN incorrect',
        variant: 'destructive',
      });
    }
  }, [eleveMatricule, eleveCin, navigate, toast, playClick]);

  const bgEnabled = isBackgroundEnabled();
  const customBg = getBackgroundImage();
  const finalBg = bgEnabled ? (customBg || bgImage) : bgImage;

  const tabConfig = [
    { id: 'user' as const, label: 'Utilisateur', icon: Users, color: 'primary' },
    { id: 'eleve' as const, label: 'Élève', icon: GraduationCap, color: 'accent' },
    { id: 'admin' as const, label: 'Admin', icon: Shield, color: 'warning' },
  ];

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: `url(${finalBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="w-full max-w-md">
        {/* Welcome Header */}
        <div className="text-center mb-6 animate-fade-in">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <img 
                src={logoImage} 
                alt="Centre Sportif Maamoura" 
                className="w-24 h-24 object-contain rounded-full border-4 border-primary/30 shadow-2xl"
              />
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/20 to-transparent" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2 drop-shadow-lg">
            Bienvenue à la Base de Données
          </h1>
          <p className="text-lg text-foreground/80 font-medium drop-shadow">
            Centre Sportif des FAR Maâmoura
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-panel p-0 overflow-hidden animate-scale-in">
          {/* Tab Navigation */}
          <div className="flex border-b border-border/30">
            {tabConfig.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { playClick(); setActiveTab(tab.id); }}
                className={`flex-1 flex items-center justify-center gap-2 py-4 px-3 text-sm font-medium transition-all duration-300 relative
                  ${activeTab === tab.id 
                    ? 'text-foreground bg-card/50' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Admin Login */}
            {activeTab === 'admin' && (
              <form onSubmit={handleAdminLogin} className="space-y-5 animate-fade-in">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-warning/20 mb-3">
                    <Shield className="w-8 h-8 text-warning" />
                  </div>
                  <h2 className="text-lg font-semibold">Accès Administrateur</h2>
                  <p className="text-sm text-muted-foreground">Gestion complète du système</p>
                </div>
                
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    placeholder="Mot de passe administrateur"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="glass-input w-full pl-12 pr-12 py-3"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                  >
                    {showAdminPassword ? <EyeOff className="w-5 h-5 text-muted-foreground" /> : <Eye className="w-5 h-5 text-muted-foreground" />}
                  </button>
                </div>
                
                <button 
                  type="submit" 
                  className="w-full py-3 uppercase tracking-wider font-semibold bg-warning hover:bg-warning/90 text-warning-foreground rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Settings className="w-5 h-5" />
                  Connexion Admin
                </button>
              </form>
            )}

            {/* User Login */}
            {activeTab === 'user' && (
              <form onSubmit={handleUserLogin} className="space-y-5 animate-fade-in">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-3">
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold">Accès Utilisateur</h2>
                  <p className="text-sm text-muted-foreground">Consultation des cours</p>
                </div>
                
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showUserPassword ? 'text' : 'password'}
                    placeholder="Mot de passe utilisateur"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    className="glass-input w-full pl-12 pr-12 py-3"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUserPassword(!showUserPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                  >
                    {showUserPassword ? <EyeOff className="w-5 h-5 text-muted-foreground" /> : <Eye className="w-5 h-5 text-muted-foreground" />}
                  </button>
                </div>
                
                <button 
                  type="submit" 
                  className="btn-primary w-full py-3 uppercase tracking-wider font-semibold flex items-center justify-center gap-2"
                >
                  <User className="w-5 h-5" />
                  Consulter
                </button>
              </form>
            )}

            {/* Eleve Login */}
            {activeTab === 'eleve' && (
              <form onSubmit={handleEleveLogin} className="space-y-5 animate-fade-in">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/20 mb-3">
                    <GraduationCap className="w-8 h-8 text-accent" />
                  </div>
                  <h2 className="text-lg font-semibold">Accès Élève</h2>
                  <p className="text-sm text-muted-foreground">Matricule (Mle) + CIN</p>
                </div>
                
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Matricule (Mle)"
                    value={eleveMatricule}
                    onChange={(e) => setEleveMatricule(e.target.value)}
                    className="glass-input w-full pl-12 pr-4 py-3"
                  />
                </div>
                
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showEleveCin ? 'text' : 'password'}
                    placeholder="CIN"
                    value={eleveCin}
                    onChange={(e) => setEleveCin(e.target.value)}
                    className="glass-input w-full pl-12 pr-12 py-3"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEleveCin(!showEleveCin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                  >
                    {showEleveCin ? <EyeOff className="w-5 h-5 text-muted-foreground" /> : <Eye className="w-5 h-5 text-muted-foreground" />}
                  </button>
                </div>
                
                <button 
                  type="submit" 
                  className="w-full py-3 uppercase tracking-wider font-semibold bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <GraduationCap className="w-5 h-5" />
                  Connexion Élève
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-foreground/60 mt-4">
          Forces Armées Royales • Centre Sportif Maâmoura
        </p>
      </div>
    </div>
  );
};

export default Login;

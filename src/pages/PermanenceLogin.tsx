import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Eye, EyeOff, Lock, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  verifyAdminPassword, 
  verifyUserPassword, 
  setUserMode, 
  getUserMode,
  checkAndRotate 
} from '@/lib/permanenceStorage';
import logoImage from '@/assets/logo-official.png';

const playAuthSound = () => {
  try {
    const audio = new Audio('/sounds/auth-success.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch (e) {
    console.error('Error playing auth sound:', e);
  }
};

const PermanenceLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'admin' | 'user'>('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showUserPassword, setShowUserPassword] = useState(false);

  // Check if already logged in
  useEffect(() => {
    const mode = getUserMode();
    if (mode === 'admin') {
      navigate('/permanence/admin');
    } else if (mode === 'user') {
      navigate('/permanence/consultation');
    }
    
    // Trigger rotation check on app load
    checkAndRotate();
  }, [navigate]);

  const handleAdminLogin = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPassword(adminPassword)) {
      playAuthSound();
      setUserMode('admin');
      toast({
        title: "Connexion réussie",
        description: "Bienvenue dans le panneau d'administration",
      });
      navigate('/permanence/admin');
    } else {
      toast({
        title: "Erreur",
        description: "Mot de passe incorrect",
        variant: "destructive",
      });
    }
  }, [adminPassword, navigate, toast]);

  const handleUserLogin = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (verifyUserPassword(userPassword)) {
      playAuthSound();
      setUserMode('user');
      toast({
        title: "Connexion réussie",
        description: "Bienvenue en mode consultation",
      });
      navigate('/permanence/consultation');
    } else {
      toast({
        title: "Erreur",
        description: "Mot de passe incorrect",
        variant: "destructive",
      });
    }
  }, [userPassword, navigate, toast]);

  const tabs = useMemo(() => [
    { id: 'admin' as const, label: 'Administrateur', icon: Shield, color: 'text-red-500' },
    { id: 'user' as const, label: 'Consultation', icon: Users, color: 'text-blue-500' },
  ], []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/30">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative z-10 glass-panel border-border/50 shadow-2xl">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-4 ring-primary/10">
              <img 
                src={logoImage} 
                alt="Logo" 
                className="w-14 h-14 object-contain drop-shadow-lg" 
              />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Gestion de Permanence
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-1">
              Centre Sportif FAR Maâmoura
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'admin' | 'user')}>
            <TabsList className="grid grid-cols-2 mb-6 bg-muted/50">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all"
                >
                  <tab.icon className={`w-4 h-4 ${tab.color}`} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="admin" className="space-y-4">
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Lock className="w-4 h-4 text-red-500" />
                    Mot de passe administrateur
                  </div>
                  <div className="relative">
                    <Input
                      type={showAdminPassword ? 'text' : 'password'}
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Entrez le mot de passe"
                      className="pr-10 bg-background/50 border-border/50 focus:border-primary/50"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white shadow-lg shadow-red-500/20"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Connexion Admin
                </Button>
              </form>
              <p className="text-xs text-center text-muted-foreground">
                Accès complet: gestion des soldats, permanences, et paramètres
              </p>
            </TabsContent>

            <TabsContent value="user" className="space-y-4">
              <form onSubmit={handleUserLogin} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Lock className="w-4 h-4 text-blue-500" />
                    Mot de passe utilisateur
                  </div>
                  <div className="relative">
                    <Input
                      type={showUserPassword ? 'text' : 'password'}
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      placeholder="Entrez le mot de passe"
                      className="pr-10 bg-background/50 border-border/50 focus:border-primary/50"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowUserPassword(!showUserPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-lg shadow-blue-500/20"
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  Connexion Consultation
                </Button>
              </form>
              <p className="text-xs text-center text-muted-foreground">
                Consultation uniquement: voir le chef de permanence actuel
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PermanenceLogin;

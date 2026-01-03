import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Settings } from 'lucide-react';
import { verifyAdminPassword, verifyUserPassword, setUserMode, isBackgroundEnabled, getBackgroundImage } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { useClickSound } from '@/hooks/useClickSound';
import bgImage from '@/assets/bg.jpg';
import logoImage from '@/assets/logo.jpg';

const Login = () => {
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [userPasswordInput, setUserPasswordInput] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { playClick } = useClickSound();

  const handleAdminLogin = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    playClick();
    if (verifyAdminPassword(adminPasswordInput)) {
      setUserMode('admin');
      toast({
        title: 'Connexion réussie',
        description: 'Bienvenue, Administrateur!',
      });
      navigate('/accueil');
    } else {
      toast({
        title: 'Erreur',
        description: 'Mot de passe incorrect',
        variant: 'destructive',
      });
    }
  }, [adminPasswordInput, navigate, toast, playClick]);

  const handleUserLogin = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    playClick();
    if (verifyUserPassword(userPasswordInput)) {
      setUserMode('user');
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
  }, [userPasswordInput, navigate, toast, playClick]);

  const bgEnabled = isBackgroundEnabled();
  const customBg = getBackgroundImage();
  const finalBg = bgEnabled ? (customBg || bgImage) : bgImage;

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: `url(${finalBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="glass-panel w-full max-w-md p-8 animate-scale-in">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img 
            src={logoImage} 
            alt="Centre Sportif Maamoura" 
            className="w-24 h-24 object-contain"
          />
        </div>

        {/* Admin Login Section */}
        <form onSubmit={handleAdminLogin} className="mb-6">
          <div className="flex items-center gap-3 mb-4 text-muted-foreground">
            <Settings className="w-5 h-5" />
            <span className="text-sm font-medium">Se connecter en tant qu'ADMIN</span>
          </div>
          
          <div className="relative mb-4">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="password"
              placeholder="Mot de passe"
              value={adminPasswordInput}
              onChange={(e) => setAdminPasswordInput(e.target.value)}
              className="glass-input w-full pl-12 pr-4 py-3"
            />
          </div>
          
          <button 
            type="submit" 
            className="btn-primary w-full py-3 uppercase tracking-wider font-semibold"
          >
            Se Connecter
          </button>
        </form>

        <div className="border-t border-border/30 my-6" />

        {/* User Login Section */}
        <form onSubmit={handleUserLogin}>
          <div className="flex items-center gap-3 mb-4 text-muted-foreground">
            <User className="w-5 h-5" />
            <span className="text-sm font-medium">Se connecter en tant qu'UTILISATEUR</span>
          </div>
          
          <div className="relative mb-4">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="password"
              placeholder="Mot de passe utilisateur"
              value={userPasswordInput}
              onChange={(e) => setUserPasswordInput(e.target.value)}
              className="glass-input w-full pl-12 pr-4 py-3"
            />
          </div>
          
          <button 
            type="submit" 
            className="w-full py-3 uppercase tracking-wider font-semibold bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg transition-all duration-200"
          >
            Consulter
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

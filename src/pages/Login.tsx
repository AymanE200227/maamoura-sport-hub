import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Settings } from 'lucide-react';
import { verifyPassword, setUserMode } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import bgImage from '@/assets/bg.jpg';
import logoImage from '@/assets/logo.jpg';

const Login = () => {
  const [adminPassword, setAdminPassword] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyPassword(adminPassword)) {
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
  };

  const handleUserLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // User mode - simpler validation or no password required for consultation
    setUserMode('user');
    toast({
      title: 'Connexion réussie',
      description: 'Bienvenue!',
    });
    navigate('/accueil');
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: `url(${bgImage})`,
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
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
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
              placeholder="Mot de passe"
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
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

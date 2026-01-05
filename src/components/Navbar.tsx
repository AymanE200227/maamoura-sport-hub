import { memo, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, LogOut } from 'lucide-react';
import { clearUserMode, getUserMode } from '@/lib/storage';
import { useClickSound } from '@/hooks/useClickSound';
import logoImage from '@/assets/logo-new.png';

// Play logout sound
const playLogoutSound = () => {
  try {
    const audio = new Audio('/sounds/auth-success.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch (e) {
    console.error('Error playing logout sound:', e);
  }
};

const Navbar = memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const userMode = getUserMode();
  const { playClick } = useClickSound();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = useCallback(() => {
    playClick();
    playLogoutSound();
    clearUserMode();
    navigate('/');
  }, [navigate, playClick]);

  const handleNavClick = useCallback(() => {
    playClick();
  }, [playClick]);

  return (
    <nav className="glass-panel px-6 py-4 flex items-center justify-between mb-6 shadow-xl">
      <div className="flex items-center gap-8">
        {/* Logo */}
        <Link to="/accueil" className="flex items-center gap-3 group" onClick={handleNavClick}>
          <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-primary/30 shadow-lg group-hover:border-primary transition-colors">
            <img src={logoImage} alt="CSM Logo" className="w-full h-full object-cover" loading="lazy" />
          </div>
          <div className="hidden md:block">
            <span className="font-bold text-foreground block leading-tight">Centre Sportif</span>
            <span className="text-xs text-muted-foreground">FAR Maâmoura</span>
          </div>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-6">
          <Link 
            to="/accueil" 
            className={`nav-link ${isActive('/accueil') ? 'nav-link-active' : ''}`}
            onClick={handleNavClick}
          >
            Accueil
          </Link>
          {userMode === 'admin' && (
            <Link 
              to="/gestion-cours" 
              className={`nav-link ${isActive('/gestion-cours') ? 'nav-link-active' : ''}`}
              onClick={handleNavClick}
            >
              Gestion des Cours
            </Link>
          )}
          {userMode === 'admin' && (
            <Link 
              to="/parametres" 
              className={`nav-link ${isActive('/parametres') ? 'nav-link-active' : ''}`}
              onClick={handleNavClick}
            >
              Paramètres
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button 
          className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
          onClick={handleNavClick}
        >
          <Search className="w-5 h-5 text-muted-foreground" />
        </button>
        <button 
          onClick={handleLogout}
          className="p-2 hover:bg-destructive/20 rounded-lg transition-colors"
          title="Déconnexion"
        >
          <LogOut className="w-5 h-5 text-muted-foreground hover:text-destructive" />
        </button>
      </div>
    </nav>
  );
});

Navbar.displayName = 'Navbar';

export default Navbar;

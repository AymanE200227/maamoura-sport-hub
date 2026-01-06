import { memo, useCallback, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, LogOut } from 'lucide-react';
import { clearUserMode, getUserMode, getAppSettings } from '@/lib/storage';
import { useClickSound } from '@/hooks/useClickSound';
import logoImage from '@/assets/logo-official.png';
import farBadge from '@/assets/far-badge.png';

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
  const appSettings = useMemo(() => getAppSettings(), []);
  const currentLogo = appSettings.customLogo || logoImage;

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
    <nav className="glass-panel px-4 lg:px-6 py-3 flex items-center justify-between mb-6 shadow-xl">
      <div className="flex items-center gap-4 lg:gap-8">
        {/* Logo */}
        <Link to="/accueil" className="flex items-center gap-3 group" onClick={handleNavClick}>
          <div className="w-11 h-11 flex items-center justify-center">
            <img src={currentLogo} alt="CSM Logo" className="w-9 h-9 object-contain drop-shadow-lg" loading="lazy" />
          </div>
          <div className="hidden md:block">
            <span className="font-bold text-foreground block leading-tight">Centre Sportif</span>
            <span className="text-xs text-muted-foreground">FAR Maâmoura</span>
          </div>
        </Link>

        {/* FAR Badge */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
          <img 
            src={farBadge} 
            alt="Forces Armées Royales" 
            className="w-8 h-8 object-contain drop-shadow"
          />
          <div className="text-xs">
            <span className="text-primary font-semibold block">القوات المسلحة الملكية</span>
            <span className="text-muted-foreground">Forces Armées Royales</span>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex items-center gap-4 lg:gap-6">
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

      <div className="flex items-center gap-2 lg:gap-4">
        {/* Mobile FAR Badge */}
        <div className="flex lg:hidden items-center">
          <img 
            src={farBadge} 
            alt="FAR" 
            className="w-7 h-7 object-contain"
          />
        </div>
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

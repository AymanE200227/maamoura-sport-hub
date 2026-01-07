import { memo, useCallback, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { clearUserMode, getUserMode, getAppSettings } from '@/lib/storage';
import { useClickSound } from '@/hooks/useClickSound';
import logoImage from '@/assets/logo-official.png';

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
    <nav className="glass-panel px-4 lg:px-6 py-3 flex items-center justify-between mb-6 shadow-xl relative overflow-hidden">
      {/* Moroccan FAR Diagonal Stripes - positioned in corner */}
      <div 
        className="absolute -top-4 -left-4 w-20 h-20 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, transparent 30%, #c1272d 30%, #c1272d 50%, #165b33 50%, #165b33 70%, transparent 70%)',
        }}
      />
      
      <div className="flex items-center gap-3 lg:gap-6 relative z-10">
        {/* Logo */}
        <Link to="/accueil" className="flex items-center gap-3 group ml-8" onClick={handleNavClick}>
          <div className="w-11 h-11 flex items-center justify-center">
            <img src={currentLogo} alt="CSM Logo" className="w-9 h-9 object-contain drop-shadow-lg" loading="lazy" />
          </div>
          <div className="hidden md:block">
            <span className="font-bold text-foreground block leading-tight">Centre Sportif</span>
            <span className="text-xs text-muted-foreground">FAR Maâmoura</span>
          </div>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-3 lg:gap-5">
          <Link 
            to="/accueil" 
            className={`nav-link ${isActive('/accueil') ? 'nav-link-active' : ''}`}
            onClick={handleNavClick}
          >
            Accueil
          </Link>
          {userMode === 'eleve' && (
            <Link 
              to="/dashboard" 
              className={`nav-link ${isActive('/dashboard') ? 'nav-link-active' : ''}`}
              onClick={handleNavClick}
            >
              Mon Espace
            </Link>
          )}
          {userMode === 'admin' && (
            <Link 
              to="/gestion-cours" 
              className={`nav-link ${isActive('/gestion-cours') ? 'nav-link-active' : ''}`}
              onClick={handleNavClick}
            >
              Gestion
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

      <div className="flex items-center gap-2 lg:gap-3 relative z-10">
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

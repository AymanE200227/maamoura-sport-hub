import { Link, useLocation } from 'react-router-dom';
import { Search, LogOut } from 'lucide-react';
import { clearUserMode, getUserMode } from '@/lib/storage';
import { useNavigate } from 'react-router-dom';
import logoImage from '@/assets/logo.jpg';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const userMode = getUserMode();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    clearUserMode();
    navigate('/');
  };

  return (
    <nav className="glass-card px-6 py-4 flex items-center justify-between mb-6">
      <div className="flex items-center gap-8">
        {/* Logo */}
        <Link to="/accueil" className="flex items-center gap-3">
          <img src={logoImage} alt="CSM Logo" className="w-10 h-10 object-contain" />
          <span className="font-semibold text-foreground">CSM Logo</span>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-6">
          <Link 
            to="/accueil" 
            className={`nav-link ${isActive('/accueil') ? 'nav-link-active' : ''}`}
          >
            Accueil
          </Link>
          {userMode === 'admin' && (
            <Link 
              to="/gestion-cours" 
              className={`nav-link ${isActive('/gestion-cours') ? 'nav-link-active' : ''}`}
            >
              Gestion des Cours
            </Link>
          )}
          <Link 
            to="/parametres" 
            className={`nav-link ${isActive('/parametres') ? 'nav-link-active' : ''}`}
          >
            Paramètres
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-muted/50 rounded-lg transition-colors">
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
};

export default Navbar;

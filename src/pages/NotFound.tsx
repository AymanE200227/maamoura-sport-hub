import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home } from "lucide-react";
import { isBackgroundEnabled, getBackgroundImage } from "@/lib/storage";
import { useClickSound } from "@/hooks/useClickSound";
import bgImage from "@/assets/bg.jpg";

const NotFound = () => {
  const location = useLocation();
  const { playClick } = useClickSound();

  const bgEnabled = isBackgroundEnabled();
  const customBg = getBackgroundImage();
  const finalBg = bgEnabled ? (customBg || bgImage) : bgImage;

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{
        backgroundImage: `url(${finalBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="glass-panel text-center p-12 animate-scale-in">
        <h1 className="text-6xl font-bold mb-4 text-primary">404</h1>
        <p className="text-xl text-muted-foreground mb-8">Page non trouvée</p>
        <Link 
          to="/" 
          className="btn-primary inline-flex items-center gap-2"
          onClick={playClick}
        >
          <Home className="w-5 h-5" />
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
};

export default NotFound;

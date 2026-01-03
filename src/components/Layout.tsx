import { forwardRef, ReactNode, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Navbar from './Navbar';
import { getBackgroundImage, isBackgroundEnabled } from '@/lib/storage';
import { useClickSound } from '@/hooks/useClickSound';
import bgImage from '@/assets/bg2.jpg';

interface LayoutProps {
  children: ReactNode;
  backgroundImage?: string;
}

const Layout = memo(forwardRef<HTMLDivElement, LayoutProps>(({ children, backgroundImage }, ref) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { playClick } = useClickSound();
  
  // Don't show back button on accueil (home) page or login
  const showBackButton = location.pathname !== '/accueil' && location.pathname !== '/';

  const handleBack = () => {
    playClick();
    navigate(-1);
  };

  // Determine background: custom > prop > default
  const bgEnabled = isBackgroundEnabled();
  const customBg = getBackgroundImage();
  const finalBg = bgEnabled ? (customBg || backgroundImage || bgImage) : undefined;

  return (
    <div 
      ref={ref}
      className="min-h-screen"
      style={finalBg ? {
        backgroundImage: `url(${finalBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      } : {
        backgroundColor: 'hsl(var(--background))'
      }}
    >
      <div className="min-h-screen bg-background/40 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Navbar />
          {showBackButton && (
            <button 
              onClick={handleBack}
              className="mb-4 flex items-center gap-2 px-4 py-2 bg-card/80 hover:bg-card rounded-lg transition-colors text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Retour</span>
            </button>
          )}
          <main className="animate-fade-in">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}));

Layout.displayName = 'Layout';

export default Layout;
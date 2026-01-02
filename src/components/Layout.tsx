import { forwardRef, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Navbar from './Navbar';
import bgImage from '@/assets/bg2.jpg';

interface LayoutProps {
  children: ReactNode;
  backgroundImage?: string;
}

const Layout = forwardRef<HTMLDivElement, LayoutProps>(({ children, backgroundImage }, ref) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Don't show back button on accueil (home) page
  const showBackButton = location.pathname !== '/accueil';

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div 
      ref={ref}
      className="min-h-screen"
      style={{
        backgroundImage: `url(${backgroundImage || bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
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
});

Layout.displayName = 'Layout';

export default Layout;
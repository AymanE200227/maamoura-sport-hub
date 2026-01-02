import { ReactNode } from 'react';
import Navbar from './Navbar';
import bgImage from '@/assets/bg2.jpg';

interface LayoutProps {
  children: ReactNode;
  backgroundImage?: string;
}

const Layout = ({ children, backgroundImage }: LayoutProps) => {
  return (
    <div 
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
          <main className="animate-fade-in">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;

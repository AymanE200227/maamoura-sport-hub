import { Loader2 } from 'lucide-react';

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="relative flex flex-col items-center">
        {/* Animated rings */}
        <div className="absolute w-32 h-32 rounded-full border-4 border-primary/20 animate-ping" />
        <div className="absolute w-24 h-24 rounded-full border-4 border-primary/40 animate-pulse" />
        <div className="absolute w-16 h-16 rounded-full border-4 border-primary/60" />
        
        {/* Center spinner */}
        <div className="relative z-10 w-12 h-12 flex items-center justify-center bg-primary rounded-full shadow-lg shadow-primary/50">
          <Loader2 className="w-6 h-6 text-primary-foreground animate-spin" />
        </div>
        
        {/* Loading text */}
        <div className="mt-12 text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Chargement</h2>
          <p className="text-muted-foreground text-sm">Centre Sportif Maamoura</p>
        </div>
        
        {/* Animated dots */}
        <div className="flex gap-1 mt-4">
          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;

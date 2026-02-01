import { memo } from 'react';

const FootballLoader = memo(() => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6">
        {/* Football spinning animation */}
        <div className="relative w-20 h-20">
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full animate-spin"
            style={{ animationDuration: '1.2s' }}
          >
            {/* Football base */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="hsl(var(--card))"
              stroke="hsl(var(--primary))"
              strokeWidth="3"
            />
            {/* Pentagon patterns */}
            <polygon
              points="50,15 65,35 58,55 42,55 35,35"
              fill="hsl(var(--foreground))"
            />
            <polygon
              points="85,50 72,35 72,65"
              fill="hsl(var(--foreground))"
            />
            <polygon
              points="15,50 28,35 28,65"
              fill="hsl(var(--foreground))"
            />
            <polygon
              points="35,80 50,70 65,80 58,95 42,95"
              fill="hsl(var(--foreground))"
            />
            {/* Gold accent ring */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeDasharray="8 4"
              className="animate-pulse"
            />
          </svg>
          {/* Glow effect */}
          <div 
            className="absolute inset-0 rounded-full opacity-30 blur-xl"
            style={{ background: 'hsl(var(--primary))' }}
          />
        </div>
        
        {/* FAR Text */}
        <div className="text-center">
          <h2 
            className="text-3xl font-bold tracking-widest"
            style={{ 
              color: 'hsl(var(--primary))',
              textShadow: '0 0 20px hsl(var(--primary) / 0.5)'
            }}
          >
            F A R
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Centre Sportif Maâmoura
          </p>
        </div>
        
        {/* Progress dots */}
        <div className="flex gap-2">
          <span 
            className="w-2 h-2 rounded-full bg-primary animate-bounce" 
            style={{ animationDelay: '0ms', animationDuration: '0.8s' }} 
          />
          <span 
            className="w-2 h-2 rounded-full bg-primary animate-bounce" 
            style={{ animationDelay: '150ms', animationDuration: '0.8s' }} 
          />
          <span 
            className="w-2 h-2 rounded-full bg-primary animate-bounce" 
            style={{ animationDelay: '300ms', animationDuration: '0.8s' }} 
          />
        </div>
      </div>
    </div>
  );
});

FootballLoader.displayName = 'FootballLoader';

export default FootballLoader;

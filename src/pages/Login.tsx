import { useState, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { verifyAdminPassword, verifyUserPassword, verifyStudentCredentials, setUserMode, isBackgroundEnabled, getBackgroundImage, getAppSettings } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { useClickSound } from '@/hooks/useClickSound';
import { startSession, endSession } from '@/lib/activityLog';
import bgImage from '@/assets/bg.jpg';
import logoImage from '@/assets/logo-official.png';

// Play auth sound
const playAuthSound = () => {
  try {
    const audio = new Audio('/sounds/auth-success.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch (e) {
    console.error('Error playing auth sound:', e);
  }
};

// Memoized input component for performance
const AuthInput = memo(({ 
  type, 
  placeholder, 
  value, 
  onChange, 
  icon: Icon, 
  showToggle,
  isPassword,
  onToggle 
}: {
  type: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  icon: typeof User;
  showToggle?: boolean;
  isPassword?: boolean;
  onToggle?: () => void;
}) => (
  <div className="relative group">
    <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-14 pl-12 pr-12 rounded-xl border-2 border-border/50 bg-card/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-card/80 transition-all duration-300 text-base outline-none"
      autoComplete={isPassword ? 'current-password' : 'username'}
    />
    {showToggle && (
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        {isPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    )}
  </div>
));

AuthInput.displayName = 'AuthInput';

const Login = () => {
  // Combined form state
  const [identifier, setIdentifier] = useState(''); // Email or Matricule
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { playClick } = useClickSound();

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    playClick();
    setIsLoading(true);

    // Small delay for UX
    await new Promise(r => setTimeout(r, 300));

    try {
      // Try Admin login (password only, identifier can be empty or 'admin')
      if (identifier.toLowerCase() === 'admin' || !identifier) {
        if (verifyAdminPassword(password)) {
          endSession();
          setUserMode('admin');
          startSession('admin', 'admin', 'Administrateur');
          playAuthSound();
          toast({ title: 'Connexion réussie', description: 'Bienvenue, Administrateur!' });
          navigate('/accueil');
          return;
        }
      }

      // Try Instructeur login (password only)
      if (verifyUserPassword(password)) {
        endSession();
        setUserMode('user');
        startSession('instructeur', 'instructeur', 'Instructeur');
        playAuthSound();
        toast({ title: 'Connexion réussie', description: 'Bienvenue, Instructeur!' });
        navigate('/accueil');
        return;
      }

      // Try Student login (Matricule + CIN)
      if (identifier) {
        const student = verifyStudentCredentials(identifier, password);
        if (student) {
          endSession();
          setUserMode('eleve');
          startSession(student.matricule, 'eleve', student.prenom || student.nom || 'Élève');
          playAuthSound();
          toast({ title: 'Connexion réussie', description: `Bienvenue, ${student.prenom || student.nom || 'Élève'}!` });
          navigate('/accueil');
          return;
        }
      }

      // No match found
      toast({
        title: 'Erreur de connexion',
        description: 'Identifiant ou mot de passe incorrect',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [identifier, password, navigate, toast, playClick]);

  const bgEnabled = isBackgroundEnabled();
  const customBg = getBackgroundImage();
  const finalBg = bgEnabled ? (customBg || bgImage) : bgImage;
  const appSettings = useMemo(() => getAppSettings(), []);
  const currentLogo = appSettings.customLogo || logoImage;

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: `url(${finalBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay for better contrast */}
      <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/80 to-background/90" />
      
      {/* Decorative elements - optimized */}
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: 'hsl(var(--primary))' }} />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: 'hsl(var(--accent))' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-6">
            <div className="relative">
              {/* Glow effect */}
              <div 
                className="absolute inset-0 rounded-2xl blur-xl opacity-50"
                style={{ background: 'hsl(var(--primary))' }}
              />
              <div className="relative w-24 h-24 rounded-2xl border-2 border-primary/40 p-2 bg-card/80 backdrop-blur-sm shadow-2xl">
                <img 
                  src={currentLogo} 
                  alt="Logo" 
                  className="w-full h-full object-contain"
                  loading="eager"
                />
              </div>
            </div>
          </div>
          
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Base de Données
          </h1>
          <p className="text-primary font-semibold text-lg">
            Centre Sportif des FAR
          </p>
          <p className="text-muted-foreground text-sm mt-1">Maâmoura</p>
        </div>

        {/* Login Form */}
        <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl p-6 md:p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Identifier Input */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Email / Matricule
              </label>
              <AuthInput
                type="text"
                placeholder="Matricule ou laissez vide pour admin"
                value={identifier}
                onChange={setIdentifier}
                icon={User}
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Mot de passe / CIN
              </label>
              <AuthInput
                type={showPassword ? 'text' : 'password'}
                placeholder="Votre mot de passe"
                value={password}
                onChange={setPassword}
                icon={Lock}
                showToggle
                isPassword={!showPassword}
                onToggle={() => setShowPassword(!showPassword)}
              />
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={isLoading || !password}
              className="w-full h-14 rounded-xl font-semibold text-base flex items-center justify-center gap-3 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
                color: 'hsl(var(--primary-foreground))',
                boxShadow: '0 4px 20px hsl(var(--primary) / 0.4)'
              }}
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <span>Se connecter</span>
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* Helper text */}
          <div className="mt-6 pt-6 border-t border-border/50">
            <div className="text-center text-xs text-muted-foreground space-y-1">
              <p><strong>Admin:</strong> laissez vide + mot de passe admin</p>
              <p><strong>Instructeur:</strong> laissez vide + mot de passe instructeur</p>
              <p><strong>Élève:</strong> Matricule + CIN</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-foreground/50 mt-6">
          Forces Armées Royales • Centre Sportif Maâmoura
        </p>
      </div>
    </div>
  );
};

export default Login;

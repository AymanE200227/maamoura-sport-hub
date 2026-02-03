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
    <Icon 
      className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors" 
      style={{ color: 'hsl(0 0% 50%)' }}
    />
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-14 pl-12 pr-12 rounded-xl text-base outline-none transition-all duration-300"
      style={{
        background: 'hsl(0 0% 12%)',
        border: '2px solid hsl(0 0% 25%)',
        color: 'hsl(45 20% 95%)'
      }}
      onFocus={(e) => {
        e.target.style.borderColor = 'hsl(42 75% 55%)';
        e.target.style.boxShadow = '0 0 0 3px hsl(42 75% 55% / 0.15)';
      }}
      onBlur={(e) => {
        e.target.style.borderColor = 'hsl(0 0% 25%)';
        e.target.style.boxShadow = 'none';
      }}
      autoComplete={isPassword ? 'current-password' : 'username'}
    />
    {showToggle && (
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 transition-colors"
        style={{ color: 'hsl(0 0% 50%)' }}
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
      {/* Dark overlay for visibility on old screens */}
      <div className="absolute inset-0 bg-black/80" />
      
      {/* Subtle gold glow effects */}
      <div 
        className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none" 
        style={{ background: 'hsl(42 75% 50%)' }} 
      />
      <div 
        className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-15 blur-3xl pointer-events-none" 
        style={{ background: 'hsl(38 85% 45%)' }} 
      />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-6">
            <div className="relative">
              {/* Gold glow behind logo */}
              <div 
                className="absolute -inset-2 rounded-2xl blur-xl opacity-40"
                style={{ background: 'linear-gradient(135deg, hsl(42 75% 55%), hsl(38 85% 50%))' }}
              />
              <div 
                className="relative w-24 h-24 rounded-2xl p-2 shadow-2xl"
                style={{
                  background: 'hsl(0 0% 8%)',
                  border: '2px solid hsl(42 75% 45% / 0.5)'
                }}
              >
                <img 
                  src={currentLogo} 
                  alt="Logo" 
                  className="w-full h-full object-contain"
                  loading="eager"
                />
              </div>
            </div>
          </div>
          
          <h1 
            className="text-2xl md:text-3xl font-bold mb-2"
            style={{ color: 'hsl(45 20% 95%)' }}
          >
            Base de Données
          </h1>
          <p 
            className="font-semibold text-lg"
            style={{ color: 'hsl(42 75% 55%)', textShadow: '0 0 20px hsl(42 75% 55% / 0.5)' }}
          >
            Centre Sportif des FAR
          </p>
          <p className="text-sm mt-1" style={{ color: 'hsl(0 0% 55%)' }}>Maâmoura</p>
        </div>

        {/* Login Form - Dark glass card */}
        <div 
          className="rounded-2xl p-6 md:p-8 shadow-2xl"
          style={{
            background: 'hsl(0 0% 9% / 0.95)',
            border: '1px solid hsl(42 50% 30% / 0.4)',
            backdropFilter: 'blur(20px)'
          }}
        >
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Identifier Input */}
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'hsl(0 0% 65%)' }}
              >
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
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'hsl(0 0% 65%)' }}
              >
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

            {/* Submit Button - Gold gradient */}
            <button 
              type="submit" 
              disabled={isLoading || !password}
              className="w-full h-14 rounded-xl font-semibold text-base flex items-center justify-center gap-3 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group hover:translate-y-[-2px]"
              style={{
                background: 'linear-gradient(135deg, hsl(42 75% 55%), hsl(38 85% 50%))',
                color: 'hsl(0 0% 5%)',
                boxShadow: '0 4px 20px hsl(42 75% 55% / 0.4), inset 0 1px 0 hsl(45 80% 70% / 0.3)'
              }}
            >
              {isLoading ? (
                <div 
                  className="w-6 h-6 border-2 rounded-full animate-spin"
                  style={{ borderColor: 'hsl(0 0% 5% / 0.3)', borderTopColor: 'hsl(0 0% 5%)' }}
                />
              ) : (
                <>
                  <span>Se connecter</span>
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* Helper text */}
          <div 
            className="mt-6 pt-6"
            style={{ borderTop: '1px solid hsl(0 0% 20%)' }}
          >
            <div className="text-center text-xs space-y-1" style={{ color: 'hsl(0 0% 50%)' }}>
              <p><strong style={{ color: 'hsl(42 75% 55%)' }}>Admin:</strong> laissez vide + mot de passe admin</p>
              <p><strong style={{ color: 'hsl(42 75% 55%)' }}>Instructeur:</strong> laissez vide + mot de passe instructeur</p>
              <p><strong style={{ color: 'hsl(42 75% 55%)' }}>Élève:</strong> Matricule + CIN</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-6" style={{ color: 'hsl(0 0% 40%)' }}>
          Forces Armées Royales • Centre Sportif Maâmoura
        </p>
      </div>
    </div>
  );
};

export default Login;

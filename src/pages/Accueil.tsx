import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, ChevronRight, BookOpen, Users, Layers, Award, 
  GraduationCap, TrendingUp, Shield, Target, Star
} from 'lucide-react';
import Layout from '@/components/Layout';
import { 
  getCourseTypes, getUserMode, getSportCourses, 
  getCourseTitles, getFiles, getStages, getStudentAccounts,
  getAppSettings, getEnabledStages
} from '@/lib/storage';
import { Stage } from '@/types';
import { useClickSound } from '@/hooks/useClickSound';
import bgImage from '@/assets/bg2.jpg';
import logoOfficial from '@/assets/logo-official.png';

// Stage Card Component - Memoized for performance
const StageCard = memo(({ stage, onClick, courseCount }: { 
  stage: Stage; 
  onClick: () => void; 
  courseCount: number;
}) => {
  const stageColors: Record<string, string> = {
    'aide_moniteur': 'from-amber-500/30 to-amber-600/10 border-amber-500/40',
    'app': 'from-blue-500/30 to-blue-600/10 border-blue-500/40',
    'cat1': 'from-green-500/30 to-green-600/10 border-green-500/40',
    'cat2': 'from-emerald-500/30 to-emerald-600/10 border-emerald-500/40',
    'be': 'from-purple-500/30 to-purple-600/10 border-purple-500/40',
    'bs': 'from-indigo-500/30 to-indigo-600/10 border-indigo-500/40',
    'moniteur': 'from-orange-500/30 to-orange-600/10 border-orange-500/40',
    'off': 'from-red-500/30 to-red-600/10 border-red-500/40',
  };

  const colorClass = stageColors[stage.id] || 'from-primary/30 to-primary/10 border-primary/40';

  return (
    <button
      onClick={onClick}
      className={`glass-card p-6 text-left hover:scale-105 transition-all duration-300 group relative overflow-hidden border-2 bg-gradient-to-br ${colorClass}`}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-2xl font-bold group-hover:text-primary transition-colors">
            {stage.name}
          </h3>
          <span className="badge-gold text-xs">
            {courseCount} cours
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {stage.description}
        </p>
        <div className="flex items-center text-sm text-muted-foreground group-hover:text-primary transition-colors">
          <span>Accéder aux cours</span>
          <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
});

StageCard.displayName = 'StageCard';

// Stats Card Component - Memoized
const StatCard = memo(({ icon: Icon, label, value, color = 'primary' }: { 
  icon: React.ElementType; 
  label: string; 
  value: number | string;
  color?: 'primary' | 'success' | 'accent';
}) => {
  const colorClasses = {
    primary: 'from-primary/20 to-primary/5 border-primary/30 text-primary',
    success: 'from-success/20 to-success/5 border-success/30 text-success',
    accent: 'from-accent/20 to-accent/5 border-accent/30 text-accent',
  };

  return (
    <div className={`stat-card-gold flex items-center gap-4`}>
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold gold-text">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
});

StatCard.displayName = 'StatCard';

const Accueil = () => {
  const [stages, setStages] = useState<Stage[]>([]);
  const navigate = useNavigate();
  const userMode = getUserMode();
  const { playClick } = useClickSound();
  const appSettings = getAppSettings();

  // Memoized statistics
  const stats = useMemo(() => {
    const courses = getSportCourses();
    const titles = getCourseTitles();
    const files = getFiles();
    const allStages = getStages();
    const students = getStudentAccounts();
    const courseTypes = getCourseTypes();
    
    return {
      totalCourses: courses.length,
      totalTitles: titles.length,
      totalFiles: files.length,
      activeStages: allStages.filter(s => s.enabled).length,
      totalStudents: students.length,
      totalTypes: courseTypes.length,
    };
  }, []);

  // Course counts by stage
  const courseCounts = useMemo(() => {
    const courses = getSportCourses();
    const counts: Record<string, number> = {};
    stages.forEach(stage => {
      counts[stage.id] = courses.filter(c => c.stageId === stage.id).length;
    });
    return counts;
  }, [stages]);

  useEffect(() => {
    if (!userMode) {
      navigate('/');
      return;
    }
    setStages(getEnabledStages());
  }, [userMode, navigate]);

  const handleStageClick = useCallback((stage: Stage) => {
    playClick();
    navigate(`/stage/${stage.id}`);
  }, [navigate, playClick]);

  const handleManageClick = useCallback(() => {
    playClick();
    navigate('/gestion-cours');
  }, [navigate, playClick]);

  const logoSrc = appSettings.customLogo || logoOfficial;

  return (
    <Layout backgroundImage={bgImage}>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Hero Section - Clean Design */}
        <div className="glass-panel p-8 animate-fade-in">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* Single Logo */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-card to-muted p-2 shadow-gold border border-gold">
                <img 
                  src={logoSrc} 
                  alt="CSM Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Description */}
            <div className="flex-1 text-center lg:text-left">
              <h1 className="text-3xl lg:text-4xl font-bold mb-3">
                Centre Sportif <span className="gold-text">FAR</span>
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl">
                lateforme officielle de gestion des cours sportifs et militaires du Centre Sportif FAR. encadré par le chef d'instruction.
              </p>
              <div className="flex flex-wrap gap-3 mt-4 justify-center lg:justify-start">
                <span className="badge-gold flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Formation Militaire
                </span>
                <span className="badge-gold flex items-center gap-1">
                  <Target className="w-3 h-3" /> Excellence Sportive
                </span>
                <span className="badge-gold flex items-center gap-1">
                  <Award className="w-3 h-3" /> FAR Maâmoura
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            icon={Layers} 
            label="Stages" 
            value={stats.activeStages} 
            color="primary"
          />
          <StatCard 
            icon={BookOpen} 
            label="Leçons" 
            value={stats.totalCourses} 
            color="success"
          />
          <StatCard 
            icon={GraduationCap} 
            label="Cours" 
            value={stats.totalTitles} 
            color="accent"
          />
          <StatCard 
            icon={Users} 
            label="Élèves" 
            value={stats.totalStudents} 
            color="primary"
          />
        </div>

        {/* Quick Stats Bar */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-success" />
                <span className="text-sm">
                  <strong className="text-success">{stats.totalFiles}</strong> fichiers disponibles
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                <span className="text-sm">
                  <strong className="text-primary">{stats.totalTypes}</strong> catégories de cours
                </span>
              </div>
            </div>
            {userMode === 'admin' && (
              <button 
                onClick={handleManageClick}
                className="btn-primary text-sm py-2"
              >
                <Plus className="w-4 h-4" />
                Gérer les Cours
              </button>
            )}
          </div>
        </div>

        {/* Stage Cards - Main Navigation */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Sélectionnez votre Stage
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {stages.map((stage) => (
              <StageCard 
                key={stage.id} 
                stage={stage} 
                onClick={() => handleStageClick(stage)}
                courseCount={courseCounts[stage.id] || 0}
              />
            ))}
          </div>
        </div>

        {/* Admin Quick Actions */}
        {userMode === 'admin' && stages.length === 0 && (
          <div className="glass-card p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Plus className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Aucun stage actif</h3>
            <p className="text-muted-foreground mb-4">
              Activez des stages dans les paramètres pour commencer
            </p>
            <button 
              onClick={handleManageClick}
              className="btn-primary"
            >
              <Plus className="w-5 h-5" />
              Gérer les Stages
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Accueil;
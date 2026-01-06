import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, ChevronRight, BookOpen, Users, Layers, Award, 
  GraduationCap, TrendingUp, Shield, Target, Star
} from 'lucide-react';
import Layout from '@/components/Layout';
import { 
  getCourseTypes, getUserMode, getSportCourses, 
  getCourseTitles, getFiles, getStages, getStudentAccounts,
  getAppSettings
} from '@/lib/storage';
import { CourseType } from '@/types';
import { getSportImage } from '@/assets/sports';
import { useClickSound } from '@/hooks/useClickSound';
import bgImage from '@/assets/bg2.jpg';
import logoOfficial from '@/assets/logo-official.png';
import farBadge from '@/assets/far-badge.png';

// Memoized Course Card
const CourseCard = ({ type, onClick, courseCount }: { type: CourseType; onClick: () => void; courseCount: number }) => {
  const defaultImageKey = type.name.toLowerCase().includes('milit') ? 'militaire' : 'sportif';
  const imageSrc = type.image || getSportImage(defaultImageKey);
  
  return (
    <div 
      className="course-card group h-56 animate-fade-in"
      onClick={onClick}
    >
      <img 
        src={imageSrc}
        alt={type.name}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        loading="lazy"
      />
      <div className="course-card-overlay">
        <div className="flex items-center gap-2 mb-2">
          <span className="badge-gold">
            {courseCount} cours
          </span>
        </div>
        <h2 className="text-xl font-bold text-white mb-1">
          Cours {type.name}
        </h2>
        <p className="text-sm text-white/70 line-clamp-2">
          {type.description || `Découvrez nos cours ${type.name.toLowerCase()}`}
        </p>
        <button className="mt-3 flex items-center gap-2 text-primary text-sm font-medium group-hover:gap-3 transition-all">
          Explorer <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Stats Card Component
const StatCard = ({ icon: Icon, label, value, color = 'primary' }: { 
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
};

const Accueil = () => {
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);
  const navigate = useNavigate();
  const userMode = getUserMode();
  const { playClick } = useClickSound();
  const appSettings = getAppSettings();

  // Memoized statistics
  const stats = useMemo(() => {
    const courses = getSportCourses();
    const titles = getCourseTitles();
    const files = getFiles();
    const stages = getStages();
    const students = getStudentAccounts();
    
    return {
      totalCourses: courses.length,
      totalTitles: titles.length,
      totalFiles: files.length,
      activeStages: stages.filter(s => s.enabled).length,
      totalStudents: students.length,
    };
  }, []);

  // Course counts by type
  const courseCounts = useMemo(() => {
    const courses = getSportCourses();
    const counts: Record<string, number> = {};
    courseTypes.forEach(type => {
      counts[type.id] = courses.filter(c => c.courseTypeId === type.id).length;
    });
    return counts;
  }, [courseTypes]);

  useEffect(() => {
    if (!userMode) {
      navigate('/');
      return;
    }
    setCourseTypes(getCourseTypes());
  }, [userMode, navigate]);

  const handleTypeClick = useCallback((type: CourseType) => {
    playClick();
    navigate(`/cours/${type.id}`);
  }, [navigate, playClick]);

  const handleAddClick = useCallback(() => {
    playClick();
    navigate('/gestion-cours');
  }, [navigate, playClick]);

  const logoSrc = appSettings.customLogo || logoOfficial;

  return (
    <Layout backgroundImage={bgImage}>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Hero Section with FAR Branding */}
        <div className="glass-panel p-8 animate-fade-in">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* Logos Container */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-card to-muted p-2 shadow-gold border border-gold">
                <img 
                  src={logoSrc} 
                  alt="CSM Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 p-2 border border-primary/30 flex items-center justify-center">
                <img 
                  src={farBadge} 
                  alt="FAR Badge" 
                  className="w-full h-full object-contain drop-shadow"
                />
              </div>
            </div>

            {/* Description */}
            <div className="flex-1 text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-2 mb-2">
                <Star className="w-5 h-5 text-primary fill-primary" />
                <span className="text-primary font-semibold text-sm">المملكة المغربية - القوات المسلحة الملكية</span>
                <Star className="w-5 h-5 text-primary fill-primary" />
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold mb-3">
                Centre Sportif <span className="gold-text">Militaire</span>
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl">
                Plateforme officielle de gestion des cours sportifs et militaires des Forces Armées Royales. 
                Formation d'excellence pour les stagiaires de la caserne FAR Maâmoura.
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
            icon={BookOpen} 
            label="Cours" 
            value={stats.totalCourses} 
            color="primary"
          />
          <StatCard 
            icon={Layers} 
            label="Stages Actifs" 
            value={stats.activeStages} 
            color="success"
          />
          <StatCard 
            icon={GraduationCap} 
            label="Leçons" 
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
                  <strong className="text-primary">{courseTypes.length}</strong> catégories de cours
                </span>
              </div>
            </div>
            {userMode === 'admin' && (
              <button 
                onClick={handleAddClick}
                className="btn-primary text-sm py-2"
              >
                <Plus className="w-4 h-4" />
                Gérer les Cours
              </button>
            )}
          </div>
        </div>

        {/* Course Type Cards */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Catégories de Cours
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courseTypes.map((type) => (
              <CourseCard 
                key={type.id} 
                type={type} 
                onClick={() => handleTypeClick(type)}
                courseCount={courseCounts[type.id] || 0}
              />
            ))}
          </div>
        </div>

        {/* Admin Quick Actions */}
        {userMode === 'admin' && courseTypes.length === 0 && (
          <div className="glass-card p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Plus className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Aucune catégorie</h3>
            <p className="text-muted-foreground mb-4">
              Commencez par ajouter des catégories de cours
            </p>
            <button 
              onClick={handleAddClick}
              className="btn-primary"
            >
              <Plus className="w-5 h-5" />
              Ajouter une Catégorie
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Accueil;

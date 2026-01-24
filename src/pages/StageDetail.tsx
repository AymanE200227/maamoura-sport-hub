import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, ArrowLeft, BookOpen, Dumbbell, Shield } from 'lucide-react';
import Layout from '@/components/Layout';
import { 
  getStages, 
  getCourseTypes, 
  getSportCoursesByTypeAndStage,
  getUserMode 
} from '@/lib/storage';
import { Stage, CourseType } from '@/types';
import { getSportImage } from '@/assets/sports';
import { useClickSound } from '@/hooks/useClickSound';
import bgImage from '@/assets/bg3.jpg';

// Memoized course type card for performance
const CourseTypeCard = memo(({ type, courseCount, imageSrc, onClick }: {
  type: CourseType;
  courseCount: number;
  imageSrc: string;
  onClick: () => void;
}) => {
  const getTypeIcon = (typeName: string) => {
    if (typeName.toLowerCase().includes('milit')) return Shield;
    if (typeName.toLowerCase().includes('sport') || typeName.toLowerCase().includes('specialite')) return Dumbbell;
    return BookOpen;
  };

  const Icon = getTypeIcon(type.name);

  return (
    <button
      onClick={onClick}
      className="course-card group h-56 text-left"
    >
      <img 
        src={imageSrc}
        alt={type.name}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        loading="lazy"
      />
      <div className="course-card-overlay">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <span className="badge-gold text-xs">
              {courseCount} leçons
            </span>
          </div>
        </div>
        <h2 className="text-xl font-bold text-white mb-1">
          {`P.${type.name.toUpperCase().replace(/^(P\.)+/, '')}`}
        </h2>
        <p className="text-sm text-white/70 line-clamp-2">
          {type.description || `Programme ${type.name.toLowerCase()}`}
        </p>
        <div className="mt-3 flex items-center text-primary text-sm font-medium group-hover:gap-3 transition-all">
          <span>Voir les leçons</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </button>
  );
});

CourseTypeCard.displayName = 'CourseTypeCard';

const StageDetail = () => {
  const { stageId } = useParams<{ stageId: string }>();
  const navigate = useNavigate();
  const { playClick } = useClickSound();
  
  const [stage, setStage] = useState<Stage | null>(null);
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);
  
  const userMode = getUserMode();

  useEffect(() => {
    if (!userMode) {
      navigate('/');
      return;
    }
    loadData();
  }, [stageId, userMode, navigate]);

  const loadData = () => {
    const stages = getStages();
    const foundStage = stages.find(s => s.id === stageId);
    if (foundStage) {
      setStage(foundStage);
      setCourseTypes(getCourseTypes());
    }
  };

  // Course counts by type for this stage
  const courseCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    courseTypes.forEach(type => {
      counts[type.id] = getSportCoursesByTypeAndStage(type.id, stageId!).length;
    });
    return counts;
  }, [courseTypes, stageId]);

  const handleTypeClick = useCallback((type: CourseType) => {
    playClick();
    navigate(`/stage/${stageId}/type/${type.id}`);
  }, [navigate, stageId, playClick]);

  const handleBack = useCallback(() => {
    playClick();
    navigate('/accueil');
  }, [navigate, playClick]);

  const getTypeIcon = (typeName: string) => {
    if (typeName.toLowerCase().includes('milit')) return Shield;
    if (typeName.toLowerCase().includes('sport') || typeName.toLowerCase().includes('specialite')) return Dumbbell;
    return BookOpen;
  };

  if (!stage) return null;

  return (
    <Layout backgroundImage={bgImage}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={handleBack} className="p-2 bg-card/80 rounded-full hover:bg-card transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold">Stage {stage.name}</h1>
          <p className="text-muted-foreground">
            Sélectionnez une catégorie de cours
          </p>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <button onClick={handleBack} className="hover:text-primary transition-colors">
          Accueil
        </button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground font-medium">{stage.name}</span>
      </div>

      {/* Course Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
        {courseTypes.map((type) => {
          const defaultImageKey = type.name.toLowerCase().includes('milit') ? 'militaire' : 'sportif';
          const imageSrc = type.image || getSportImage(defaultImageKey);
          
          return (
            <CourseTypeCard
              key={type.id}
              type={type}
              courseCount={courseCounts[type.id] || 0}
              imageSrc={imageSrc}
              onClick={() => handleTypeClick(type)}
            />
          );
        })}
      </div>

      {courseTypes.length === 0 && (
        <div className="glass-card p-8 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucune catégorie disponible</h3>
          <p className="text-muted-foreground">
            Ajoutez des catégories de cours dans la gestion des cours
          </p>
        </div>
      )}
    </Layout>
  );
};

export default StageDetail;
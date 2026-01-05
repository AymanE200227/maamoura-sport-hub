import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, ArrowLeft, Lock } from 'lucide-react';
import Layout from '@/components/Layout';
import { 
  getCourseTypes, 
  getEnabledStages,
  getSportCoursesByTypeAndStage,
  getUserMode 
} from '@/lib/storage';
import { CourseType, Stage, SportCourse } from '@/types';
import { getSportImage } from '@/assets/sports';
import { useClickSound } from '@/hooks/useClickSound';
import bgImage from '@/assets/bg3.jpg';

const CoursDetail = () => {
  const { typeId } = useParams<{ typeId: string }>();
  const navigate = useNavigate();
  const { playClick } = useClickSound();
  
  const [courseType, setCourseType] = useState<CourseType | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [sportCourses, setSportCourses] = useState<SportCourse[]>([]);
  
  const userMode = getUserMode();

  useEffect(() => {
    if (!userMode) {
      navigate('/');
      return;
    }
    loadData();
  }, [typeId, userMode, navigate]);

  const loadData = () => {
    const types = getCourseTypes();
    const type = types.find(t => t.id === typeId);
    if (type) {
      setCourseType(type);
      setStages(getEnabledStages());
    }
  };

  const handleStageSelect = useCallback((stage: Stage) => {
    playClick();
    setSelectedStage(stage);
    if (typeId) {
      const courses = getSportCoursesByTypeAndStage(typeId, stage.id);
      setSportCourses(courses);
    }
  }, [typeId, playClick]);

  const handleCourseSelect = useCallback((course: SportCourse) => {
    playClick();
    navigate(`/cours/${typeId}/stage/${selectedStage?.id}/course/${course.id}`);
  }, [navigate, typeId, selectedStage, playClick]);

  const handleBack = useCallback(() => {
    playClick();
    if (selectedStage) {
      setSelectedStage(null);
      setSportCourses([]);
    } else {
      navigate('/accueil');
    }
  }, [selectedStage, navigate, playClick]);

  if (!courseType) return null;

  return (
    <Layout backgroundImage={bgImage}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={handleBack} className="p-2 bg-card/80 rounded-full hover:bg-card transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold">Cours {courseType.name}</h1>
          <p className="text-muted-foreground">
            {selectedStage ? `Stage: ${selectedStage.name}` : 'Sélectionnez un stage'}
          </p>
        </div>
      </div>

      {/* Stage Selection */}
      {!selectedStage && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in">
          {stages.map((stage) => (
            <button
              key={stage.id}
              onClick={() => handleStageSelect(stage)}
              className="glass-card p-6 text-left hover:bg-card/80 transition-all duration-300 group relative overflow-hidden"
            >
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                  {stage.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {stage.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {getSportCoursesByTypeAndStage(typeId!, stage.id).length} cours
                  </span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      )}

      {/* Sport Courses List */}
      {selectedStage && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {sportCourses.map((course) => (
            <button
              key={course.id}
              onClick={() => handleCourseSelect(course)}
              className="course-card group h-48 text-left"
            >
              <img 
                src={course.image.startsWith('data:') ? course.image : getSportImage(course.image)} 
                alt={course.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
              <div className="course-card-overlay">
                <h3 className="text-xl font-bold mb-1">{course.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                <div className="mt-2 flex items-center text-xs text-muted-foreground">
                  <span>Cliquer pour voir les cours</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </button>
          ))}

          {sportCourses.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun cours disponible pour ce stage</p>
              {userMode === 'admin' && (
                <button 
                  onClick={() => navigate('/gestion-cours')}
                  className="btn-primary mt-4"
                >
                  Ajouter des cours
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </Layout>
  );
};

export default CoursDetail;

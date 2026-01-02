import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight } from 'lucide-react';
import Layout from '@/components/Layout';
import { getCourseTypes, getUserMode, getSportCoursesByType } from '@/lib/storage';
import { CourseType } from '@/types';
import { getSportImage } from '@/assets/sports';
import bgImage from '@/assets/bg2.jpg';

const Accueil = () => {
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);
  const [selectedType, setSelectedType] = useState<CourseType | null>(null);
  const navigate = useNavigate();
  const userMode = getUserMode();

  useEffect(() => {
    if (!userMode) {
      navigate('/');
      return;
    }
    loadCourseTypes();
  }, [userMode, navigate]);

  const loadCourseTypes = () => {
    const types = getCourseTypes();
    setCourseTypes(types);
  };

  const handleTypeClick = (type: CourseType) => {
    setSelectedType(type);
    navigate(`/cours/${type.id}`);
  };

  return (
    <Layout backgroundImage={bgImage}>
      <div className="max-w-5xl mx-auto">
        {/* Course Type Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {courseTypes.map((type) => {
            const courses = getSportCoursesByType(type.id);
            const imageKey = type.name.toLowerCase().includes('milit') ? 'militaire' : 'sportif';
            
            return (
              <div 
                key={type.id}
                className="course-card group h-64 animate-fade-in"
                onClick={() => handleTypeClick(type)}
              >
                <img 
                  src={getSportImage(imageKey)}
                  alt={type.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="course-card-overlay">
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Cours {type.name}
                  </h2>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {type.description || `Découvrez nos cours ${type.name.toLowerCase()}`}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {courses.length} cours disponibles
                    </span>
                    <button className="p-2 bg-muted/50 rounded-full hover:bg-primary transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Course Type Button - Admin Only */}
        {userMode === 'admin' && (
          <div className="flex justify-center">
            <button 
              onClick={() => navigate('/gestion-cours')}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Ajouter Type de Cours
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Accueil;

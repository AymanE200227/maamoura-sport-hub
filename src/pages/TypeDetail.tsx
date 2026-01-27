import { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, ArrowLeft, Lock, Plus, X, Upload, Shield } from 'lucide-react';
import Layout from '@/components/Layout';
import ArabicInput from '@/components/ArabicInput';
import { 
  getCourseTypes, 
  getStages,
  getSportCoursesByTypeAndStage,
  addSportCourse,
  getUserMode 
} from '@/lib/storage';
import { canAccess, canAccessStage } from '@/lib/permissions';
import { CourseType, Stage, SportCourse, UserRole } from '@/types';
import { getSportImage, imageCategories, categoryLabels } from '@/assets/sports';
import { useClickSound } from '@/hooks/useClickSound';
import { useToast } from '@/hooks/use-toast';
import bgImage from '@/assets/bg3.jpg';
import { formatCourseTypeLabel } from '@/lib/courseTypeFormat';

// Memoized course card for performance
const CourseCard = memo(({ course, onClick, locked }: { 
  course: SportCourse; 
  onClick: () => void;
  locked?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={locked}
    className={`course-card group h-48 text-left ${locked ? 'opacity-60 cursor-not-allowed' : ''}`}
  >
    <img 
      src={course.image.startsWith('data:') ? course.image : getSportImage(course.image)} 
      alt={course.title}
      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
      loading="lazy"
    />
    <div className="course-card-overlay">
      {locked && (
        <div className="absolute top-2 right-2">
          <Lock className="w-5 h-5 text-destructive" />
        </div>
      )}
      <h3 className="text-xl font-bold mb-1">{course.title}</h3>
      <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
      <div className="mt-2 flex items-center text-xs text-muted-foreground">
        <span>{locked ? 'Accès restreint' : 'Voir les cours'}</span>
        <ChevronRight className="w-4 h-4 ml-1" />
      </div>
    </div>
  </button>
));

CourseCard.displayName = 'CourseCard';

const TypeDetail = () => {
  const { stageId, typeId } = useParams<{ stageId: string; typeId: string }>();
  const navigate = useNavigate();
  const { playClick } = useClickSound();
  const { toast } = useToast();
  
  const [stage, setStage] = useState<Stage | null>(null);
  const [courseType, setCourseType] = useState<CourseType | null>(null);
  const [sportCourses, setSportCourses] = useState<SportCourse[]>([]);
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    image: 'basketball',
    customImage: ''
  });
  
  const userMode = getUserMode();

  // Map user mode to role for permissions
  const userRole: UserRole = useMemo(() => {
    if (userMode === 'admin') return 'admin';
    if (userMode === 'user') return 'instructeur';
    if (userMode === 'eleve') return 'eleve';
    return 'eleve';
  }, [userMode]);

  useEffect(() => {
    if (!userMode) {
      navigate('/');
      return;
    }
    loadData();
  }, [stageId, typeId, userMode, userRole, navigate]);

  const loadData = () => {
    const stages = getStages();
    const types = getCourseTypes();
    
    const foundStage = stages.find(s => s.id === stageId);
    const foundType = types.find(t => t.id === typeId);
    
    if (foundStage && foundType) {
      // Check permission to access stage
      if (!canAccessStage(userRole, foundStage.id)) {
        toast({ title: 'Accès refusé', description: 'Vous n\'avez pas accès à ce stage', variant: 'destructive' });
        navigate('/accueil');
        return;
      }
      
      setStage(foundStage);
      setCourseType(foundType);
      
      // Filter courses by permissions (but show locked for admin)
      const allCourses = getSportCoursesByTypeAndStage(typeId!, stageId!);
      setSportCourses(allCourses);
    }
  };

  // Check if a course is accessible
  const isCourseAccessible = useCallback((course: SportCourse) => {
    return canAccess(userRole, 'lecon', course.id);
  }, [userRole]);

  const refreshCourses = () => {
    if (typeId && stageId) {
      setSportCourses(getSportCoursesByTypeAndStage(typeId, stageId));
    }
  };

  const handleCourseSelect = useCallback((course: SportCourse) => {
    // Check if course is accessible
    if (!isCourseAccessible(course)) {
      toast({ title: 'Accès refusé', description: 'Vous n\'avez pas accès à cette leçon', variant: 'destructive' });
      return;
    }
    playClick();
    navigate(`/stage/${stageId}/type/${typeId}/lecon/${course.id}`);
  }, [navigate, stageId, typeId, playClick, isCourseAccessible, toast]);

  const handleBack = useCallback(() => {
    playClick();
    navigate(`/stage/${stageId}`);
  }, [navigate, stageId, playClick]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCourseForm(prev => ({ ...prev, customImage: reader.result as string, image: 'custom' }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddCourse = () => {
    if (!courseForm.title.trim()) {
      toast({ title: 'Erreur', description: 'Le titre est requis', variant: 'destructive' });
      return;
    }

    addSportCourse({
      courseTypeId: typeId!,
      stageId: stageId!,
      title: courseForm.title,
      description: courseForm.description,
      image: courseForm.image === 'custom' ? courseForm.customImage : courseForm.image
    });

    toast({ title: 'Leçon ajoutée', description: 'La leçon a été ajoutée avec succès' });
    setCourseForm({ title: '', description: '', image: 'basketball', customImage: '' });
    setShowAddModal(false);
    refreshCourses();
  };

  const openAddModal = () => {
    playClick();
    setCourseForm({ title: '', description: '', image: 'basketball', customImage: '' });
    setShowAddModal(true);
  };

  if (!stage || !courseType) return null;

  return (
    <Layout backgroundImage={bgImage}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={handleBack} className="p-2 bg-card/80 rounded-full hover:bg-card transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold">{stage.name} - {formatCourseTypeLabel(courseType.name)}</h1>
          <p className="text-muted-foreground">
            Sélectionnez une leçon
          </p>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 flex-wrap">
        <button onClick={() => navigate('/accueil')} className="hover:text-primary transition-colors">
          Accueil
        </button>
        <ChevronRight className="w-4 h-4" />
        <button onClick={handleBack} className="hover:text-primary transition-colors">
          {stage.name}
        </button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground font-medium">{formatCourseTypeLabel(courseType.name)}</span>
      </div>

      {/* Sport Courses (Leçons) as Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
        {sportCourses.map((course) => {
          const accessible = isCourseAccessible(course);
          return (
            <CourseCard
              key={course.id}
              course={course}
              onClick={() => handleCourseSelect(course)}
              locked={!accessible}
            />
          );
        })}

        {sportCourses.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Aucune leçon disponible pour cette catégorie</p>
            {userMode === 'admin' && (
              <button 
                onClick={openAddModal}
                className="btn-primary flex items-center gap-2 mx-auto"
              >
                <Plus className="w-5 h-5" />
                Ajouter une leçon
              </button>
            )}
          </div>
        )}

        {/* Add Button for Admin when courses exist */}
        {userMode === 'admin' && sportCourses.length > 0 && (
          <button
            onClick={openAddModal}
            className="glass-card h-48 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all group"
          >
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
              <Plus className="w-8 h-8 text-primary" />
            </div>
            <span className="font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              Ajouter une leçon
            </span>
          </button>
        )}
      </div>

      {/* Add Course Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" style={{ zIndex: 9999 }}>
          <div className="glass-card w-full max-w-lg animate-scale-in my-8 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-border/30 shrink-0">
              <div>
                <h3 className="text-lg font-semibold">Ajouter une Leçon</h3>
                <p className="text-sm text-muted-foreground">
                  {stage.name} • P.{courseType.name.toUpperCase()}
                </p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Titre de la leçon *</label>
                <ArabicInput
                  value={courseForm.title}
                  onChange={(value) => setCourseForm(prev => ({ ...prev, title: value }))}
                  className="glass-input w-full p-3 pr-16"
                  placeholder="Ex: Basketball, Anatomie, etc."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <ArabicInput
                  value={courseForm.description}
                  onChange={(value) => setCourseForm(prev => ({ ...prev, description: value }))}
                  className="glass-input w-full p-3 pr-16 min-h-[80px]"
                  placeholder="Description de la leçon..."
                  multiline
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Image</label>
                <div className="space-y-3 max-h-48 overflow-y-auto p-2 bg-muted/20 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">{categoryLabels.ballSports}</p>
                  <div className="grid grid-cols-5 gap-1">
                    {imageCategories.ballSports.map(img => (
                      <button
                        key={img}
                        type="button"
                        onClick={() => setCourseForm(prev => ({ ...prev, image: img, customImage: '' }))}
                        className={`p-0.5 rounded border-2 transition-all ${
                          courseForm.image === img 
                            ? 'border-primary ring-2 ring-primary/30' 
                            : 'border-transparent hover:border-border'
                        }`}
                      >
                        <img src={getSportImage(img)} alt={img} className="w-full h-8 object-cover rounded" />
                      </button>
                    ))}
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-1 mt-2">{categoryLabels.combatSports}</p>
                  <div className="grid grid-cols-5 gap-1">
                    {imageCategories.combatSports.map(img => (
                      <button
                        key={img}
                        type="button"
                        onClick={() => setCourseForm(prev => ({ ...prev, image: img, customImage: '' }))}
                        className={`p-0.5 rounded border-2 transition-all ${
                          courseForm.image === img 
                            ? 'border-primary ring-2 ring-primary/30' 
                            : 'border-transparent hover:border-border'
                        }`}
                      >
                        <img src={getSportImage(img)} alt={img} className="w-full h-8 object-cover rounded" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Ou image personnalisée</label>
                <label className="flex items-center gap-2 btn-ghost border border-dashed border-border cursor-pointer justify-center py-3">
                  <Upload className="w-5 h-5" />
                  <span>{courseForm.customImage ? 'Image sélectionnée' : 'Choisir une image'}</span>
                  <input type="file" onChange={handleImageUpload} accept="image/*" className="hidden" />
                </label>
                {courseForm.customImage && (
                  <div className="mt-2 relative">
                    <img src={courseForm.customImage} alt="Preview" className="w-full h-20 object-cover rounded" />
                    <button 
                      type="button"
                      onClick={() => setCourseForm(prev => ({ ...prev, customImage: '', image: 'basketball' }))}
                      className="absolute top-1 right-1 p-1 bg-destructive rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 p-6 pt-4 border-t border-border/30 shrink-0 bg-background/50">
              <button onClick={handleAddCourse} className="btn-success flex-1 py-3 font-medium">
                Ajouter la leçon
              </button>
              <button onClick={() => setShowAddModal(false)} className="btn-ghost border border-border py-3 px-6">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default TypeDetail;
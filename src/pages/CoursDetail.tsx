import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, ArrowLeft, Lock, Plus, X, Upload } from 'lucide-react';
import Layout from '@/components/Layout';
import ArabicInput from '@/components/ArabicInput';
import { 
  getCourseTypes, 
  getEnabledStages,
  getSportCoursesByTypeAndStage,
  addSportCourse,
  getStages,
  getUserMode 
} from '@/lib/storage';
import { CourseType, Stage, SportCourse } from '@/types';
import { getSportImage, imageCategories, categoryLabels } from '@/assets/sports';
import { useClickSound } from '@/hooks/useClickSound';
import { useToast } from '@/hooks/use-toast';
import bgImage from '@/assets/bg3.jpg';

const CoursDetail = () => {
  const { typeId } = useParams<{ typeId: string }>();
  const navigate = useNavigate();
  const { playClick } = useClickSound();
  const { toast } = useToast();
  
  const [courseType, setCourseType] = useState<CourseType | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
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

  const refreshCourses = () => {
    if (typeId && selectedStage) {
      const courses = getSportCoursesByTypeAndStage(typeId, selectedStage.id);
      setSportCourses(courses);
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
      stageId: selectedStage!.id,
      title: courseForm.title,
      description: courseForm.description,
      image: courseForm.image === 'custom' ? courseForm.customImage : courseForm.image
    });

    toast({ title: 'Cours ajouté', description: 'Le cours a été ajouté avec succès' });
    setCourseForm({ title: '', description: '', image: 'basketball', customImage: '' });
    setShowAddModal(false);
    refreshCourses();
  };

  const openAddModal = () => {
    playClick();
    setCourseForm({ title: '', description: '', image: 'basketball', customImage: '' });
    setShowAddModal(true);
  };

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
              <p className="text-muted-foreground mb-4">Aucun cours disponible pour ce stage</p>
              {userMode === 'admin' && (
                <button 
                  onClick={openAddModal}
                  className="btn-primary flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-5 h-5" />
                  Ajouter des cours
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
                Ajouter un cours
              </span>
            </button>
          )}
        </div>
      )}

      {/* Add Course Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" style={{ zIndex: 9999 }}>
          <div className="glass-card w-full max-w-lg animate-scale-in my-8 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-border/30 shrink-0">
              <div>
                <h3 className="text-lg font-semibold">Ajouter un Cours</h3>
                <p className="text-sm text-muted-foreground">
                  {courseType.name} • {selectedStage?.name}
                </p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Titre du cours *</label>
                <ArabicInput
                  value={courseForm.title}
                  onChange={(value) => setCourseForm(prev => ({ ...prev, title: value }))}
                  className="glass-input w-full p-3 pr-16"
                  placeholder="Ex: Initiation au Basketball"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <ArabicInput
                  value={courseForm.description}
                  onChange={(value) => setCourseForm(prev => ({ ...prev, description: value }))}
                  className="glass-input w-full p-3 pr-16 min-h-[80px]"
                  placeholder="Description du cours..."
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
                Ajouter le cours
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

export default CoursDetail;
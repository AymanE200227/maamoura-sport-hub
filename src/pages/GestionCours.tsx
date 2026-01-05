import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, X, Upload } from 'lucide-react';
import Layout from '@/components/Layout';
import ArabicInput from '@/components/ArabicInput';
import { 
  getCourseTypes, 
  addCourseType, 
  updateCourseType, 
  deleteCourseType,
  getSportCourses,
  addSportCourse,
  updateSportCourse,
  deleteSportCourse,
  getUserMode 
} from '@/lib/storage';
import { CourseType, SportCourse } from '@/types';
import { getSportImage, imageCategories, categoryLabels } from '@/assets/sports';
import { useToast } from '@/hooks/use-toast';
import bgImage from '@/assets/bg4.jpg';

const GestionCours = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const userMode = getUserMode();
  
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);
  const [sportCourses, setSportCourses] = useState<SportCourse[]>([]);
  
  // Type form state
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [editingType, setEditingType] = useState<CourseType | null>(null);
  const [typeForm, setTypeForm] = useState({ name: '', description: '', image: '' });
  
  // Course form state
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<SportCourse | null>(null);
  const [courseForm, setCourseForm] = useState({
    courseTypeId: '',
    title: '',
    description: '',
    image: 'basketball',
    customImage: ''
  });
  
  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'type' | 'course', id: string, name: string } | null>(null);

  useEffect(() => {
    if (userMode !== 'admin') {
      navigate('/accueil');
      return;
    }
    loadData();
  }, [userMode, navigate]);

  const loadData = () => {
    setCourseTypes(getCourseTypes());
    setSportCourses(getSportCourses());
  };

  // Handle image upload for course type
  const handleTypeImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setTypeForm(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle image upload for sport course
  const handleCourseImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCourseForm(prev => ({ ...prev, customImage: reader.result as string, image: 'custom' }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Course Type CRUD
  const handleAddType = () => {
    setEditingType(null);
    setTypeForm({ name: '', description: '', image: '' });
    setShowTypeForm(true);
  };

  const handleEditType = (type: CourseType) => {
    setEditingType(type);
    setTypeForm({ name: type.name, description: type.description || '', image: type.image || '' });
    setShowTypeForm(true);
  };

  const handleSaveType = () => {
    if (!typeForm.name.trim()) {
      toast({ title: 'Erreur', description: 'Le nom est requis', variant: 'destructive' });
      return;
    }

    if (editingType) {
      updateCourseType(editingType.id, typeForm);
      toast({ title: 'Type modifié', description: 'Le type de cours a été mis à jour' });
    } else {
      addCourseType(typeForm);
      toast({ title: 'Type ajouté', description: 'Le type de cours a été ajouté' });
    }

    loadData();
    setShowTypeForm(false);
    setEditingType(null);
  };

  const handleDeleteType = () => {
    if (deleteConfirm?.type === 'type') {
      deleteCourseType(deleteConfirm.id);
      toast({ title: 'Type supprimé', description: 'Le type de cours a été supprimé' });
      loadData();
      setDeleteConfirm(null);
    }
  };

  // Sport Course CRUD
  const handleAddCourse = () => {
    setEditingCourse(null);
    setCourseForm({
      courseTypeId: courseTypes[0]?.id || '',
      title: '',
      description: '',
      image: 'basketball',
      customImage: ''
    });
    setShowCourseForm(true);
  };

  const handleEditCourse = (course: SportCourse) => {
    setEditingCourse(course);
    const isCustom = course.image.startsWith('data:');
    setCourseForm({
      courseTypeId: course.courseTypeId,
      title: course.title,
      description: course.description,
      image: isCustom ? 'custom' : course.image,
      customImage: isCustom ? course.image : ''
    });
    setShowCourseForm(true);
  };

  const handleSaveCourse = () => {
    if (!courseForm.title.trim() || !courseForm.courseTypeId) {
      toast({ title: 'Erreur', description: 'Le titre et le type sont requis', variant: 'destructive' });
      return;
    }

    const courseData = {
      courseTypeId: courseForm.courseTypeId,
      title: courseForm.title,
      description: courseForm.description,
      image: courseForm.image === 'custom' ? courseForm.customImage : courseForm.image
    };

    if (editingCourse) {
      updateSportCourse(editingCourse.id, courseData);
      toast({ title: 'Cours modifié', description: 'Le cours a été mis à jour' });
    } else {
      addSportCourse(courseData);
      toast({ title: 'Cours ajouté', description: 'Le cours a été ajouté' });
    }

    loadData();
    setShowCourseForm(false);
    setEditingCourse(null);
  };

  const handleDeleteCourse = () => {
    if (deleteConfirm?.type === 'course') {
      deleteSportCourse(deleteConfirm.id);
      toast({ title: 'Cours supprimé', description: 'Le cours a été supprimé' });
      loadData();
      setDeleteConfirm(null);
    }
  };

  // Use the new comprehensive image options

  const getCourseImage = (course: SportCourse) => {
    if (course.image.startsWith('data:')) {
      return course.image;
    }
    return getSportImage(course.image);
  };

  const getTypeImage = (type: CourseType) => {
    if (type.image) {
      return type.image;
    }
    return null;
  };

  return (
    <Layout backgroundImage={bgImage}>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Course Types Section */}
        <section className="glass-card p-6 animate-fade-in">
          <h2 className="text-2xl font-bold mb-6">Gestion des Types de Cours</h2>
          
          <div className="space-y-3 mb-4">
            {courseTypes.map((type) => (
              <div 
                key={type.id} 
                className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border border-border/30"
              >
                {getTypeImage(type) && (
                  <img 
                    src={getTypeImage(type)!} 
                    alt={type.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                )}
                <span className="font-medium flex-1">{type.name}</span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleEditType(type)}
                    className="btn-ghost flex items-center gap-1 text-sm border border-border"
                  >
                    <Edit className="w-4 h-4" />
                    Modifier
                  </button>
                  <button 
                    onClick={() => setDeleteConfirm({ type: 'type', id: type.id, name: type.name })}
                    className="btn-destructive flex items-center gap-1 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button onClick={handleAddType} className="btn-success flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Ajouter Type
          </button>

          {/* Type Form Modal */}
          {showTypeForm && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-start justify-center z-[60] p-4 overflow-y-auto">
              <div className="glass-card w-full max-w-md animate-scale-in my-8 flex flex-col max-h-[85vh]">
                <div className="flex items-center justify-between p-6 pb-4 border-b border-border/30 shrink-0">
                  <h3 className="text-lg font-semibold">
                    {editingType ? 'Modifier Type' : 'Ajouter Type'}
                  </h3>
                  <button onClick={() => setShowTypeForm(false)} className="p-1 hover:bg-muted rounded">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nom *</label>
                    <ArabicInput
                      value={typeForm.name}
                      onChange={(value) => setTypeForm(prev => ({ ...prev, name: value }))}
                      className="glass-input w-full p-2 pr-16"
                      placeholder="Nom du type"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <ArabicInput
                      value={typeForm.description}
                      onChange={(value) => setTypeForm(prev => ({ ...prev, description: value }))}
                      className="glass-input w-full p-2 pr-16 min-h-[80px]"
                      placeholder="Description (optionnel)"
                      multiline
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Image (optionnel)</label>
                    <label className="flex items-center gap-2 btn-ghost border border-dashed border-border cursor-pointer justify-center py-4">
                      <Upload className="w-5 h-5" />
                      <span>{typeForm.image ? 'Image sélectionnée' : 'Choisir une image'}</span>
                      <input 
                        type="file" 
                        onChange={handleTypeImageUpload} 
                        accept="image/*" 
                        className="hidden"
                        key={typeForm.image ? 'has-image' : 'no-image'}
                      />
                    </label>
                    {typeForm.image && (
                      <div className="mt-2 relative">
                        <img src={typeForm.image} alt="Preview" className="w-full h-24 object-cover rounded" />
                        <button 
                          type="button"
                          onClick={() => setTypeForm(prev => ({ ...prev, image: '' }))}
                          className="absolute top-1 right-1 p-1 bg-destructive rounded-full"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 p-6 pt-4 border-t border-border/30 shrink-0 bg-background/50">
                  <button onClick={handleSaveType} className="btn-success flex-1">
                    Enregistrer
                  </button>
                  <button onClick={() => setShowTypeForm(false)} className="btn-ghost border border-border">
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Sport Courses Section */}
        <section className="glass-card p-6 animate-fade-in">
          <h2 className="text-2xl font-bold mb-6">Gestion des Cours Carousel</h2>
          
          <div className="space-y-3 mb-4">
            {sportCourses.map((course) => {
              const type = courseTypes.find(t => t.id === course.courseTypeId);
              return (
                <div 
                  key={course.id} 
                  className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border border-border/30"
                >
                  <img 
                    src={getCourseImage(course)} 
                    alt={course.title}
                    className="w-16 h-12 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium">{course.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {type?.name} • {course.description.substring(0, 50)}...
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleEditCourse(course)}
                      className="p-2 hover:bg-muted rounded"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setDeleteConfirm({ type: 'course', id: course.id, name: course.title })}
                      className="p-2 hover:bg-destructive/20 rounded text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={handleAddCourse} className="btn-success flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Ajouter Carte Carousel
          </button>

          {/* Course Form Modal */}
          {showCourseForm && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-start justify-center z-[60] p-4 overflow-y-auto">
              <div className="glass-card w-full max-w-md animate-scale-in my-8 flex flex-col max-h-[85vh]">
                <div className="flex items-center justify-between p-6 pb-4 border-b border-border/30 shrink-0">
                  <h3 className="text-lg font-semibold">
                    {editingCourse ? 'Modifier Cours' : 'Ajouter Cours'}
                  </h3>
                  <button onClick={() => setShowCourseForm(false)} className="p-1 hover:bg-muted rounded">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Type de cours *</label>
                    <select
                      value={courseForm.courseTypeId}
                      onChange={(e) => setCourseForm(prev => ({ ...prev, courseTypeId: e.target.value }))}
                      className="glass-input w-full p-2"
                    >
                      {courseTypes.map(type => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Titre *</label>
                    <ArabicInput
                      value={courseForm.title}
                      onChange={(value) => setCourseForm(prev => ({ ...prev, title: value }))}
                      className="glass-input w-full p-2 pr-16"
                      placeholder="Titre du cours"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <ArabicInput
                      value={courseForm.description}
                      onChange={(value) => setCourseForm(prev => ({ ...prev, description: value }))}
                      className="glass-input w-full p-2 pr-16 min-h-[80px]"
                      placeholder="Description du cours"
                      multiline
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Bibliothèque d'Images</label>
                    <div className="space-y-3 max-h-64 overflow-y-auto p-2 bg-muted/20 rounded-lg">
                      {/* ===== SPORTS SECTION ===== */}
                      <div className="border-b border-border/30 pb-2 mb-2">
                        <p className="text-sm font-semibold text-primary mb-2">🏆 Section Sports</p>
                        
                        {/* Ball Sports */}
                        <div className="mb-2">
                          <p className="text-xs text-muted-foreground mb-1">{categoryLabels.ballSports}</p>
                          <div className="grid grid-cols-4 gap-1">
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
                                title={img.replace('_', ' ')}
                              >
                                <img 
                                  src={getSportImage(img)} 
                                  alt={img}
                                  className="w-full h-10 object-cover rounded"
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Combat Sports */}
                        <div className="mb-2">
                          <p className="text-xs text-muted-foreground mb-1">{categoryLabels.combatSports}</p>
                          <div className="grid grid-cols-4 gap-1">
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
                                title={img.replace('_', ' ')}
                              >
                                <img 
                                  src={getSportImage(img)} 
                                  alt={img}
                                  className="w-full h-10 object-cover rounded"
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Athletics & Gym */}
                        <div className="mb-2">
                          <p className="text-xs text-muted-foreground mb-1">{categoryLabels.athleticsGym}</p>
                          <div className="grid grid-cols-5 gap-1">
                            {imageCategories.athleticsGym.map(img => (
                              <button
                                key={img}
                                type="button"
                                onClick={() => setCourseForm(prev => ({ ...prev, image: img, customImage: '' }))}
                                className={`p-0.5 rounded border-2 transition-all ${
                                  courseForm.image === img 
                                    ? 'border-primary ring-2 ring-primary/30' 
                                    : 'border-transparent hover:border-border'
                                }`}
                                title={img.replace('_', ' ')}
                              >
                                <img 
                                  src={getSportImage(img)} 
                                  alt={img}
                                  className="w-full h-10 object-cover rounded"
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Aquatic */}
                        <div className="mb-2">
                          <p className="text-xs text-muted-foreground mb-1">{categoryLabels.aquatic}</p>
                          <div className="grid grid-cols-4 gap-1">
                            {imageCategories.aquatic.map(img => (
                              <button
                                key={img}
                                type="button"
                                onClick={() => setCourseForm(prev => ({ ...prev, image: img, customImage: '' }))}
                                className={`p-0.5 rounded border-2 transition-all ${
                                  courseForm.image === img 
                                    ? 'border-primary ring-2 ring-primary/30' 
                                    : 'border-transparent hover:border-border'
                                }`}
                                title={img.replace('_', ' ')}
                              >
                                <img 
                                  src={getSportImage(img)} 
                                  alt={img}
                                  className="w-full h-10 object-cover rounded"
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Facilities */}
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">{categoryLabels.facilities}</p>
                          <div className="grid grid-cols-3 gap-1">
                            {imageCategories.facilities.map(img => (
                              <button
                                key={img}
                                type="button"
                                onClick={() => setCourseForm(prev => ({ ...prev, image: img, customImage: '' }))}
                                className={`p-0.5 rounded border-2 transition-all ${
                                  courseForm.image === img 
                                    ? 'border-primary ring-2 ring-primary/30' 
                                    : 'border-transparent hover:border-border'
                                }`}
                                title={img.replace('_', ' ')}
                              >
                                <img 
                                  src={getSportImage(img)} 
                                  alt={img}
                                  className="w-full h-10 object-cover rounded"
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* ===== MILITARY SECTION ===== */}
                      <div>
                        <p className="text-sm font-semibold text-primary mb-2">🎖️ Section Militaire</p>
                        
                        {/* Weapons */}
                        <div className="mb-2">
                          <p className="text-xs text-muted-foreground mb-1">{categoryLabels.weapons}</p>
                          <div className="grid grid-cols-4 gap-1">
                            {imageCategories.weapons.map(img => (
                              <button
                                key={img}
                                type="button"
                                onClick={() => setCourseForm(prev => ({ ...prev, image: img, customImage: '' }))}
                                className={`p-0.5 rounded border-2 transition-all ${
                                  courseForm.image === img 
                                    ? 'border-primary ring-2 ring-primary/30' 
                                    : 'border-transparent hover:border-border'
                                }`}
                                title={img.replace('_', ' ')}
                              >
                                <img 
                                  src={getSportImage(img)} 
                                  alt={img}
                                  className="w-full h-10 object-cover rounded"
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Military Training */}
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">{categoryLabels.militaryTraining}</p>
                          <div className="grid grid-cols-5 gap-1">
                            {imageCategories.militaryTraining.map(img => (
                              <button
                                key={img}
                                type="button"
                                onClick={() => setCourseForm(prev => ({ ...prev, image: img, customImage: '' }))}
                                className={`p-0.5 rounded border-2 transition-all ${
                                  courseForm.image === img 
                                    ? 'border-primary ring-2 ring-primary/30' 
                                    : 'border-transparent hover:border-border'
                                }`}
                                title={img.replace('_', ' ')}
                              >
                                <img 
                                  src={getSportImage(img)} 
                                  alt={img}
                                  className="w-full h-10 object-cover rounded"
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Ou télécharger une image personnalisée</label>
                    <label className="flex items-center gap-2 btn-ghost border border-dashed border-border cursor-pointer justify-center py-4">
                      <Upload className="w-5 h-5" />
                      <span>{courseForm.customImage ? 'Image personnalisée sélectionnée' : 'Choisir une image'}</span>
                      <input 
                        type="file" 
                        onChange={handleCourseImageUpload} 
                        accept="image/*" 
                        className="hidden"
                        key={courseForm.customImage ? 'has-custom' : 'no-custom'}
                      />
                    </label>
                    {courseForm.customImage && (
                      <div className="mt-2 relative">
                        <img src={courseForm.customImage} alt="Preview" className="w-full h-24 object-cover rounded" />
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
                  <button onClick={handleSaveCourse} className="btn-success flex-1">
                    Enregistrer
                  </button>
                  <button onClick={() => setShowCourseForm(false)} className="btn-ghost border border-border">
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Delete Confirmation Modal - Fixed positioning */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="glass-card p-6 w-full max-w-sm animate-scale-in text-center shadow-2xl border border-border/50">
              <div className="w-12 h-12 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Confirmer la suppression
              </h3>
              <p className="text-muted-foreground mb-6">
                Êtes-vous sûr de vouloir supprimer "<span className="text-foreground font-medium">{deleteConfirm.name}</span>"?
              </p>
              <div className="flex gap-3 justify-center">
                <button 
                  onClick={() => setDeleteConfirm(null)} 
                  className="btn-ghost border border-border px-6 py-2"
                >
                  Annuler
                </button>
                <button 
                  onClick={deleteConfirm.type === 'type' ? handleDeleteType : handleDeleteCourse}
                  className="btn-destructive px-6 py-2"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default GestionCours;
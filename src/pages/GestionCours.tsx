import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Edit, Trash2, X, Upload, Search, Filter, 
  LayoutGrid, List, ChevronDown, BookOpen, Layers,
  GraduationCap, Image as ImageIcon, FolderUp, Eye, ChevronRight
} from 'lucide-react';
import Layout from '@/components/Layout';
import ArabicInput from '@/components/ArabicInput';
import FolderImportTree, { ImportTreeNode } from '@/components/FolderImportTree';
import { parseFolderStructure, importTreeToStorage } from '@/lib/folderParser';
import { 
  getCourseTypes, 
  addCourseType, 
  updateCourseType, 
  deleteCourseType,
  getSportCourses,
  addSportCourse,
  updateSportCourse,
  deleteSportCourse,
  getStages,
  getUserMode,
  addCourseTitle,
  addFileAsync
} from '@/lib/storage';
import { CourseType, SportCourse, Stage } from '@/types';
import { getSportImage, imageCategories, categoryLabels } from '@/assets/sports';
import { useToast } from '@/hooks/use-toast';
import { useClickSound } from '@/hooks/useClickSound';
import bgImage from '@/assets/bg4.jpg';

const GestionCours = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const userMode = getUserMode();
  const { playClick } = useClickSound();
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);
  const [sportCourses, setSportCourses] = useState<SportCourse[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  
  // View state
  const [activeTab, setActiveTab] = useState<'types' | 'courses' | 'structure'>('structure');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  
  // Type form state
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [editingType, setEditingType] = useState<CourseType | null>(null);
  const [typeForm, setTypeForm] = useState({ name: '', description: '', image: '' });
  
  // Course form state
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<SportCourse | null>(null);
  const [courseForm, setCourseForm] = useState({
    courseTypeId: '',
    stageId: '',
    title: '',
    description: '',
    image: 'basketball',
    customImage: ''
  });
  
  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'type' | 'course', id: string, name: string } | null>(null);

  // Folder import state
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [showImportTree, setShowImportTree] = useState(false);
  const [importTree, setImportTree] = useState<ImportTreeNode[]>([]);
  const [importStats, setImportStats] = useState({ stages: 0, types: 0, lecons: 0, headings: 0, files: 0 });
  const [isImporting, setIsImporting] = useState(false);

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
    setStages(getStages());
  };

  // Filtered data
  const filteredTypes = courseTypes.filter(type =>
    type.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCourses = sportCourses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = filterStage === 'all' || course.stageId === filterStage;
    const matchesType = filterType === 'all' || course.courseTypeId === filterType;
    return matchesSearch && matchesStage && matchesType;
  });

  // Grouped structure view
  const structureData = stages.filter(s => s.enabled).map(stage => {
    const stageCourses = sportCourses.filter(c => c.stageId === stage.id);
    const coursesByType: Record<string, SportCourse[]> = {};
    
    stageCourses.forEach(course => {
      const type = courseTypes.find(t => t.id === course.courseTypeId);
      const typeName = type?.name || 'Non classé';
      if (!coursesByType[typeName]) coursesByType[typeName] = [];
      coursesByType[typeName].push(course);
    });
    
    return { stage, coursesByType, totalCourses: stageCourses.length };
  });

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
      stageId: stages.find(s => s.enabled)?.id || '',
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
      stageId: course.stageId,
      title: course.title,
      description: course.description,
      image: isCustom ? 'custom' : course.image,
      customImage: isCustom ? course.image : ''
    });
    setShowCourseForm(true);
  };

  const handleSaveCourse = () => {
    if (!courseForm.title.trim() || !courseForm.courseTypeId || !courseForm.stageId) {
      toast({ title: 'Erreur', description: 'Le titre, le type et le stage sont requis', variant: 'destructive' });
      return;
    }

    const courseData = {
      courseTypeId: courseForm.courseTypeId,
      stageId: courseForm.stageId,
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

  // Folder Import handlers
  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const result = await parseFolderStructure(files);
      setImportTree(result.tree);
      setImportStats(result.stats);
      setShowImportTree(true);
    } catch (error) {
      console.error('Error parsing folder:', error);
      toast({ title: 'Erreur', description: 'Impossible d\'analyser le dossier', variant: 'destructive' });
    }
    
    // Reset input
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  const handleConfirmImport = async () => {
    setIsImporting(true);
    try {
      const importedCount = await importTreeToStorage(
        importTree,
        getStages,
        getCourseTypes,
        addCourseType,
        getSportCourses,
        addSportCourse,
        addCourseTitle,
        addFileAsync
      );
      
      toast({ 
        title: 'Import réussi', 
        description: `${importedCount} fichiers ont été importés avec succès` 
      });
      loadData();
      setShowImportTree(false);
      setImportTree([]);
    } catch (error) {
      console.error('Error importing:', error);
      toast({ title: 'Erreur', description: 'Erreur lors de l\'import', variant: 'destructive' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleCancelImport = () => {
    setShowImportTree(false);
    setImportTree([]);
    setImportStats({ stages: 0, types: 0, lecons: 0, headings: 0, files: 0 });
  };

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

  const getStageById = (id: string) => stages.find(s => s.id === id);
  const getTypeById = (id: string) => courseTypes.find(t => t.id === id);

  const navigateToLecon = (stageId: string, typeId: string, leconId: string) => {
    playClick();
    navigate(`/stage/${stageId}/type/${typeId}/lecon/${leconId}`);
  };

  return (
    <Layout backgroundImage={bgImage}>
      <div className="max-w-7xl mx-auto">
        {/* Hidden folder input */}
        <input
          type="file"
          ref={folderInputRef}
          onChange={handleFolderSelect}
          className="hidden"
          // @ts-ignore - webkitdirectory is not in the types
          webkitdirectory=""
          directory=""
          multiple
        />

        {/* Premium Header */}
        <div className="glass-panel p-6 mb-6 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                Gestion des Cours
              </h1>
              <p className="text-muted-foreground mt-1">
                Gérez vos types de cours et contenus pédagogiques
              </p>
            </div>

            {/* Stats and Import Button */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex gap-4">
                <div className="text-center px-6 py-3 bg-primary/10 rounded-xl border border-primary/20">
                  <p className="text-2xl font-bold text-primary">{courseTypes.length}</p>
                  <p className="text-xs text-muted-foreground">Types</p>
                </div>
                <div className="text-center px-6 py-3 bg-accent/10 rounded-xl border border-accent/20">
                  <p className="text-2xl font-bold text-accent">{sportCourses.length}</p>
                  <p className="text-xs text-muted-foreground">Cours</p>
                </div>
                <div className="text-center px-6 py-3 bg-success/10 rounded-xl border border-success/20">
                  <p className="text-2xl font-bold text-success">{stages.filter(s => s.enabled).length}</p>
                  <p className="text-xs text-muted-foreground">Stages</p>
                </div>
              </div>
              
              <button
                onClick={() => { playClick(); folderInputRef.current?.click(); }}
                className="btn-primary flex items-center gap-2 py-3 px-4"
              >
                <FolderUp className="w-5 h-5" />
                Importer Projet
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="glass-card mb-6 p-2 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex gap-1 flex-1">
            <button
              onClick={() => { playClick(); setActiveTab('structure'); }}
              className={`flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'structure'
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                  : 'hover:bg-muted/50 text-muted-foreground'
              }`}
            >
              <Eye className="w-4 h-4" />
              Vue Structure
            </button>
            <button
              onClick={() => { playClick(); setActiveTab('types'); }}
              className={`flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'types'
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                  : 'hover:bg-muted/50 text-muted-foreground'
              }`}
            >
              <Layers className="w-4 h-4" />
              Types de Cours
            </button>
            <button
              onClick={() => { playClick(); setActiveTab('courses'); }}
              className={`flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'courses'
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                  : 'hover:bg-muted/50 text-muted-foreground'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Leçons
            </button>
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="glass-input pl-10 pr-4 py-2 w-48"
              />
            </div>

            {activeTab === 'courses' && (
              <>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="glass-input py-2 px-3"
                >
                  <option value="all">Tous les types</option>
                  {courseTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
                <select
                  value={filterStage}
                  onChange={(e) => setFilterStage(e.target.value)}
                  className="glass-input py-2 px-3"
                >
                  <option value="all">Tous les stages</option>
                  {stages.filter(s => s.enabled).map(stage => (
                    <option key={stage.id} value={stage.id}>{stage.name}</option>
                  ))}
                </select>
              </>
            )}

            {activeTab !== 'structure' && (
              <div className="flex border border-border/30 rounded-lg overflow-hidden">
                <button
                  onClick={() => { playClick(); setViewMode('grid'); }}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { playClick(); setViewMode('list'); }}
                  className={`p-2 ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="animate-fade-in">
          {/* Structure View Tab */}
          {activeTab === 'structure' && (
            <div className="space-y-4">
              {structureData.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <Layers className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Aucun stage actif</h3>
                  <p className="text-muted-foreground mb-4">
                    Activez des stages dans les paramètres pour commencer
                  </p>
                </div>
              ) : (
                structureData.map(({ stage, coursesByType, totalCourses }) => (
                  <div key={stage.id} className="glass-card overflow-hidden">
                    {/* Stage Header */}
                    <div className="p-4 bg-gradient-to-r from-primary/20 to-transparent border-b border-border/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/30 flex items-center justify-center">
                            <Layers className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg">{stage.name}</h3>
                            <p className="text-sm text-muted-foreground">{stage.description}</p>
                          </div>
                        </div>
                        <span className="badge-gold">{totalCourses} leçons</span>
                      </div>
                    </div>
                    
                    {/* Course Types */}
                    <div className="p-4 space-y-4">
                      {Object.entries(coursesByType).length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">
                          Aucune leçon dans ce stage
                        </p>
                      ) : (
                        Object.entries(coursesByType).map(([typeName, courses]) => (
                          <div key={typeName} className="border border-border/30 rounded-lg overflow-hidden">
                            {/* Type Header */}
                            <div className="p-3 bg-muted/30 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <GraduationCap className="w-4 h-4 text-blue-400" />
                                <span className="font-medium">P.{typeName.toUpperCase()}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">{courses.length} leçons</span>
                            </div>
                            
                            {/* Courses Grid */}
                            <div className="p-3 grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {courses.map(course => (
                                <button
                                  key={course.id}
                                  onClick={() => navigateToLecon(stage.id, course.courseTypeId, course.id)}
                                  className="flex items-center gap-3 p-3 bg-card/50 rounded-lg hover:bg-primary/10 transition-colors text-left group"
                                >
                                  <img 
                                    src={getCourseImage(course)} 
                                    alt={course.title}
                                    className="w-12 h-12 object-cover rounded-lg"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate group-hover:text-primary transition-colors">
                                      {course.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {course.description || 'Aucune description'}
                                    </p>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </button>
                              ))}
                              
                              {/* Add Course Button */}
                              <button
                                onClick={() => {
                                  playClick();
                                  const type = courseTypes.find(t => t.name === typeName);
                                  setCourseForm({
                                    courseTypeId: type?.id || '',
                                    stageId: stage.id,
                                    title: '',
                                    description: '',
                                    image: 'basketball',
                                    customImage: ''
                                  });
                                  setShowCourseForm(true);
                                }}
                                className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-primary/30 rounded-lg hover:border-primary/60 hover:bg-primary/5 transition-all text-muted-foreground hover:text-foreground"
                              >
                                <Plus className="w-4 h-4" />
                                <span className="text-sm">Ajouter Leçon</span>
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                      
                      {/* Add to this stage */}
                      <button
                        onClick={() => { 
                          playClick(); 
                          handleAddCourse();
                          setCourseForm(prev => ({ ...prev, stageId: stage.id }));
                        }}
                        className="w-full p-3 border-2 border-dashed border-border/50 rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
                      >
                        <Plus className="w-4 h-4" />
                        Ajouter une nouvelle leçon à {stage.name}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Course Types Tab */}
          {activeTab === 'types' && (
            <div className="space-y-4">
              {viewMode === 'grid' ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTypes.map((type) => (
                    <div key={type.id} className="glass-card group overflow-hidden">
                      {getTypeImage(type) ? (
                        <div className="h-32 overflow-hidden">
                          <img 
                            src={getTypeImage(type)!} 
                            alt={type.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      ) : (
                        <div className="h-32 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                          <ImageIcon className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="font-bold text-lg mb-1">{type.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {type.description || 'Aucune description'}
                        </p>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => { playClick(); handleEditType(type); }}
                            className="btn-ghost text-sm flex items-center gap-1 flex-1 justify-center border border-border"
                          >
                            <Edit className="w-4 h-4" /> Modifier
                          </button>
                          <button 
                            onClick={() => { playClick(); setDeleteConfirm({ type: 'type', id: type.id, name: type.name }); }}
                            className="btn-destructive text-sm p-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => { playClick(); handleAddType(); }}
                    className="glass-card h-full min-h-[200px] flex flex-col items-center justify-center gap-3 border-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all group"
                  >
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                      <Plus className="w-8 h-8 text-primary" />
                    </div>
                    <span className="font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                      Ajouter un type
                    </span>
                  </button>
                </div>
              ) : (
                <div className="glass-card divide-y divide-border/30">
                  {filteredTypes.map((type) => (
                    <div key={type.id} className="flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors">
                      {getTypeImage(type) ? (
                        <img src={getTypeImage(type)!} alt={type.name} className="w-16 h-12 object-cover rounded-lg" />
                      ) : (
                        <div className="w-16 h-12 bg-muted rounded-lg flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold">{type.name}</h4>
                        <p className="text-sm text-muted-foreground">{type.description || 'Aucune description'}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { playClick(); handleEditType(type); }} className="p-2 hover:bg-muted rounded-lg">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => { playClick(); setDeleteConfirm({ type: 'type', id: type.id, name: type.name }); }}
                          className="p-2 hover:bg-destructive/20 rounded-lg text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => { playClick(); handleAddType(); }} className="w-full p-4 text-primary hover:bg-primary/5 flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5" /> Ajouter un type
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Courses Tab */}
          {activeTab === 'courses' && (
            <div className="space-y-4">
              {viewMode === 'grid' ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredCourses.map((course) => {
                    const type = getTypeById(course.courseTypeId);
                    const stage = getStageById(course.stageId);
                    return (
                      <div key={course.id} className="glass-card group overflow-hidden">
                        <div className="h-32 overflow-hidden relative">
                          <img 
                            src={getCourseImage(course)} 
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute top-2 right-2 flex gap-1">
                            {type && (
                              <span className="text-xs px-2 py-1 bg-primary/80 rounded-full backdrop-blur-sm">
                                {type.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="font-bold mb-1 line-clamp-1">{course.title}</h3>
                          <p className="text-xs text-muted-foreground mb-1">
                            Stage: {stage?.name || 'Non défini'}
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {course.description || 'Aucune description'}
                          </p>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => { playClick(); handleEditCourse(course); }}
                              className="btn-ghost text-sm flex items-center gap-1 flex-1 justify-center border border-border"
                            >
                              <Edit className="w-4 h-4" /> Modifier
                            </button>
                            <button 
                              onClick={() => { playClick(); setDeleteConfirm({ type: 'course', id: course.id, name: course.title }); }}
                              className="btn-destructive text-sm p-2"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add Course Card */}
                  <button
                    onClick={() => { playClick(); handleAddCourse(); }}
                    className="glass-card h-full min-h-[240px] flex flex-col items-center justify-center gap-3 border-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all group"
                  >
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                      <Plus className="w-8 h-8 text-primary" />
                    </div>
                    <span className="font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                      Ajouter une leçon
                    </span>
                  </button>
                </div>
              ) : (
                <div className="glass-card divide-y divide-border/30">
                  {filteredCourses.map((course) => {
                    const type = getTypeById(course.courseTypeId);
                    const stage = getStageById(course.stageId);
                    return (
                      <div key={course.id} className="flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors">
                        <img src={getCourseImage(course)} alt={course.title} className="w-20 h-14 object-cover rounded-lg" />
                        <div className="flex-1">
                          <h4 className="font-semibold">{course.title}</h4>
                          <p className="text-xs text-muted-foreground">
                            {type?.name} • {stage?.name}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { playClick(); handleEditCourse(course); }} className="p-2 hover:bg-muted rounded-lg">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => { playClick(); setDeleteConfirm({ type: 'course', id: course.id, name: course.title }); }}
                            className="p-2 hover:bg-destructive/20 rounded-lg text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={() => { playClick(); handleAddCourse(); }} className="w-full p-4 text-primary hover:bg-primary/5 flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5" /> Ajouter une leçon
                  </button>
                </div>
              )}

              {filteredCourses.length === 0 && (
                <div className="glass-card p-12 text-center">
                  <GraduationCap className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Aucune leçon trouvée</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? 'Aucun résultat pour votre recherche' : 'Commencez par ajouter une leçon'}
                  </p>
                  <button onClick={() => { playClick(); handleAddCourse(); }} className="btn-primary flex items-center gap-2 mx-auto">
                    <Plus className="w-5 h-5" /> Ajouter une leçon
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Type Form Modal */}
        {showTypeForm && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" style={{ zIndex: 9999 }}>
            <div className="glass-card w-full max-w-md animate-scale-in my-8 flex flex-col max-h-[85vh]">
              <div className="flex items-center justify-between p-6 pb-4 border-b border-border/30 shrink-0">
                <h3 className="text-lg font-semibold">
                  {editingType ? 'Modifier Type' : 'Ajouter Type'}
                </h3>
                <button onClick={() => { playClick(); setShowTypeForm(false); }} className="p-2 hover:bg-muted rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nom *</label>
                  <ArabicInput
                    value={typeForm.name}
                    onChange={(value) => setTypeForm(prev => ({ ...prev, name: value }))}
                    className="glass-input w-full p-3 pr-16"
                    placeholder="Nom du type"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <ArabicInput
                    value={typeForm.description}
                    onChange={(value) => setTypeForm(prev => ({ ...prev, description: value }))}
                    className="glass-input w-full p-3 pr-16 min-h-[80px]"
                    placeholder="Description (optionnel)"
                    multiline
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Image (optionnel)</label>
                  <label className="flex items-center gap-2 btn-ghost border border-dashed border-border cursor-pointer justify-center py-4">
                    <Upload className="w-5 h-5" />
                    <span>{typeForm.image ? 'Image sélectionnée' : 'Choisir une image'}</span>
                    <input type="file" onChange={handleTypeImageUpload} accept="image/*" className="hidden" />
                  </label>
                  {typeForm.image && (
                    <div className="mt-2 relative">
                      <img src={typeForm.image} alt="Preview" className="w-full h-24 object-cover rounded-lg" />
                      <button 
                        type="button"
                        onClick={() => setTypeForm(prev => ({ ...prev, image: '' }))}
                        className="absolute top-2 right-2 p-1 bg-destructive rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 p-6 pt-4 border-t border-border/30 shrink-0 bg-background/50">
                <button onClick={() => { playClick(); handleSaveType(); }} className="btn-success flex-1 py-3 font-medium">
                  Enregistrer
                </button>
                <button onClick={() => { playClick(); setShowTypeForm(false); }} className="btn-ghost border border-border py-3 px-6">
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Course Form Modal */}
        {showCourseForm && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" style={{ zIndex: 9999 }}>
            <div className="glass-card w-full max-w-lg animate-scale-in my-8 flex flex-col max-h-[85vh]">
              <div className="flex items-center justify-between p-6 pb-4 border-b border-border/30 shrink-0">
                <h3 className="text-lg font-semibold">
                  {editingCourse ? 'Modifier Leçon' : 'Ajouter Leçon'}
                </h3>
                <button onClick={() => { playClick(); setShowCourseForm(false); }} className="p-2 hover:bg-muted rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Type de cours *</label>
                    <select
                      value={courseForm.courseTypeId}
                      onChange={(e) => setCourseForm(prev => ({ ...prev, courseTypeId: e.target.value }))}
                      className="glass-input w-full p-3"
                    >
                      <option value="">Sélectionner...</option>
                      {courseTypes.map(type => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Stage *</label>
                    <select
                      value={courseForm.stageId}
                      onChange={(e) => setCourseForm(prev => ({ ...prev, stageId: e.target.value }))}
                      className="glass-input w-full p-3"
                    >
                      <option value="">Sélectionner...</option>
                      {stages.filter(s => s.enabled).map(stage => (
                        <option key={stage.id} value={stage.id}>{stage.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Titre *</label>
                  <ArabicInput
                    value={courseForm.title}
                    onChange={(value) => setCourseForm(prev => ({ ...prev, title: value }))}
                    className="glass-input w-full p-3 pr-16"
                    placeholder="Titre de la leçon"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <ArabicInput
                    value={courseForm.description}
                    onChange={(value) => setCourseForm(prev => ({ ...prev, description: value }))}
                    className="glass-input w-full p-3 pr-16 min-h-[80px]"
                    placeholder="Description de la leçon"
                    multiline
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Image</label>
                  <div className="space-y-3 max-h-48 overflow-y-auto p-2 bg-muted/20 rounded-lg">
                    <p className="text-xs text-muted-foreground">{categoryLabels.ballSports}</p>
                    <div className="grid grid-cols-6 gap-1">
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
                    
                    <p className="text-xs text-muted-foreground mt-2">{categoryLabels.combatSports}</p>
                    <div className="grid grid-cols-6 gap-1">
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

                    <p className="text-xs text-muted-foreground mt-2">{categoryLabels.militaryTraining}</p>
                    <div className="grid grid-cols-6 gap-1">
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
                    <input type="file" onChange={handleCourseImageUpload} accept="image/*" className="hidden" />
                  </label>
                  {courseForm.customImage && (
                    <div className="mt-2 relative">
                      <img src={courseForm.customImage} alt="Preview" className="w-full h-20 object-cover rounded-lg" />
                      <button 
                        type="button"
                        onClick={() => setCourseForm(prev => ({ ...prev, customImage: '', image: 'basketball' }))}
                        className="absolute top-2 right-2 p-1 bg-destructive rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 p-6 pt-4 border-t border-border/30 shrink-0 bg-background/50">
                <button onClick={() => { playClick(); handleSaveCourse(); }} className="btn-success flex-1 py-3 font-medium">
                  Enregistrer
                </button>
                <button onClick={() => { playClick(); setShowCourseForm(false); }} className="btn-ghost border border-border py-3 px-6">
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" style={{ zIndex: 9999 }}>
            <div className="glass-card p-6 w-full max-w-sm animate-scale-in text-center shadow-2xl border border-border/50 my-auto">
              <div className="w-14 h-14 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Confirmer la suppression</h3>
              <p className="text-muted-foreground mb-6">
                Êtes-vous sûr de vouloir supprimer "<span className="text-foreground font-medium">{deleteConfirm.name}</span>"?
              </p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => { playClick(); setDeleteConfirm(null); }} className="btn-ghost border border-border px-6 py-2.5">
                  Annuler
                </button>
                <button 
                  onClick={() => { playClick(); deleteConfirm.type === 'type' ? handleDeleteType() : handleDeleteCourse(); }}
                  className="btn-destructive px-6 py-2.5"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Folder Import Tree Modal */}
        {showImportTree && (
          <FolderImportTree
            tree={importTree}
            onTreeChange={setImportTree}
            onConfirm={handleConfirmImport}
            onCancel={handleCancelImport}
            isImporting={isImporting}
            stats={importStats}
          />
        )}
      </div>
    </Layout>
  );
};

export default GestionCours;

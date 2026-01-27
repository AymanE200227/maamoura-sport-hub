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
import ImportProgressOverlay, { type ImportProgressState } from '@/components/ImportProgressOverlay';
import { parseFolderStructure, importTreeToStorage } from '@/lib/folderParser';
import type { ImportReport } from '@/lib/folderParser';
import ImportReportDialog from '@/components/ImportReportDialog';
import ImportModeDialog, { type ImportMode } from '@/components/ImportModeDialog';
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
  saveStages,
  getUserMode,
  getCourseTitles,
  addCourseTitle,
  addFileAsync,
  getFilesByCourseTitle,
  updateFileAsync
} from '@/lib/storage';
import { CourseType, SportCourse, Stage } from '@/types';
import { getSportImage, imageCategories, categoryLabels } from '@/assets/sports';
import { useToast } from '@/hooks/use-toast';
import { useClickSound } from '@/hooks/useClickSound';
import { logPageView } from '@/lib/activityLog';
import bgImage from '@/assets/bg4.jpg';
import { formatCourseTypeLabel } from '@/lib/courseTypeFormat';

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

  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [showImportReport, setShowImportReport] = useState(false);
  const [showImportModeDialog, setShowImportModeDialog] = useState(false);
  const [selectedImportMode, setSelectedImportMode] = useState<ImportMode>('merge');

  const [importProgress, setImportProgress] = useState<ImportProgressState>({
    open: false,
    phase: 'parsing',
    processed: 0,
    total: 0,
    current: ''
  });
  const progressRafRef = useRef<number | null>(null);
  const progressNextRef = useRef<ImportProgressState | null>(null);

  const setProgressThrottled = useCallback((next: ImportProgressState) => {
    progressNextRef.current = next;
    if (progressRafRef.current !== null) return;
    progressRafRef.current = requestAnimationFrame(() => {
      progressRafRef.current = null;
      if (progressNextRef.current) setImportProgress(progressNextRef.current);
    });
  }, []);

  const closeImportProgress = useCallback(() => {
    // Clear any pending RAF
    progressNextRef.current = null;
    if (progressRafRef.current !== null) {
      cancelAnimationFrame(progressRafRef.current);
      progressRafRef.current = null;
    }
    // Force immediate close
    setImportProgress({ open: false, phase: 'parsing', processed: 0, total: 0, current: '' });
  }, []);

  useEffect(() => {
    return () => {
      if (progressRafRef.current !== null) cancelAnimationFrame(progressRafRef.current);
    };
  }, []);

  useEffect(() => {
    if (userMode !== 'admin') {
      navigate('/accueil');
      return;
    }
    // Log page view
    logPageView('/gestion-cours', 'Gestion des Cours');
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
      setImportProgress({ open: true, phase: 'parsing', processed: 0, total: files.length, current: '' });
      const result = await parseFolderStructure(files, {
        progressEvery: 10,
        onProgress: ({ processed, total, currentPath }) => {
          setProgressThrottled({
            open: true,
            phase: 'parsing',
            processed,
            total,
            current: currentPath || ''
          });
        }
      });
      setImportTree(result.tree);
      setImportStats(result.stats);
      // Show mode selection dialog first
      setShowImportModeDialog(true);
    } catch (error) {
      console.error('Error parsing folder:', error);
      toast({ title: 'Erreur', description: 'Impossible d\'analyser le dossier', variant: 'destructive' });
    } finally {
      closeImportProgress();
    }
    
    // Reset input
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  const handleConfirmImport = async () => {
    setIsImporting(true);
    setImportProgress({ open: true, phase: 'importing', processed: 0, total: importStats.files, current: '' });
    
    let report: ImportReport | null = null;
    
    try {
      report = await importTreeToStorage(
        importTree,
        getStages,
        getCourseTypes,
        addCourseType,
        getSportCourses,
        addSportCourse,
        getCourseTitles,
        addCourseTitle,
        addFileAsync,
        {
          totalFiles: importStats.files,
          yieldEvery: 6,
          saveStages,
          getFilesByCourseTitle,
          updateFileAsync,
          onProgress: ({ processed, total, currentPath }) => {
            setProgressThrottled({
              open: true,
              phase: 'importing',
              processed,
              total,
              current: currentPath || ''
            });
          }
        }
      );

      const importedCount = report.files.imported;
      
      toast({ 
        title: importedCount > 0 ? 'Import réussi' : 'Import terminé',
        description: `${importedCount} fichiers importés • ${report.files.replaced} remplacés • ${report.files.errors} erreurs`
      });

      setImportReport(report);
      setShowImportReport(true);
      loadData();
      setShowImportTree(false);
      setImportTree([]);
    } catch (error) {
      console.error('Error importing:', error);
      toast({ title: 'Erreur', description: String(error) || 'Erreur lors de l\'import', variant: 'destructive' });
    } finally {
      setIsImporting(false);
      // Always close the overlay
      closeImportProgress();
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
        <ImportProgressOverlay {...importProgress} />
        <ImportReportDialog open={showImportReport} onOpenChange={setShowImportReport} report={importReport} />
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
              Cours
            </button>
          </div>

          {/* Search and View Toggle */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10 py-2 w-48"
              />
            </div>

            {activeTab === 'courses' && (
              <div className="flex items-center bg-muted/30 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filters for Courses tab */}
        {activeTab === 'courses' && (
          <div className="glass-card mb-6 p-4 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filtres:</span>
            </div>
            
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="input-field py-2 min-w-[150px]"
            >
              <option value="all">Tous les stages</option>
              {stages.filter(s => s.enabled).map(stage => (
                <option key={stage.id} value={stage.id}>{stage.name}</option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input-field py-2 min-w-[150px]"
            >
              <option value="all">Tous les types</option>
              {courseTypes.map(type => (
                <option key={type.id} value={type.id}>{formatCourseTypeLabel(type.name)}</option>
              ))}
            </select>
          </div>
        )}

        {/* Structure View Tab */}
        {activeTab === 'structure' && (
          <div className="space-y-6">
            {structureData.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Eye className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-xl font-semibold mb-2">Aucun stage actif</h3>
                <p className="text-muted-foreground">
                  Activez des stages dans les paramètres ou importez un projet
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
                          <h3 className="font-semibold text-lg">{stage.name}</h3>
                          <p className="text-sm text-muted-foreground">{stage.description}</p>
                        </div>
                      </div>
                      <div className="px-3 py-1 rounded-full bg-muted/50 text-sm">
                        {totalCourses} cours
                      </div>
                    </div>
                  </div>

                  {/* Types and Courses */}
                  <div className="p-4 space-y-4">
                    {Object.entries(coursesByType).length === 0 ? (
                      <p className="text-center text-muted-foreground py-6">Aucun cours dans ce stage</p>
                    ) : (
                      Object.entries(coursesByType).map(([typeName, courses]) => (
                        <div key={typeName} className="glass-card p-4 bg-muted/10">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded bg-accent/20 flex items-center justify-center">
                              <GraduationCap className="w-3.5 h-3.5 text-accent" />
                            </div>
                            <span className="font-medium">
                              {typeName === 'Non classé' ? typeName : formatCourseTypeLabel(typeName)}
                            </span>
                            <span className="text-xs text-muted-foreground">({courses.length})</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {courses.map(course => (
                              <button
                                key={course.id}
                                onClick={() => navigateToLecon(stage.id, course.courseTypeId, course.id)}
                                className="flex items-center gap-3 p-3 rounded-lg bg-card/50 hover:bg-card border border-border/30 hover:border-primary/30 transition-all group text-left"
                              >
                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                  <img 
                                    src={getCourseImage(course)}
                                    alt={course.title}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                                    {course.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {course.description || 'Aucune description'}
                                  </p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Types Tab */}
        {activeTab === 'types' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={handleAddType} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nouveau Type
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTypes.map(type => (
                <div key={type.id} className="glass-card p-4 hover:shadow-xl transition-all group">
                  <div className="flex items-start gap-3">
                    {getTypeImage(type) ? (
                      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                        <img src={getTypeImage(type)!} alt={type.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Layers className="w-6 h-6 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg">{formatCourseTypeLabel(type.name)}</h3>
                      <p className="text-sm text-muted-foreground truncate">{type.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {sportCourses.filter(c => c.courseTypeId === type.id).length} cours
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditType(type)}
                        className="p-2 rounded-lg hover:bg-primary/20 text-primary transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ type: 'type', id: type.id, name: type.name })}
                        className="p-2 rounded-lg hover:bg-destructive/20 text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredTypes.length === 0 && (
              <div className="glass-card p-12 text-center">
                <Layers className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-xl font-semibold mb-2">Aucun type de cours</h3>
                <p className="text-muted-foreground mb-4">Créez votre premier type de cours</p>
                <button onClick={handleAddType} className="btn-primary inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Nouveau Type
                </button>
              </div>
            )}
          </div>
        )}

        {/* Courses Tab */}
        {activeTab === 'courses' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={handleAddCourse} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nouveau Cours
              </button>
            </div>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredCourses.map(course => (
                  <div key={course.id} className="glass-card overflow-hidden hover:shadow-xl transition-all group">
                    <div className="aspect-video relative overflow-hidden">
                      <img 
                        src={getCourseImage(course)}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-2 left-2 right-2">
                        <h3 className="font-semibold text-white truncate">{course.title}</h3>
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                          {getStageById(course.stageId)?.name || 'Stage'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                          {formatCourseTypeLabel(getTypeById(course.courseTypeId)?.name || 'Type')}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{course.description}</p>
                      <div className="flex gap-1 mt-3 pt-3 border-t border-border/30">
                        <button
                          onClick={() => handleEditCourse(course)}
                          className="flex-1 py-2 rounded-lg hover:bg-primary/20 text-primary text-sm font-medium transition-colors"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ type: 'course', id: course.id, name: course.title })}
                          className="py-2 px-3 rounded-lg hover:bg-destructive/20 text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card divide-y divide-border/30">
                {filteredCourses.map(course => (
                  <div key={course.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                    <div className="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <img 
                        src={getCourseImage(course)}
                        alt={course.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{course.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{getStageById(course.stageId)?.name}</span>
                        <span>•</span>
                        <span>{formatCourseTypeLabel(getTypeById(course.courseTypeId)?.name || 'Type')}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditCourse(course)}
                        className="p-2 rounded-lg hover:bg-primary/20 text-primary transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ type: 'course', id: course.id, name: course.title })}
                        className="p-2 rounded-lg hover:bg-destructive/20 text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredCourses.length === 0 && (
              <div className="glass-card p-12 text-center">
                <GraduationCap className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-xl font-semibold mb-2">Aucun cours</h3>
                <p className="text-muted-foreground mb-4">Créez votre premier cours</p>
                <button onClick={handleAddCourse} className="btn-primary inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Nouveau Cours
                </button>
              </div>
            )}
          </div>
        )}

        {/* Type Form Modal */}
        {showTypeForm && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-md p-6 animate-scale-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">
                  {editingType ? 'Modifier le type' : 'Nouveau type'}
                </h2>
                <button
                  onClick={() => setShowTypeForm(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Nom</label>
                  <ArabicInput
                    value={typeForm.name}
                    onChange={(val) => setTypeForm(prev => ({ ...prev, name: val }))}
                    placeholder="Ex: Sportif"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Description</label>
                  <ArabicInput
                    value={typeForm.description}
                    onChange={(val) => setTypeForm(prev => ({ ...prev, description: val }))}
                    placeholder="Description du type..."
                    multiline
                    className="input-field resize-none h-20"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Image (optionnelle)</label>
                  <div className="flex items-center gap-3">
                    {typeForm.image && (
                      <div className="w-16 h-16 rounded-lg overflow-hidden">
                        <img src={typeForm.image} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <label className="btn-ghost border border-dashed border-border cursor-pointer flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Choisir une image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleTypeImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowTypeForm(false)}
                  className="btn-ghost flex-1"
                >
                  Annuler
                </button>
                <button onClick={handleSaveType} className="btn-primary flex-1">
                  {editingType ? 'Enregistrer' : 'Ajouter'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Course Form Modal */}
        {showCourseForm && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-auto">
            <div className="glass-card w-full max-w-2xl p-6 animate-scale-in my-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">
                  {editingCourse ? 'Modifier le cours' : 'Nouveau cours'}
                </h2>
                <button
                  onClick={() => setShowCourseForm(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Titre</label>
                  <ArabicInput
                    value={courseForm.title}
                    onChange={(val) => setCourseForm(prev => ({ ...prev, title: val }))}
                    placeholder="Titre du cours"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Stage</label>
                  <select
                    value={courseForm.stageId}
                    onChange={(e) => setCourseForm(prev => ({ ...prev, stageId: e.target.value }))}
                    className="input-field"
                  >
                    {stages.filter(s => s.enabled).map(stage => (
                      <option key={stage.id} value={stage.id}>{stage.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Type de cours</label>
                  <select
                    value={courseForm.courseTypeId}
                    onChange={(e) => setCourseForm(prev => ({ ...prev, courseTypeId: e.target.value }))}
                    className="input-field"
                  >
                    {courseTypes.map(type => (
                      <option key={type.id} value={type.id}>{formatCourseTypeLabel(type.name)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Description</label>
                  <ArabicInput
                    value={courseForm.description}
                    onChange={(val) => setCourseForm(prev => ({ ...prev, description: val }))}
                    placeholder="Description du cours"
                    className="input-field"
                  />
                </div>
              </div>

              {/* Image Selection */}
              <div className="mt-4">
                <label className="text-sm font-medium mb-2 block">Image du cours</label>
                
                {/* Custom image upload */}
                <div className="flex items-center gap-3 mb-4">
                  <label className="btn-ghost border border-dashed border-border cursor-pointer flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Image personnalisée
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCourseImageUpload}
                      className="hidden"
                    />
                  </label>
                  {courseForm.image === 'custom' && courseForm.customImage && (
                    <div className="w-16 h-12 rounded-lg overflow-hidden">
                      <img src={courseForm.customImage} alt="Custom" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                {/* Predefined images by category */}
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {Object.entries(imageCategories).map(([category, images]) => (
                    <div key={category}>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        {categoryLabels[category as keyof typeof categoryLabels]}
                      </p>
                      <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                        {images.map(imgKey => (
                          <button
                            key={imgKey}
                            type="button"
                            onClick={() => setCourseForm(prev => ({ ...prev, image: imgKey, customImage: '' }))}
                            className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                              courseForm.image === imgKey ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-muted'
                            }`}
                          >
                            <img
                              src={getSportImage(imgKey)}
                              alt={imgKey}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCourseForm(false)}
                  className="btn-ghost flex-1"
                >
                  Annuler
                </button>
                <button onClick={handleSaveCourse} className="btn-primary flex-1">
                  {editingCourse ? 'Enregistrer' : 'Ajouter'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-sm p-6 animate-scale-in">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-destructive" />
                </div>
                <h3 className="text-xl font-bold mb-2">Confirmer la suppression</h3>
                <p className="text-muted-foreground mb-6">
                  Êtes-vous sûr de vouloir supprimer "{deleteConfirm.name}" ?
                  {deleteConfirm.type === 'type' && ' Tous les cours associés seront également supprimés.'}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="btn-ghost flex-1"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={deleteConfirm.type === 'type' ? handleDeleteType : handleDeleteCourse}
                    className="btn-primary bg-destructive hover:bg-destructive/90 flex-1"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Import Mode Selection Dialog */}
        <ImportModeDialog
          open={showImportModeDialog}
          onOpenChange={setShowImportModeDialog}
          onSelect={(mode) => {
            setSelectedImportMode(mode);
            if (mode === 'preview') {
              setShowImportTree(true);
            } else {
              // For merge/replace, show tree for confirmation
              setShowImportTree(true);
            }
          }}
          stats={importStats}
        />

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

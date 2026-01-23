import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, FileText, Edit, Trash2, Eye, Upload, X, Download, Loader2, Video, FolderUp, ChevronRight, FileCheck, Lock } from 'lucide-react';
import Layout from '@/components/Layout';
import {
  getSportCourses,
  getStages,
  getCourseTypes,
  getCourseTitlesBySportCourse,
  getFilesByCourseTitle,
  addCourseTitle,
  updateCourseTitle,
  deleteCourseTitle,
  addFileAsync,
  updateFileAsync,
  deleteFileAsync,
  getFileDataAsync,
  getUserMode
} from '@/lib/storage';
import { canAccess, canAccessStage } from '@/lib/permissions';
import { SportCourse, Stage, CourseType, CourseTitle, CourseFile, UserRole } from '@/types';
import { getSportImage } from '@/assets/sports';
import { useToast } from '@/hooks/use-toast';
import { useClickSound } from '@/hooks/useClickSound';
import bgImage from '@/assets/bg3.jpg';

const LeconDetail = () => {
  const { stageId, typeId, leconId } = useParams<{ stageId: string; typeId: string; leconId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { playClick } = useClickSound();
  
  const [stage, setStage] = useState<Stage | null>(null);
  const [courseType, setCourseType] = useState<CourseType | null>(null);
  const [course, setCourse] = useState<SportCourse | null>(null);
  const [courseTitles, setCourseTitles] = useState<CourseTitle[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<CourseTitle | null>(null);
  const [files, setFiles] = useState<CourseFile[]>([]);
  
  // Title form state
  const [showAddTitle, setShowAddTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState<CourseTitle | null>(null);
  const [titleForm, setTitleForm] = useState('');
  
  // File form state
  const [showAddFile, setShowAddFile] = useState(false);
  const [editingFile, setEditingFile] = useState<CourseFile | null>(null);
  const [fileForm, setFileForm] = useState({
    title: '',
    description: '',
    type: 'pdf' as 'ppt' | 'word' | 'pdf' | 'video',
    fileName: '',
    fileData: ''
  });
  
  // Conclusion file state
  const [showConclusionUpload, setShowConclusionUpload] = useState(false);
  
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  
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
  }, [leconId, stageId, typeId, userMode, userRole, navigate]);

  const loadData = () => {
    const stages = getStages();
    const types = getCourseTypes();
    const courses = getSportCourses();
    
    const foundStage = stages.find(s => s.id === stageId);
    const foundType = types.find(t => t.id === typeId);
    const foundCourse = courses.find(c => c.id === leconId);
    
    if (foundStage && foundType && foundCourse) {
      // Check permission to access stage and course
      if (!canAccessStage(userRole, foundStage.id)) {
        toast({ title: 'Accès refusé', description: 'Vous n\'avez pas accès à ce stage', variant: 'destructive' });
        navigate('/accueil');
        return;
      }
      
      if (!canAccess(userRole, 'lecon', foundCourse.id)) {
        toast({ title: 'Accès refusé', description: 'Vous n\'avez pas accès à cette leçon', variant: 'destructive' });
        navigate(`/stage/${stageId}/type/${typeId}`);
        return;
      }
      
      setStage(foundStage);
      setCourseType(foundType);
      setCourse(foundCourse);
      
      // Filter titles by permissions
      const allTitles = getCourseTitlesBySportCourse(leconId!);
      const accessibleTitles = allTitles.filter(title => 
        canAccess(userRole, 'heading', title.id)
      );
      setCourseTitles(accessibleTitles);
    }
  };

  const handleTitleSelect = (title: CourseTitle) => {
    playClick();
    setSelectedTitle(title);
    // Filter files by permissions
    const allFiles = getFilesByCourseTitle(title.id);
    const accessibleFiles = allFiles.filter(file => 
      canAccess(userRole, 'file', file.id)
    );
    setFiles(accessibleFiles);
  };

  const handleBackToTitles = () => {
    playClick();
    setSelectedTitle(null);
    setFiles([]);
  };

  const handleBack = () => {
    playClick();
    navigate(`/stage/${stageId}/type/${typeId}`);
  };

  // Title CRUD
  const handleSaveTitle = () => {
    if (!titleForm.trim() || !leconId) {
      toast({ title: 'Erreur', description: 'Le titre est requis', variant: 'destructive' });
      return;
    }

    if (editingTitle) {
      updateCourseTitle(editingTitle.id, { title: titleForm });
      toast({ title: 'Titre modifié' });
    } else {
      addCourseTitle({ sportCourseId: leconId, title: titleForm });
      toast({ title: 'Titre ajouté' });
    }

    setCourseTitles(getCourseTitlesBySportCourse(leconId));
    resetTitleForm();
  };

  const handleEditTitle = (title: CourseTitle) => {
    setEditingTitle(title);
    setTitleForm(title.title);
    setShowAddTitle(true);
  };

  const handleDeleteTitle = (titleId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce titre et tous ses fichiers?')) {
      deleteCourseTitle(titleId);
      setCourseTitles(getCourseTitlesBySportCourse(leconId!));
      if (selectedTitle?.id === titleId) {
        setSelectedTitle(null);
        setFiles([]);
      }
      toast({ title: 'Titre supprimé' });
    }
  };

  const resetTitleForm = () => {
    setShowAddTitle(false);
    setEditingTitle(null);
    setTitleForm('');
  };

  // File CRUD
  const getFileTypeFromExtension = (extension: string): 'ppt' | 'word' | 'pdf' | 'video' => {
    const ext = extension.toLowerCase();
    if (ext === 'pptx' || ext === 'ppt') return 'ppt';
    if (ext === 'docx' || ext === 'doc') return 'word';
    if (['mp4', 'avi', 'mov', 'mkv', 'webm', 'wmv', 'flv', 'm4v'].includes(ext)) return 'video';
    return 'pdf';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const extension = file.name.split('.').pop() || '';
      const fileType = getFileTypeFromExtension(extension);
      
      const reader = new FileReader();
      reader.onload = () => {
        setFileForm(prev => ({
          ...prev,
          fileName: file.name,
          fileData: reader.result as string,
          type: fileType
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Folder upload handler
  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedTitle) return;

    setIsLoading(true);
    let addedCount = 0;

    try {
      for (const file of Array.from(files)) {
        const extension = file.name.split('.').pop() || '';
        const fileType = getFileTypeFromExtension(extension);
        
        // Skip unsupported files
        if (!['ppt', 'pptx', 'doc', 'docx', 'pdf', 'mp4', 'avi', 'mov', 'mkv', 'webm'].some(ext => 
          file.name.toLowerCase().endsWith(ext)
        )) continue;

        const fileData = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        // Use filename without extension as title
        const title = file.name.replace(/\.[^/.]+$/, '');
        
        await addFileAsync({
          courseTitleId: selectedTitle.id,
          title,
          description: '',
          type: fileType,
          fileName: file.name,
          fileData
        });
        addedCount++;
      }

      setFiles(getFilesByCourseTitle(selectedTitle.id));
      toast({ title: `${addedCount} fichiers ajoutés` });
    } catch (error) {
      console.error('Error uploading folder:', error);
      toast({ title: 'Erreur', description: 'Erreur lors de l\'import', variant: 'destructive' });
    } finally {
      setIsLoading(false);
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  // Conclusion file upload
  const handleConclusionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !leconId) return;

    setIsLoading(true);
    try {
      // Find or create a "Conclusion" course title
      let conclusionTitle = courseTitles.find(t => t.title.toLowerCase() === 'conclusion');
      
      if (!conclusionTitle) {
        conclusionTitle = addCourseTitle({ sportCourseId: leconId, title: 'Conclusion' });
        setCourseTitles(getCourseTitlesBySportCourse(leconId));
      }

      const extension = file.name.split('.').pop() || '';
      const fileType = getFileTypeFromExtension(extension);
      
      const fileData = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      await addFileAsync({
        courseTitleId: conclusionTitle.id,
        title: `Conclusion - ${file.name.replace(/\.[^/.]+$/, '')}`,
        description: 'Fichier de conclusion',
        type: fileType,
        fileName: file.name,
        fileData
      });

      toast({ title: 'Fichier de conclusion ajouté' });
      setShowConclusionUpload(false);
      setCourseTitles(getCourseTitlesBySportCourse(leconId));
    } catch (error) {
      console.error('Error uploading conclusion:', error);
      toast({ title: 'Erreur', description: 'Impossible d\'ajouter le fichier', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveFile = async () => {
    if (!fileForm.title || !selectedTitle) {
      toast({ title: 'Erreur', description: 'Le titre est requis', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      if (editingFile) {
        await updateFileAsync(editingFile.id, fileForm);
        toast({ title: 'Fichier modifié' });
      } else {
        await addFileAsync({ ...fileForm, courseTitleId: selectedTitle.id });
        toast({ title: 'Fichier ajouté' });
      }

      setFiles(getFilesByCourseTitle(selectedTitle.id));
      resetFileForm();
    } catch (error) {
      console.error('Error saving file:', error);
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder le fichier', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce fichier?')) {
      try {
        await deleteFileAsync(fileId);
        if (selectedTitle) {
          setFiles(getFilesByCourseTitle(selectedTitle.id));
        }
        toast({ title: 'Fichier supprimé' });
      } catch (error) {
        console.error('Error deleting file:', error);
        toast({ title: 'Erreur', description: 'Impossible de supprimer le fichier', variant: 'destructive' });
      }
    }
  };

  const handleOpenFile = async (file: CourseFile) => {
    setIsLoading(true);
    try {
      const fileData = await getFileDataAsync(file.id);
      if (!fileData) {
        toast({ title: 'Fichier non disponible', description: "Ce fichier n'a pas de contenu", variant: 'destructive' });
        return;
      }

      if (file.type === 'pdf') {
        const base64Data = fileData.split(',')[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } else {
        // Download for non-PDF files
        const link = document.createElement('a');
        link.href = fileData;
        link.download = file.fileName || `${file.title}.${file.type}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: 'Téléchargement lancé' });
      }
    } catch (error) {
      console.error('Error opening file:', error);
      toast({ title: 'Erreur', description: 'Impossible d\'ouvrir le fichier', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadFile = async (file: CourseFile) => {
    setIsLoading(true);
    try {
      const fileData = await getFileDataAsync(file.id);
      if (!fileData) {
        toast({ title: 'Fichier non disponible', variant: 'destructive' });
        return;
      }

      const link = document.createElement('a');
      link.href = fileData;
      link.download = file.fileName || `${file.title}.${file.type}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: 'Téléchargement lancé' });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({ title: 'Erreur', description: 'Impossible de télécharger le fichier', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditFile = async (file: CourseFile) => {
    setIsLoading(true);
    try {
      const fileData = await getFileDataAsync(file.id);
      setEditingFile(file);
      setFileForm({
        title: file.title,
        description: file.description || '',
        type: file.type,
        fileName: file.fileName,
        fileData: fileData || ''
      });
      setShowAddFile(true);
    } catch (error) {
      console.error('Error loading file for edit:', error);
      toast({ title: 'Erreur', description: 'Impossible de charger le fichier', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const resetFileForm = () => {
    setShowAddFile(false);
    setEditingFile(null);
    setFileForm({ title: '', description: '', type: 'pdf', fileName: '', fileData: '' });
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'ppt':
        return <div className="file-icon file-icon-ppt"><FileText className="w-5 h-5" /></div>;
      case 'word':
        return <div className="file-icon file-icon-word"><FileText className="w-5 h-5" /></div>;
      case 'video':
        return <div className="file-icon bg-purple-500/20 text-purple-400 p-2 rounded-lg"><Video className="w-5 h-5" /></div>;
      case 'pdf':
      default:
        return <div className="file-icon file-icon-pdf"><FileText className="w-5 h-5" /></div>;
    }
  };

  if (!course || !stage || !courseType) return null;

  // Build path for display
  const pathDisplay = `${stage.name}\\P.${courseType.name.toUpperCase()}\\${course.title}`;

  return (
    <Layout backgroundImage={bgImage}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={selectedTitle ? handleBackToTitles : handleBack} className="p-2 bg-card/80 rounded-full hover:bg-card transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {selectedTitle ? selectedTitle.title : course.title}
          </h1>
          <p className="text-muted-foreground text-sm">
            {selectedTitle ? 'Fichiers du cours' : pathDisplay}
          </p>
        </div>
        {course.image && (
          <img 
            src={course.image.startsWith('data:') ? course.image : getSportImage(course.image)}
            alt={course.title}
            className="w-16 h-16 object-cover rounded-lg"
          />
        )}
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 flex-wrap">
        <button onClick={() => navigate('/accueil')} className="hover:text-primary transition-colors">
          Accueil
        </button>
        <ChevronRight className="w-4 h-4" />
        <button onClick={() => navigate(`/stage/${stageId}`)} className="hover:text-primary transition-colors">
          {stage.name}
        </button>
        <ChevronRight className="w-4 h-4" />
        <button onClick={handleBack} className="hover:text-primary transition-colors">
          P.{courseType.name.toUpperCase()}
        </button>
        <ChevronRight className="w-4 h-4" />
        {selectedTitle ? (
          <>
            <button onClick={handleBackToTitles} className="hover:text-primary transition-colors">
              {course.title}
            </button>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground font-medium">{selectedTitle.title}</span>
          </>
        ) : (
          <span className="text-foreground font-medium">{course.title}</span>
        )}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card p-6 flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span>Chargement...</span>
          </div>
        </div>
      )}

      {/* Course Titles (Headings) Section */}
      {!selectedTitle && (
        <div className="glass-card p-6 animate-fade-in">
          <div className="space-y-3 mb-6">
            {courseTitles.map((title, index) => (
              <div key={title.id} className="file-item animate-slide-in group">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                    {index + 1}
                  </span>
                  <div 
                    className="flex-1 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleTitleSelect(title)}
                  >
                    <h4 className="font-medium text-lg">{title.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {getFilesByCourseTitle(title.id).length} fichiers
                    </p>
                  </div>
                </div>
                {userMode === 'admin' && (
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEditTitle(title)} className="btn-ghost p-2 border border-border">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteTitle(title.id)} className="btn-destructive p-2">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {courseTitles.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Aucun cours disponible</p>
            )}
          </div>

          {userMode === 'admin' && (
            <div className="flex flex-wrap gap-3">
              {!showAddTitle && (
                <>
                  <button onClick={() => setShowAddTitle(true)} className="btn-success flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Ajouter Cours
                  </button>
                  <button 
                    onClick={() => setShowConclusionUpload(true)} 
                    className="btn-primary flex items-center gap-2"
                  >
                    <FileCheck className="w-5 h-5" />
                    Ajouter Conclusion
                  </button>
                </>
              )}
            </div>
          )}

          {/* Conclusion Upload Modal */}
          {showConclusionUpload && (
            <div className="glass-card p-4 mt-4 animate-scale-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Ajouter Fichier de Conclusion</h3>
                <button onClick={() => setShowConclusionUpload(false)} className="p-1 hover:bg-muted rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Ce fichier sera ajouté comme conclusion pour {course.title}
              </p>
              <label className="flex items-center gap-2 btn-ghost border border-dashed border-border cursor-pointer justify-center py-4">
                <Upload className="w-5 h-5" />
                <span>Sélectionner un fichier (PPT, Word, PDF, Vidéo)</span>
                <input 
                  type="file" 
                  onChange={handleConclusionUpload} 
                  accept=".ppt,.pptx,.doc,.docx,.pdf,.mp4,.avi,.mov,.mkv,.webm"
                  className="hidden" 
                />
              </label>
            </div>
          )}

          {showAddTitle && (
            <div className="glass-card p-4 mt-4 animate-scale-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{editingTitle ? 'Modifier Cours' : 'Ajouter Cours'}</h3>
                <button onClick={resetTitleForm} className="p-1 hover:bg-muted rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Titre du cours *</label>
                  <input
                    type="text"
                    value={titleForm}
                    onChange={(e) => setTitleForm(e.target.value)}
                    className="glass-input w-full p-2"
                    placeholder="Ex: 1.HISTORIQUE, 2.REGLES, etc."
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleSaveTitle} className="btn-success flex-1">
                    {editingTitle ? 'Enregistrer' : 'Ajouter'}
                  </button>
                  <button onClick={resetTitleForm} className="btn-ghost border border-border">Annuler</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Files Section */}
      {selectedTitle && (
        <div className="glass-card p-6 animate-fade-in">
          <div className="space-y-3 mb-6">
            {files.map((file) => (
              <div key={file.id} className="file-item animate-slide-in">
                {getFileIcon(file.type)}
                <div className="flex-1">
                  <h4 className="font-medium">{file.title}</h4>
                  <p className="text-sm text-muted-foreground">{file.description || file.fileName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleOpenFile(file)} className="btn-success flex items-center gap-1 text-sm">
                    <Eye className="w-4 h-4" />
                    Ouvrir
                  </button>
                  <button onClick={() => handleDownloadFile(file)} className="btn-ghost flex items-center gap-1 text-sm border border-border">
                    <Download className="w-4 h-4" />
                    Télécharger
                  </button>
                  {userMode === 'admin' && (
                    <>
                      <button onClick={() => handleEditFile(file)} className="btn-ghost flex items-center gap-1 text-sm border border-border">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteFile(file.id)} className="btn-destructive flex items-center gap-1 text-sm">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {files.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Aucun fichier disponible pour ce cours</p>
            )}
          </div>

          {userMode === 'admin' && !showAddFile && (
            <div className="flex gap-3 flex-wrap">
              <button onClick={() => setShowAddFile(true)} className="btn-success flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Ajouter Fichier
              </button>
              <label className="btn-primary flex items-center gap-2 cursor-pointer">
                <FolderUp className="w-5 h-5" />
                Importer Dossier
                <input
                  ref={folderInputRef}
                  type="file"
                  onChange={handleFolderUpload}
                  multiple
                  // @ts-ignore
                  webkitdirectory=""
                  className="hidden"
                />
              </label>
            </div>
          )}

          {showAddFile && (
            <div className="glass-card p-4 mt-4 animate-scale-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{editingFile ? 'Modifier Fichier' : 'Ajouter Fichier'}</h3>
                <button onClick={resetFileForm} className="p-1 hover:bg-muted rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Titre *</label>
                  <input
                    type="text"
                    value={fileForm.title}
                    onChange={(e) => setFileForm(prev => ({ ...prev, title: e.target.value }))}
                    className="glass-input w-full p-2"
                    placeholder="Titre du fichier"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <input
                    type="text"
                    value={fileForm.description}
                    onChange={(e) => setFileForm(prev => ({ ...prev, description: e.target.value }))}
                    className="glass-input w-full p-2"
                    placeholder="Description optionnelle"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fichier</label>
                  <label className="flex items-center gap-2 btn-ghost border border-dashed border-border cursor-pointer justify-center py-3">
                    <Upload className="w-5 h-5" />
                    <span>{fileForm.fileName || 'Choisir un fichier (PPT, Word, PDF, Vidéo)'}</span>
                    <input 
                      type="file" 
                      onChange={handleFileUpload} 
                      accept=".ppt,.pptx,.doc,.docx,.pdf,.mp4,.avi,.mov,.mkv,.webm"
                      className="hidden" 
                    />
                  </label>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleSaveFile} className="btn-success flex-1">
                    {editingFile ? 'Enregistrer' : 'Ajouter'}
                  </button>
                  <button onClick={resetFileForm} className="btn-ghost border border-border">Annuler</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
};

export default LeconDetail;
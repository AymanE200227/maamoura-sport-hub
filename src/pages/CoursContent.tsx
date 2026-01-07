import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, FileText, Edit, Trash2, Eye, Upload, X, Download, Loader2 } from 'lucide-react';
import Layout from '@/components/Layout';
import { 
  getSportCourses,
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
import { SportCourse, CourseTitle, CourseFile } from '@/types';
import { getSportImage } from '@/assets/sports';
import { useToast } from '@/hooks/use-toast';
import { useClickSound } from '@/hooks/useClickSound';
import bgImage from '@/assets/bg3.jpg';

const CoursContent = () => {
  const { typeId, stageId, courseId } = useParams<{ typeId: string; stageId: string; courseId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { playClick } = useClickSound();
  
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
    type: 'pdf' as 'ppt' | 'word' | 'pdf',
    fileName: '',
    fileData: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const userMode = getUserMode();

  useEffect(() => {
    if (!userMode) {
      navigate('/');
      return;
    }
    loadData();
  }, [courseId, userMode, navigate]);

  const loadData = () => {
    const courses = getSportCourses();
    const foundCourse = courses.find(c => c.id === courseId);
    if (foundCourse) {
      setCourse(foundCourse);
      const titles = getCourseTitlesBySportCourse(courseId!);
      setCourseTitles(titles);
    }
  };

  const handleTitleSelect = (title: CourseTitle) => {
    playClick();
    setSelectedTitle(title);
    setFiles(getFilesByCourseTitle(title.id));
  };

  const handleBackToTitles = () => {
    playClick();
    setSelectedTitle(null);
    setFiles([]);
  };

  const handleBack = () => {
    playClick();
    navigate(`/cours/${typeId}`);
  };

  // Title CRUD
  const handleSaveTitle = () => {
    if (!titleForm.trim() || !courseId) {
      toast({ title: 'Erreur', description: 'Le titre est requis', variant: 'destructive' });
      return;
    }

    if (editingTitle) {
      updateCourseTitle(editingTitle.id, { title: titleForm });
      toast({ title: 'Titre modifié' });
    } else {
      addCourseTitle({ sportCourseId: courseId, title: titleForm });
      toast({ title: 'Titre ajouté' });
    }

    setCourseTitles(getCourseTitlesBySportCourse(courseId));
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
      setCourseTitles(getCourseTitlesBySportCourse(courseId!));
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
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      let fileType: 'ppt' | 'word' | 'pdf' = 'pdf';
      if (extension === 'pptx' || extension === 'ppt') fileType = 'ppt';
      else if (extension === 'docx' || extension === 'doc') fileType = 'word';
      
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
      case 'pdf':
      default:
        return <div className="file-icon file-icon-pdf"><FileText className="w-5 h-5" /></div>;
    }
  };

  if (!course) return null;

  return (
    <Layout backgroundImage={bgImage}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={selectedTitle ? handleBackToTitles : handleBack} className="p-2 bg-card/80 rounded-full hover:bg-card transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {selectedTitle ? selectedTitle.title : `Cours ${course.title}`}
          </h1>
          <p className="text-muted-foreground">
            {selectedTitle ? 'Fichiers du cours' : 'Sélectionnez un cours'}
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

      {/* Course Titles Section */}
      {!selectedTitle && (
        <div className="glass-card p-6 animate-fade-in">
          <div className="space-y-3 mb-6">
            {courseTitles.map((title) => (
              <div key={title.id} className="file-item animate-slide-in group">
                <div 
                  className="flex-1 cursor-pointer hover:text-primary transition-colors"
                  onClick={() => handleTitleSelect(title)}
                >
                  <h4 className="font-medium text-lg">{title.title}</h4>
                  <p className="text-sm text-muted-foreground">Cliquer pour voir les fichiers</p>
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

          {userMode === 'admin' && !showAddTitle && (
            <button onClick={() => setShowAddTitle(true)} className="btn-success flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Ajouter Cours
            </button>
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
                    placeholder="Ex: Initiation au Basketball"
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
            <button onClick={() => setShowAddFile(true)} className="btn-success flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Ajouter Fichier
            </button>
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
                    placeholder="Description (optionnel)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fichier</label>
                  <label className="flex items-center gap-2 btn-ghost border border-dashed border-border cursor-pointer justify-center py-4">
                    <Upload className="w-5 h-5" />
                    <span>{fileForm.fileName || 'Choisir un fichier'}</span>
                    <input type="file" accept=".pdf,.ppt,.pptx,.doc,.docx" onChange={handleFileUpload} className="hidden" />
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

export default CoursContent;

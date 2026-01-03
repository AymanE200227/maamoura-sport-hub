import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, FileText, Edit, Trash2, Eye, Upload, X, ArrowLeft, Download } from 'lucide-react';
import Layout from '@/components/Layout';
import { 
  getCourseTypes, 
  getSportCoursesByType, 
  getCourseTitlesBySportCourse,
  getFilesByCourseTitle,
  addCourseTitle,
  updateCourseTitle,
  deleteCourseTitle,
  addFile,
  updateFile,
  deleteFile,
  getUserMode
} from '@/lib/storage';
import { CourseType, SportCourse, CourseTitle, CourseFile } from '@/types';
import { getSportImage } from '@/assets/sports';
import { useToast } from '@/hooks/use-toast';
import bgImage from '@/assets/bg3.jpg';

const CoursDetail = () => {
  const { typeId } = useParams<{ typeId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const carouselRef = useRef<HTMLDivElement>(null);
  
  const [courseType, setCourseType] = useState<CourseType | null>(null);
  const [sportCourses, setSportCourses] = useState<SportCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<SportCourse | null>(null);
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
      const courses = getSportCoursesByType(typeId!);
      setSportCourses(courses);
    }
  };

  const handleCourseSelect = (course: SportCourse) => {
    setSelectedCourse(course);
    setSelectedTitle(null);
    setFiles([]);
    const titles = getCourseTitlesBySportCourse(course.id);
    setCourseTitles(titles);
  };

  const handleTitleSelect = (title: CourseTitle) => {
    setSelectedTitle(title);
    setFiles(getFilesByCourseTitle(title.id));
  };

  const handleBackToTitles = () => {
    setSelectedTitle(null);
    setFiles([]);
  };

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = 300;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Title CRUD
  const handleSaveTitle = () => {
    if (!titleForm.trim() || !selectedCourse) {
      toast({ title: 'Erreur', description: 'Le titre est requis', variant: 'destructive' });
      return;
    }

    if (editingTitle) {
      updateCourseTitle(editingTitle.id, { title: titleForm });
      toast({ title: 'Titre modifié', description: 'Le titre a été mis à jour' });
    } else {
      addCourseTitle({ sportCourseId: selectedCourse.id, title: titleForm });
      toast({ title: 'Titre ajouté', description: 'Le titre a été ajouté avec succès' });
    }

    setCourseTitles(getCourseTitlesBySportCourse(selectedCourse.id));
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
      if (selectedCourse) {
        setCourseTitles(getCourseTitlesBySportCourse(selectedCourse.id));
      }
      if (selectedTitle?.id === titleId) {
        setSelectedTitle(null);
        setFiles([]);
      }
      toast({ title: 'Titre supprimé', description: 'Le titre a été supprimé' });
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

  const handleSaveFile = () => {
    if (!fileForm.title || !selectedTitle) {
      toast({ title: 'Erreur', description: 'Le titre est requis', variant: 'destructive' });
      return;
    }

    if (editingFile) {
      updateFile(editingFile.id, fileForm);
      toast({ title: 'Fichier modifié', description: 'Le fichier a été mis à jour' });
    } else {
      addFile({ ...fileForm, courseTitleId: selectedTitle.id });
      toast({ title: 'Fichier ajouté', description: 'Le fichier a été ajouté avec succès' });
    }

    setFiles(getFilesByCourseTitle(selectedTitle.id));
    resetFileForm();
  };

  const handleDeleteFile = (fileId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce fichier?')) {
      deleteFile(fileId);
      if (selectedTitle) {
        setFiles(getFilesByCourseTitle(selectedTitle.id));
      }
      toast({ title: 'Fichier supprimé', description: 'Le fichier a été supprimé' });
    }
  };

  const handleOpenFile = (file: CourseFile) => {
    if (!file.fileData) {
      toast({ 
        title: 'Fichier non disponible', 
        description: "Ce fichier de démonstration n'a pas de contenu", 
        variant: 'destructive' 
      });
      return;
    }

    try {
      // For PDFs, try to open in new window with proper content type
      if (file.type === 'pdf') {
        // Convert base64 to blob
        const base64Data = file.fileData.split(',')[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        
        const newWindow = window.open(blobUrl, '_blank');
        if (!newWindow) {
          // If popup blocked, fall back to download
          handleDownloadFile(file);
        }
      } else {
        // For other files, download directly
        handleDownloadFile(file);
      }
    } catch (error) {
      console.error('Error opening file:', error);
      toast({ 
        title: 'Erreur', 
        description: "Impossible d'ouvrir le fichier. Essayez de le télécharger.", 
        variant: 'destructive' 
      });
    }
  };

  const handleDownloadFile = (file: CourseFile) => {
    if (!file.fileData) {
      toast({ 
        title: 'Fichier non disponible', 
        description: "Ce fichier n'a pas de contenu", 
        variant: 'destructive' 
      });
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = file.fileData;
      link.download = file.fileName || `${file.title}.${file.type}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({ 
        title: 'Téléchargement lancé', 
        description: file.fileName 
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({ 
        title: 'Erreur', 
        description: "Impossible de télécharger le fichier", 
        variant: 'destructive' 
      });
    }
  };

  const handleEditFile = (file: CourseFile) => {
    setEditingFile(file);
    setFileForm({
      title: file.title,
      description: file.description || '',
      type: file.type,
      fileName: file.fileName,
      fileData: file.fileData
    });
    setShowAddFile(true);
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

  if (!courseType) return null;

  return (
    <Layout backgroundImage={bgImage}>
      {/* Carousel Section */}
      <div className="relative mb-8">
        <button 
          onClick={() => scrollCarousel('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-card/80 rounded-full hover:bg-card transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div ref={carouselRef} className="carousel-container px-12">
          {sportCourses.map((course) => (
            <div
              key={course.id}
              onClick={() => handleCourseSelect(course)}
              className={`flex-shrink-0 w-48 cursor-pointer transition-all duration-300 ${
                selectedCourse?.id === course.id ? 'scale-105 ring-2 ring-primary' : 'opacity-80 hover:opacity-100'
              }`}
            >
              <div className="course-card h-36">
                <img src={course.image.startsWith('data:') ? course.image : getSportImage(course.image)} alt={course.title} className="w-full h-full object-cover" />
                <div className="course-card-overlay">
                  <h3 className="text-lg font-semibold">{course.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{course.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={() => scrollCarousel('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-card/80 rounded-full hover:bg-card transition-colors"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Course Titles Section */}
      {selectedCourse && !selectedTitle && (
        <div className="glass-card p-6 animate-fade-in">
          <h2 className="text-2xl font-bold mb-6">Cours {selectedCourse.title}</h2>

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
          <div className="flex items-center gap-4 mb-6">
            <button onClick={handleBackToTitles} className="btn-ghost p-2 border border-border">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold">Fichiers: {selectedTitle.title}</h2>
          </div>

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
                        Modifier
                      </button>
                      <button onClick={() => handleDeleteFile(file.id)} className="btn-destructive flex items-center gap-1 text-sm">
                        <Trash2 className="w-4 h-4" />
                        Supprimer
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
                  <label className="block text-sm font-medium mb-1">Description (optionnel)</label>
                  <input
                    type="text"
                    value={fileForm.description}
                    onChange={(e) => setFileForm(prev => ({ ...prev, description: e.target.value }))}
                    className="glass-input w-full p-2"
                    placeholder="Description du fichier"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Type de fichier</label>
                  <select
                    value={fileForm.type}
                    onChange={(e) => setFileForm(prev => ({ ...prev, type: e.target.value as 'ppt' | 'word' | 'pdf' }))}
                    className="glass-input w-full p-2"
                  >
                    <option value="pdf">PDF</option>
                    <option value="ppt">PowerPoint</option>
                    <option value="word">Word</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Fichier</label>
                  <label className="flex items-center gap-2 btn-ghost border border-dashed border-border cursor-pointer justify-center py-4">
                    <Upload className="w-5 h-5" />
                    <span>{fileForm.fileName || 'Choisir un fichier'}</span>
                    <input type="file" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.ppt,.pptx" className="hidden" />
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

export default CoursDetail;

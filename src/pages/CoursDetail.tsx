import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, FileText, Edit, Trash2, Download, Eye, Upload, X } from 'lucide-react';
import Layout from '@/components/Layout';
import { 
  getCourseTypes, 
  getSportCoursesByType, 
  getFilesBySportCourse,
  addFile,
  updateFile,
  deleteFile,
  getUserMode
} from '@/lib/storage';
import { CourseType, SportCourse, CourseFile } from '@/types';
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
  const [files, setFiles] = useState<CourseFile[]>([]);
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
      if (courses.length > 0 && !selectedCourse) {
        setSelectedCourse(courses[0]);
        setFiles(getFilesBySportCourse(courses[0].id));
      }
    }
  };

  const handleCourseSelect = (course: SportCourse) => {
    setSelectedCourse(course);
    setFiles(getFilesBySportCourse(course.id));
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
    if (!fileForm.title || !selectedCourse) {
      toast({
        title: 'Erreur',
        description: 'Le titre est requis',
        variant: 'destructive'
      });
      return;
    }

    if (editingFile) {
      updateFile(editingFile.id, fileForm);
      toast({ title: 'Fichier modifié', description: 'Le fichier a été mis à jour' });
    } else {
      addFile({
        ...fileForm,
        sportCourseId: selectedCourse.id
      });
      toast({ title: 'Fichier ajouté', description: 'Le fichier a été ajouté avec succès' });
    }

    setFiles(getFilesBySportCourse(selectedCourse.id));
    resetFileForm();
  };

  const handleDeleteFile = (fileId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce fichier?')) {
      deleteFile(fileId);
      if (selectedCourse) {
        setFiles(getFilesBySportCourse(selectedCourse.id));
      }
      toast({ title: 'Fichier supprimé', description: 'Le fichier a été supprimé' });
    }
  };

  const handleOpenFile = (file: CourseFile) => {
    if (file.fileData) {
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head><title>${file.title}</title></head>
            <body style="margin:0">
              <iframe src="${file.fileData}" style="width:100%;height:100vh;border:none"></iframe>
            </body>
          </html>
        `);
      }
    } else {
      toast({
        title: 'Fichier non disponible',
        description: 'Ce fichier de démonstration n\'a pas de contenu',
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
    setFileForm({
      title: '',
      description: '',
      type: 'pdf',
      fileName: '',
      fileData: ''
    });
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

        <div 
          ref={carouselRef}
          className="carousel-container px-12"
        >
          {sportCourses.map((course) => (
            <div
              key={course.id}
              onClick={() => handleCourseSelect(course)}
              className={`flex-shrink-0 w-48 cursor-pointer transition-all duration-300 ${
                selectedCourse?.id === course.id ? 'scale-105 ring-2 ring-primary' : 'opacity-80 hover:opacity-100'
              }`}
            >
              <div className="course-card h-36">
                <img 
                  src={getSportImage(course.image)}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
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

      {/* Files Section */}
      {selectedCourse && (
        <div className="glass-card p-6 animate-fade-in">
          <h2 className="text-2xl font-bold mb-6">Fichiers {selectedCourse.title}</h2>

          {/* File List */}
          <div className="space-y-3 mb-6">
            {files.map((file) => (
              <div key={file.id} className="file-item animate-slide-in">
                {getFileIcon(file.type)}
                <div className="flex-1">
                  <h4 className="font-medium">{file.title}</h4>
                  <p className="text-sm text-muted-foreground">{file.description || file.fileName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleOpenFile(file)}
                    className="btn-success flex items-center gap-1 text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    Ouvrir
                  </button>
                  {userMode === 'admin' && (
                    <>
                      <button 
                        onClick={() => handleEditFile(file)}
                        className="btn-ghost flex items-center gap-1 text-sm border border-border"
                      >
                        <Edit className="w-4 h-4" />
                        Modifier
                      </button>
                      <button 
                        onClick={() => handleDeleteFile(file.id)}
                        className="btn-destructive flex items-center gap-1 text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        Supprimer
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {files.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Aucun fichier disponible pour ce cours
              </p>
            )}
          </div>

          {/* Add File Button - Admin Only */}
          {userMode === 'admin' && !showAddFile && (
            <button 
              onClick={() => setShowAddFile(true)}
              className="btn-success flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Ajouter Fichier
            </button>
          )}

          {/* Add/Edit File Form */}
          {showAddFile && (
            <div className="glass-card p-4 mt-4 animate-scale-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">
                  {editingFile ? 'Modifier Fichier' : 'Ajouter Fichier'}
                </h3>
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
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx,.ppt,.pptx"
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex gap-3">
                  <button onClick={handleSaveFile} className="btn-success flex-1">
                    {editingFile ? 'Enregistrer' : 'Ajouter'}
                  </button>
                  <button onClick={resetFileForm} className="btn-ghost border border-border">
                    Annuler
                  </button>
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

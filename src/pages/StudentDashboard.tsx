import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GraduationCap, BookOpen, FileText, Download, ChevronRight,
  Calendar, User, Award, Layers, File, Shield, Loader2, Lock
} from 'lucide-react';
import Layout from '@/components/Layout';
import { 
  getUserMode, getStudentAccounts, getPromos, getCourseTypes,
  getSportCourses, getDocumentModels, getModelFilesByModel, getStages,
  getModelFileDataAsync
} from '@/lib/storage';
import { canAccessStage, canAccess } from '@/lib/permissions';
import { StudentAccount, Promo, DocumentModel, ModelFile, CourseType, UserRole } from '@/types';
import { useClickSound } from '@/hooks/useClickSound';
import { useToast } from '@/hooks/use-toast';
import bgImage from '@/assets/bg2.jpg';
import logoOfficial from '@/assets/logo-official.png';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const userMode = getUserMode();
  const { playClick } = useClickSound();
  const { toast } = useToast();
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [modelFiles, setModelFiles] = useState<ModelFile[]>([]);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  // Map user mode to role for permissions
  const userRole: UserRole = useMemo(() => {
    if (userMode === 'admin') return 'admin';
    if (userMode === 'user') return 'instructeur';
    if (userMode === 'eleve') return 'eleve';
    return 'eleve';
  }, [userMode]);

  // Get current student data (in real app would use session)
  const currentStudent = useMemo(() => {
    const students = getStudentAccounts();
    return students[0] || null; // Simplified - would use actual session
  }, []);

  const currentPromo = useMemo(() => {
    if (!currentStudent?.promoId) return null;
    const promos = getPromos();
    return promos.find(p => p.id === currentStudent.promoId) || null;
  }, [currentStudent]);

  const courseTypes = useMemo(() => getCourseTypes(), []);
  const documentModels = useMemo(() => getDocumentModels().filter(m => m.enabled !== false), []);
  
  // Filter stages by permissions
  const stages = useMemo(() => {
    const allStages = getStages().filter(s => s.enabled);
    return allStages.filter(stage => canAccessStage(userRole, stage.id));
  }, [userRole]);
  
  // Filter courses by permissions
  const courses = useMemo(() => {
    const allCourses = getSportCourses();
    return allCourses.filter(course => {
      // Check if stage is accessible
      if (!canAccessStage(userRole, course.stageId)) return false;
      // Check if course itself is accessible
      return canAccess(userRole, 'lecon', course.id);
    });
  }, [userRole]);

  useEffect(() => {
    if (!userMode) {
      navigate('/');
      return;
    }
  }, [userMode, navigate]);

  const handleSelectModel = useCallback((model: DocumentModel) => {
    playClick();
    setSelectedModelId(model.id);
    setModelFiles(getModelFilesByModel(model.id));
  }, [playClick]);

  const handleDownloadFile = useCallback(async (file: ModelFile) => {
    playClick();
    setIsDownloading(file.id);
    try {
      const fileData = await getModelFileDataAsync(file.id);
      if (!fileData) {
        toast({ title: 'Fichier non disponible', variant: 'destructive' });
        return;
      }
      const link = document.createElement('a');
      link.href = fileData;
      link.download = file.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: 'Téléchargement lancé' });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({ title: 'Erreur de téléchargement', variant: 'destructive' });
    } finally {
      setIsDownloading(null);
    }
  }, [playClick, toast]);

  const handleCourseClick = useCallback((typeId: string) => {
    playClick();
    navigate(`/cours/${typeId}`);
  }, [navigate, playClick]);

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return 'file-icon-pdf';
      case 'word': return 'file-icon-word';
      case 'ppt': return 'file-icon-ppt';
      default: return 'file-icon-pdf';
    }
  };

  // Get course count that respects permissions
  const getCourseCount = useCallback((typeId: string) => {
    return courses.filter(c => c.courseTypeId === typeId).length;
  }, [courses]);

  return (
    <Layout backgroundImage={bgImage}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Welcome Header */}
        <div className="glass-panel p-6 animate-fade-in">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-gold">
              <GraduationCap className="w-10 h-10 text-primary-foreground" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl font-bold mb-1">
                Bienvenue, <span className="gold-text">{currentStudent?.prenom || 'Stagiaire'}</span>
              </h1>
              <p className="text-muted-foreground">
                Tableau de bord personnel - Centre Sportif FAR Maâmoura
              </p>
              {currentPromo && (
                <div className="mt-3 flex flex-wrap gap-2 justify-center md:justify-start">
                  <span className="badge-gold flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    {currentPromo.name}
                  </span>
                  <span className="badge-gold flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {currentPromo.year}
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-4">
              <div className="text-center p-4 stat-card-gold rounded-xl">
                <p className="text-2xl font-bold gold-text">{courses.length}</p>
                <p className="text-xs text-muted-foreground">Cours accessibles</p>
              </div>
              <div className="text-center p-4 stat-card-gold rounded-xl">
                <p className="text-2xl font-bold text-success">{stages.length}</p>
                <p className="text-xs text-muted-foreground">Stages</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card-gold flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Matricule</p>
              <p className="font-mono gold-text">{currentStudent?.matricule || 'N/A'}</p>
            </div>
          </div>
          <div className="stat-card-gold flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Grade</p>
              <p className="font-medium">{currentStudent?.grade || 'Stagiaire'}</p>
            </div>
          </div>
          <div className="stat-card-gold flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
              <Layers className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Unité</p>
              <p className="font-medium">{currentStudent?.unite || 'CSM'}</p>
            </div>
          </div>
          <div className="stat-card-gold flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Catégories</p>
              <p className="font-bold gold-text">{courseTypes.length}</p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Course Categories */}
          <div className="lg:col-span-2 glass-card overflow-hidden">
            <div className="p-4 bg-gradient-gold border-b border-primary/20">
              <h2 className="font-bold flex items-center gap-2 text-primary-foreground">
                <BookOpen className="w-5 h-5" />
                Catégories de Cours
              </h2>
            </div>
            <div className="p-4 grid sm:grid-cols-2 gap-4">
              {courseTypes.map((type) => {
                const courseCount = getCourseCount(type.id);
                const hasAccess = courseCount > 0;
                
                return (
                  <button
                    key={type.id}
                    onClick={() => hasAccess && handleCourseClick(type.id)}
                    disabled={!hasAccess}
                    className={`p-4 rounded-xl border-2 transition-all text-left group ${
                      hasAccess 
                        ? 'border-primary/20 hover:border-primary/40 bg-card hover:bg-card/80 cursor-pointer' 
                        : 'border-muted/20 bg-muted/10 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`badge-gold text-xs ${!hasAccess ? 'opacity-50' : ''}`}>
                        {courseCount} cours
                      </span>
                      {hasAccess ? (
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      ) : (
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <h3 className="font-bold text-lg">{type.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {type.description || `Cours ${type.name.toLowerCase()}`}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Document Models */}
          <div className="glass-card overflow-hidden">
            <div className="p-4 bg-success/20 border-b border-success/20">
              <h2 className="font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-success" />
                Modèles Documents
              </h2>
            </div>
            <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
              {documentModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleSelectModel(model)}
                  className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${
                    selectedModelId === model.id 
                      ? 'bg-primary/20 border border-primary/40' 
                      : 'hover:bg-muted/30 border border-transparent'
                  }`}
                >
                  <FileText className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{model.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Selected Model Files */}
        {selectedModelId && modelFiles.length > 0 && (
          <div className="glass-card overflow-hidden animate-fade-in">
            <div className="p-4 bg-accent/20 border-b border-accent/20">
              <h2 className="font-bold flex items-center gap-2">
                <File className="w-5 h-5 text-accent" />
                Fichiers disponibles ({modelFiles.length})
              </h2>
            </div>
            <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {modelFiles.map((file) => (
                <div
                  key={file.id}
                  className={`file-item group ${isDownloading === file.id ? 'opacity-70' : ''}`}
                  onClick={() => !isDownloading && handleDownloadFile(file)}
                >
                  <div className={`file-icon ${getFileIcon(file.type)}`}>
                    <File className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{file.fileName}</p>
                  </div>
                  {isDownloading === file.id ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : (
                    <Download className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedModelId && modelFiles.length === 0 && (
          <div className="glass-card p-8 text-center animate-fade-in">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucun fichier disponible pour ce modèle</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default StudentDashboard;

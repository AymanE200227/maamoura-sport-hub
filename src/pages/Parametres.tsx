import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Lock, Check, Eye, EyeOff, Download, Upload, Users, Volume2, VolumeX, 
  RotateCcw, FolderArchive, GraduationCap, Settings, Trash2, Edit, Plus, 
  FileSpreadsheet, Layers, ToggleLeft, ToggleRight, X, Palette, ImagePlus,
  Monitor, Image as ImageIcon, FileText, ArrowUpCircle, UserCheck, File,
  Presentation, FileType, BookOpen, ChevronRight, Lightbulb, Sparkles,
  Shield, Database, HelpCircle, GripVertical, AlertTriangle
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TablePagination from '@/components/TablePagination';
import Layout from '@/components/Layout';
import PermissionsManager from '@/components/PermissionsManager';
import ActivityLogSection from '@/components/ActivityLogSection';
import { 
  getAdminPassword, 
  setAdminPassword, 
  getUserPassword,
  setUserPassword,
  getUserMode, 
  verifyAdminPassword,
  exportAllData,
  importAllData,
  getBackgroundImage,
  setBackgroundImage,
  resetBackgroundImage,
  isBackgroundEnabled,
  setBackgroundEnabled,
  isDownloadEnabled,
  setDownloadEnabled,
  getStudentAccounts,
  addStudentAccount,
  updateStudentAccount,
  deleteStudentAccount,
  importStudentAccountsBulk,
  getStages,
  updateStage,
  addStage,
  deleteStage,
  saveStages,
  getAppSettings,
  saveAppSettings,
  getPromos,
  addPromo,
  deletePromo,
  promotePromo,
  assignStudentsToPromo,
  deleteStudentsByPromo,
  getDocumentModels,
  addDocumentModel,
  updateDocumentModel,
  deleteDocumentModel,
  getModelFilesByModel,
  addModelFileAsync,
  deleteModelFileAsync,
  getModelFileDataAsync,
  clearAllData
} from '@/lib/storage';
import { clearAllFiles } from '@/lib/fileStorage';
import { exportToZip, importFromZip } from '@/lib/zipExport';
import { 
  getClickSound, 
  setClickSound, 
  resetClickSound, 
  isClickSoundEnabled, 
  setClickSoundEnabled 
} from '@/hooks/useClickSound';
import { useToast } from '@/hooks/use-toast';
import { useClickSound } from '@/hooks/useClickSound';
import { logPageView } from '@/lib/activityLog';
import { StudentAccount, Stage, AppSettings, Promo, DocumentModel, ModelFile } from '@/types';
import * as XLSX from 'xlsx';

// Import all background images
import bg1 from '@/assets/bg.jpg';
import bg2 from '@/assets/bg2.jpg';
import bg3 from '@/assets/bg3.jpg';
import bg4 from '@/assets/bg4.jpg';
import doorBg from '@/assets/door.png';
import basketballBg from '@/assets/basketball-game-concept.jpg';
import terrainBg from '@/assets/bgterrain.png';
import logoOfficial from '@/assets/logo-official.png';

// Role targeting options
const disableTargetOptions = [
  { value: 'none', label: 'Aucun', color: 'bg-success/20 text-success border-success/40' },
  { value: 'eleves', label: 'Élèves', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
  { value: 'instructeurs', label: 'Instructeurs', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
  { value: 'all', label: 'Tous', color: 'bg-destructive/20 text-destructive border-destructive/40' },
] as const;

// Sortable Stage Item component
const SortableStageItem = ({ stage, onToggle, onDelete, onChangeDisableTarget }: { 
  stage: Stage; 
  onToggle: (stage: Stage) => void;
  onDelete: (id: string) => void;
  onChangeDisableTarget: (stageId: string, target: 'all' | 'eleves' | 'instructeurs' | 'none') => void;
}) => {
  const [showTargetMenu, setShowTargetMenu] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 1,
  };

  const currentTarget = stage.disabledFor || 'none';
  const targetOption = disableTargetOptions.find(o => o.value === currentTarget) || disableTargetOptions[0];

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`p-4 rounded-xl border-2 transition-all duration-200 ${
        stage.enabled 
          ? 'bg-card border-primary/30 shadow-lg shadow-primary/5' 
          : 'bg-muted/20 border-border/20 opacity-60'
      } ${isDragging ? 'shadow-2xl ring-2 ring-primary scale-105' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div 
          {...attributes} 
          {...listeners}
          className="p-2 cursor-grab active:cursor-grabbing hover:bg-muted/50 rounded-lg touch-none"
        >
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-bold text-lg gold-text">{stage.name}</h4>
              <p className="text-sm text-muted-foreground">{stage.description}</p>
            </div>
            <button 
              onClick={() => onToggle(stage)} 
              className={`p-2 rounded-lg transition-all duration-200 ${
                stage.enabled 
                  ? 'bg-success/20 text-success hover:bg-success/30 hover:scale-110' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {stage.enabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
            </button>
          </div>
          
          {/* Role Targeting */}
          <div className="mb-3">
            <p className="text-xs text-muted-foreground mb-2">Désactiver pour:</p>
            <div className="relative">
              <button
                onClick={() => setShowTargetMenu(!showTargetMenu)}
                className={`w-full text-left px-3 py-2 rounded-lg border text-sm flex items-center justify-between transition-all ${targetOption.color}`}
              >
                <span>{targetOption.label}</span>
                <ChevronRight className={`w-4 h-4 transition-transform ${showTargetMenu ? 'rotate-90' : ''}`} />
              </button>
              {showTargetMenu && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden animate-fade-in">
                  {disableTargetOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        onChangeDisableTarget(stage.id, option.value);
                        setShowTargetMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors hover:bg-muted/50 ${
                        currentTarget === option.value ? option.color : ''
                      }`}
                    >
                      {option.value === 'none' && <Check className="w-4 h-4" />}
                      {option.value === 'eleves' && <GraduationCap className="w-4 h-4" />}
                      {option.value === 'instructeurs' && <UserCheck className="w-4 h-4" />}
                      {option.value === 'all' && <X className="w-4 h-4" />}
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className={`text-xs px-2 py-1 rounded-full transition-colors ${stage.enabled ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
              {stage.enabled ? 'Activé' : 'Désactivé'}
            </span>
            {!['fcb', 'cat1', 'cat2', 'be', 'bs', 'aide'].includes(stage.id) && (
              <button onClick={() => onDelete(stage.id)} className="p-2 hover:bg-destructive/20 rounded-lg text-destructive transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


const wallpapers = [
  { id: 'bg1', name: 'Stade', src: bg1 },
  { id: 'bg2', name: 'Centre Sportif', src: bg2 },
  { id: 'bg3', name: 'Terrain', src: bg3 },
  { id: 'bg4', name: 'Panorama', src: bg4 },
  { id: 'door', name: 'Porte CSM', src: doorBg },
  { id: 'basketball', name: 'Basketball', src: basketballBg },
  { id: 'terrain', name: 'Salle Basket', src: terrainBg },
];

const Parametres = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const userMode = getUserMode();
  const { playClick } = useClickSound();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const soundInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const modelFileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // Active section - default to guide for first-time users
  const [activeSection, setActiveSection] = useState<'security' | 'accounts' | 'promos' | 'models' | 'stages' | 'permissions' | 'appearance' | 'data' | 'guide' | 'activity'>('guide');
  
  // Search state for assign modal
  const [assignSearchTerm, setAssignSearchTerm] = useState('');
  
  // Admin password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // User password state
  const [newUserPassword, setNewUserPassword] = useState('');
  const [confirmUserPassword, setConfirmUserPassword] = useState('');
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [showConfirmUserPassword, setShowConfirmUserPassword] = useState(false);

  // Background state
  const [bgEnabled, setBgEnabled] = useState(isBackgroundEnabled());
  const [customBg, setCustomBg] = useState<string | null>(getBackgroundImage());
  const [selectedWallpaper, setSelectedWallpaper] = useState<string | null>(null);

  // Sound state
  const [soundEnabled, setSoundEnabled] = useState(isClickSoundEnabled());
  
  // Download state
  const [downloadEnabled, setDownloadEnabledState] = useState(isDownloadEnabled());

  // Student accounts state
  const [studentAccounts, setStudentAccounts] = useState<StudentAccount[]>([]);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentAccount | null>(null);
  const [studentForm, setStudentForm] = useState({ matricule: '', cin: '', nom: '', prenom: '', grade: '', unite: '' });
  const [searchStudent, setSearchStudent] = useState('');
  const [studentPage, setStudentPage] = useState(1);
  const [studentPageSize, setStudentPageSize] = useState(15);
  
  // Excel import state
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [excelData, setExcelData] = useState<Record<string, string>[]>([]);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState({ matricule: '', cin: '', nom: '', prenom: '', grade: '', unite: '' });
  
  // Stages state
  const [stages, setStages] = useState<Stage[]>([]);
  const [showAddStage, setShowAddStage] = useState(false);
  const [stageForm, setStageForm] = useState({ name: '', description: '' });

  // Import mode state
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [showImportModeModal, setShowImportModeModal] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [pendingImportType, setPendingImportType] = useState<'zip' | 'json'>('zip');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Drag and drop sensors for stages
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleStageDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = stages.findIndex(s => s.id === active.id);
      const newIndex = stages.findIndex(s => s.id === over.id);
      const newStages = arrayMove(stages, oldIndex, newIndex).map((s, i) => ({ ...s, order: i }));
      setStages(newStages);
      saveStages(newStages);
      toast({ title: 'Ordre des stages mis à jour' });
    }
  };

  const handleDeleteAllData = async () => {
    try {
      clearAllData();
      await clearAllFiles();
      toast({ title: 'Toutes les données supprimées', description: 'Rechargement...' });
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de supprimer les données', variant: 'destructive' });
    }
  };

  const handleImportWithMode = async () => {
    if (!pendingImportFile) return;
    try {
      if (pendingImportType === 'zip') {
        const success = await importFromZip(pendingImportFile, importMode);
        if (success) {
          toast({ title: 'Import réussi', description: 'Rechargement...' });
          setTimeout(() => window.location.reload(), 1500);
        } else {
          toast({ title: 'Erreur', description: "L'archive n'est pas valide", variant: 'destructive' });
        }
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          if (importAllData(content, importMode)) {
            toast({ title: 'Import réussi', description: 'Rechargement...' });
            setTimeout(() => window.location.reload(), 1500);
          } else {
            toast({ title: 'Erreur', description: "Le fichier n'est pas valide", variant: 'destructive' });
          }
        };
        reader.readAsText(pendingImportFile);
      }
    } catch (error) {
      toast({ title: 'Erreur', description: "Erreur lors de l'import", variant: 'destructive' });
    }
    setShowImportModeModal(false);
    setPendingImportFile(null);
  };

  const handleImportZipWithChoice = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingImportFile(file);
    setPendingImportType('zip');
    setShowImportModeModal(true);
    if (zipInputRef.current) zipInputRef.current.value = '';
  };

  const handleImportJsonWithChoice = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingImportFile(file);
    setPendingImportType('json');
    setShowImportModeModal(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Promos state
  const [promos, setPromos] = useState<Promo[]>([]);
  const [showAddPromo, setShowAddPromo] = useState(false);
  const [promoForm, setPromoForm] = useState({ year: new Date().getFullYear(), level: 1 });
  const [showAssignPromo, setShowAssignPromo] = useState(false);
  const [selectedPromoForAssign, setSelectedPromoForAssign] = useState<string>('');
  const [selectedStudentsForPromo, setSelectedStudentsForPromo] = useState<string[]>([]);

  // Document Models state
  const [documentModels, setDocumentModels] = useState<DocumentModel[]>([]);
  const [showAddModel, setShowAddModel] = useState(false);
  const [modelForm, setModelForm] = useState({ name: '', description: '' });
  const [selectedModel, setSelectedModel] = useState<DocumentModel | null>(null);
  const [modelFiles, setModelFiles] = useState<ModelFile[]>([]);
  const [showAddModelFile, setShowAddModelFile] = useState(false);
  const [modelFileForm, setModelFileForm] = useState({ title: '', description: '', type: 'pdf' as 'ppt' | 'word' | 'pdf', fileName: '', fileData: '' });

  // App settings
  const [appSettings, setAppSettings] = useState<AppSettings>(getAppSettings());

  useEffect(() => {
    if (!userMode) {
      navigate('/');
    }
    if (userMode !== 'admin') {
      navigate('/accueil');
    }
    // Log page view
    logPageView('/parametres', 'Paramètres');
    loadData();
  }, [userMode, navigate]);

  const loadData = useCallback(() => {
    setStudentAccounts(getStudentAccounts());
    setStages(getStages());
    setAppSettings(getAppSettings());
    setPromos(getPromos());
    setDocumentModels(getDocumentModels());
  }, []);

  // Filtered students - memoized
  const filteredStudents = useMemo(() => studentAccounts.filter(s => 
    s.matricule.toLowerCase().includes(searchStudent.toLowerCase()) ||
    s.nom?.toLowerCase().includes(searchStudent.toLowerCase()) ||
    s.prenom?.toLowerCase().includes(searchStudent.toLowerCase()) ||
    s.grade?.toLowerCase().includes(searchStudent.toLowerCase())
  ), [studentAccounts, searchStudent]);

  // Paginated students
  const paginatedStudents = useMemo(() => {
    const start = (studentPage - 1) * studentPageSize;
    return filteredStudents.slice(start, start + studentPageSize);
  }, [filteredStudents, studentPage, studentPageSize]);

  // Reset page when search changes
  useEffect(() => {
    setStudentPage(1);
  }, [searchStudent]);

  // Password handlers
  const handleChangeAdminPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: 'Erreur', description: 'Tous les champs sont requis', variant: 'destructive' });
      return;
    }
    if (!verifyAdminPassword(currentPassword)) {
      toast({ title: 'Erreur', description: 'Le mot de passe actuel est incorrect', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 4) {
      toast({ title: 'Erreur', description: 'Le nouveau mot de passe doit contenir au moins 4 caractères', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Erreur', description: 'Les mots de passe ne correspondent pas', variant: 'destructive' });
      return;
    }
    setAdminPassword(newPassword);
    toast({ title: 'Succès', description: 'Le mot de passe administrateur a été modifié' });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleChangeUserPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserPassword || !confirmUserPassword) {
      toast({ title: 'Erreur', description: 'Tous les champs sont requis', variant: 'destructive' });
      return;
    }
    if (newUserPassword.length < 4) {
      toast({ title: 'Erreur', description: 'Le mot de passe doit contenir au moins 4 caractères', variant: 'destructive' });
      return;
    }
    if (newUserPassword !== confirmUserPassword) {
      toast({ title: 'Erreur', description: 'Les mots de passe ne correspondent pas', variant: 'destructive' });
      return;
    }
    setUserPassword(newUserPassword);
    toast({ title: 'Succès', description: 'Le mot de passe utilisateur a été modifié' });
    setNewUserPassword('');
    setConfirmUserPassword('');
  };

  // Student account handlers
  const handleSaveStudent = () => {
    if (!studentForm.matricule || !studentForm.cin) {
      toast({ title: 'Erreur', description: 'Matricule et CIN sont requis', variant: 'destructive' });
      return;
    }
    if (editingStudent) {
      updateStudentAccount(editingStudent.id, studentForm);
      toast({ title: 'Compte modifié', description: 'Le compte élève a été mis à jour' });
    } else {
      addStudentAccount(studentForm);
      toast({ title: 'Compte créé', description: 'Le compte élève a été créé' });
    }
    loadData();
    resetStudentForm();
  };

  const handleDeleteStudent = (id: string) => {
    deleteStudentAccount(id);
    toast({ title: 'Compte supprimé', description: 'Le compte élève a été supprimé' });
    loadData();
  };

  const resetStudentForm = () => {
    setShowAddStudent(false);
    setEditingStudent(null);
    setStudentForm({ matricule: '', cin: '', nom: '', prenom: '', grade: '', unite: '' });
  };

  // Excel import handlers
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet);
        
        if (jsonData.length > 0) {
          const columns = Object.keys(jsonData[0]);
          setExcelColumns(columns);
          setExcelData(jsonData);
          
          // Auto-detect columns
          const autoMapping = { ...columnMapping };
          columns.forEach(col => {
            const colLower = col.toLowerCase();
            if (colLower.includes('mle') || colLower.includes('matricule')) autoMapping.matricule = col;
            if (colLower.includes('cin')) autoMapping.cin = col;
            if (colLower === 'nom') autoMapping.nom = col;
            if (colLower === 'prenom' || colLower === 'prénom') autoMapping.prenom = col;
            if (colLower === 'grade') autoMapping.grade = col;
            if (colLower === 'unite' || colLower === 'unité') autoMapping.unite = col;
          });
          setColumnMapping(autoMapping);
          setShowExcelModal(true);
        }
      } catch (error) {
        toast({ title: 'Erreur', description: 'Impossible de lire le fichier Excel', variant: 'destructive' });
      }
    };
    reader.readAsArrayBuffer(file);
    if (excelInputRef.current) excelInputRef.current.value = '';
  };

  const handleImportExcel = () => {
    if (!columnMapping.matricule || !columnMapping.cin) {
      toast({ title: 'Erreur', description: 'Les colonnes Matricule et CIN sont requises', variant: 'destructive' });
      return;
    }

    const accounts = excelData.map(row => ({
      matricule: String(row[columnMapping.matricule] || ''),
      cin: String(row[columnMapping.cin] || ''),
      nom: columnMapping.nom ? String(row[columnMapping.nom] || '') : '',
      prenom: columnMapping.prenom ? String(row[columnMapping.prenom] || '') : '',
      grade: columnMapping.grade ? String(row[columnMapping.grade] || '') : '',
      unite: columnMapping.unite ? String(row[columnMapping.unite] || '') : '',
    })).filter(a => a.matricule && a.cin);

    const added = importStudentAccountsBulk(accounts);
    toast({ title: 'Import réussi', description: `${added} comptes ajoutés sur ${accounts.length}` });
    loadData();
    setShowExcelModal(false);
    setExcelData([]);
    setExcelColumns([]);
  };

  // Stage handlers
  const handleToggleStage = (stage: Stage) => {
    updateStage(stage.id, { enabled: !stage.enabled });
    loadData();
    toast({ title: stage.enabled ? 'Stage désactivé' : 'Stage activé' });
  };

  const handleAddStage = () => {
    if (!stageForm.name) {
      toast({ title: 'Erreur', description: 'Le nom est requis', variant: 'destructive' });
      return;
    }
    addStage({ name: stageForm.name, description: stageForm.description, enabled: true, order: stages.length });
    toast({ title: 'Stage ajouté' });
    loadData();
    setShowAddStage(false);
    setStageForm({ name: '', description: '' });
  };

  const handleDeleteStage = (id: string) => {
    deleteStage(id);
    toast({ title: 'Stage supprimé' });
    loadData();
  };

  const handleChangeDisableTarget = (stageId: string, target: 'all' | 'eleves' | 'instructeurs' | 'none') => {
    updateStage(stageId, { disabledFor: target });
    loadData();
    const labels = { all: 'tous', eleves: 'élèves', instructeurs: 'instructeurs', none: 'aucun' };
    toast({ title: 'Ciblage mis à jour', description: `Désactivé pour: ${labels[target]}` });
  };

  // Promo handlers
  const handleAddPromo = () => {
    playClick();
    // Auto-generate name from year and level
    const levelText = promoForm.level === 1 ? '1ère année' : '2ème année';
    const autoName = `Promotion ${levelText} ${promoForm.year}`;
    
    addPromo({ name: autoName, year: promoForm.year, level: promoForm.level });
    toast({ title: 'Promotion ajoutée', description: autoName });
    loadData();
    setShowAddPromo(false);
    setPromoForm({ year: new Date().getFullYear(), level: 1 });
  };

  const handleDeletePromo = (id: string) => {
    playClick();
    deletePromo(id);
    toast({ title: 'Promotion supprimée' });
    loadData();
  };

  const handlePromotePromo = (id: string) => {
    playClick();
    promotePromo(id);
    toast({ title: 'Promotion passée en 2ème année' });
    loadData();
  };

  const handleDeletePromoStudents = (id: string) => {
    playClick();
    const count = deleteStudentsByPromo(id);
    toast({ title: `${count} élèves supprimés` });
    loadData();
  };

  const handleAssignStudentsToPromo = () => {
    playClick();
    if (!selectedPromoForAssign || selectedStudentsForPromo.length === 0) {
      toast({ title: 'Erreur', description: 'Sélectionnez une promotion et des élèves', variant: 'destructive' });
      return;
    }
    assignStudentsToPromo(selectedStudentsForPromo, selectedPromoForAssign);
    toast({ title: `${selectedStudentsForPromo.length} élèves assignés` });
    loadData();
    setShowAssignPromo(false);
    setSelectedStudentsForPromo([]);
    setSelectedPromoForAssign('');
  };

  // Document Model handlers
  const handleAddDocumentModel = () => {
    playClick();
    if (!modelForm.name) {
      toast({ title: 'Erreur', description: 'Le nom est requis', variant: 'destructive' });
      return;
    }
    addDocumentModel({ name: modelForm.name, description: modelForm.description, enabled: true });
    toast({ title: 'Modèle ajouté' });
    loadData();
    setShowAddModel(false);
    setModelForm({ name: '', description: '' });
  };

  const handleToggleDocumentModel = (model: DocumentModel) => {
    playClick();
    updateDocumentModel(model.id, { enabled: !model.enabled });
    toast({ title: model.enabled ? 'Modèle désactivé' : 'Modèle activé' });
    loadData();
  };

  const handleDeleteDocumentModel = (id: string) => {
    playClick();
    deleteDocumentModel(id);
    toast({ title: 'Modèle supprimé' });
    loadData();
    setSelectedModel(null);
  };

  const handleSelectModel = (model: DocumentModel) => {
    playClick();
    setSelectedModel(model);
    setModelFiles(getModelFilesByModel(model.id));
  };

  const handleModelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // No file size limit - IndexedDB can handle large files
    let fileType: 'ppt' | 'word' | 'pdf' = 'pdf';
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) fileType = 'ppt';
    else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) fileType = 'word';
    else if (fileName.endsWith('.pdf')) fileType = 'pdf';
    
    const reader = new FileReader();
    reader.onload = () => {
      setModelFileForm(prev => ({
        ...prev,
        fileName: file.name,
        fileData: reader.result as string,
        type: fileType
      }));
      toast({ title: 'Fichier sélectionné', description: file.name });
    };
    reader.onerror = () => {
      toast({ title: 'Erreur', description: 'Impossible de lire le fichier', variant: 'destructive' });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveModelFile = async () => {
    playClick();
    if (!selectedModel) {
      toast({ title: 'Erreur', description: 'Aucun modèle sélectionné', variant: 'destructive' });
      return;
    }
    if (!modelFileForm.title) {
      toast({ title: 'Erreur', description: 'Le titre est requis', variant: 'destructive' });
      return;
    }
    if (!modelFileForm.fileData) {
      toast({ title: 'Erreur', description: 'Veuillez sélectionner un fichier', variant: 'destructive' });
      return;
    }
    try {
      await addModelFileAsync({
        modelId: selectedModel.id,
        title: modelFileForm.title,
        description: modelFileForm.description,
        type: modelFileForm.type,
        fileName: modelFileForm.fileName,
        fileData: modelFileForm.fileData
      });
      toast({ title: 'Fichier ajouté avec succès' });
      setModelFiles(getModelFilesByModel(selectedModel.id));
      setShowAddModelFile(false);
      setModelFileForm({ title: '', description: '', type: 'pdf', fileName: '', fileData: '' });
      if (modelFileInputRef.current) modelFileInputRef.current.value = '';
    } catch (error) {
      console.error('Error saving model file:', error);
      toast({ title: 'Erreur', description: 'Échec de l\'enregistrement', variant: 'destructive' });
    }
  };

  const handleDeleteModelFile = async (id: string) => {
    playClick();
    try {
      await deleteModelFileAsync(id);
      if (selectedModel) {
        setModelFiles(getModelFilesByModel(selectedModel.id));
      }
      toast({ title: 'Fichier supprimé' });
    } catch (error) {
      console.error('Error deleting model file:', error);
      toast({ title: 'Erreur', description: 'Impossible de supprimer le fichier', variant: 'destructive' });
    }
  };

  const handleDownloadModelFile = async (file: ModelFile) => {
    playClick();
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
      toast({ title: 'Erreur', description: 'Impossible de télécharger le fichier', variant: 'destructive' });
    }
  };

  // Data export/import handlers
  const handleExportZip = async () => {
    setIsExporting(true);
    try {
      await exportToZip();
      toast({ title: 'Export réussi', description: 'Archive ZIP créée' });
    } catch (error) {
      toast({ title: 'Erreur', description: "Erreur lors de l'export", variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const success = await importFromZip(file);
      if (success) {
        toast({ title: 'Import réussi', description: 'Rechargement...' });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast({ title: 'Erreur', description: "L'archive n'est pas valide", variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Erreur', description: "Erreur lors de l'import", variant: 'destructive' });
    }
  };

  const handleExportData = () => {
    const data = exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `csm_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: 'Export réussi' });
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (importAllData(content)) {
        toast({ title: 'Import réussi', description: 'Rechargement...' });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast({ title: 'Erreur', description: "Le fichier n'est pas valide", variant: 'destructive' });
      }
    };
    reader.readAsText(file);
  };

  // Background handlers
  const handleSelectWallpaper = (wallpaper: typeof wallpapers[0]) => {
    setBackgroundImage(wallpaper.src);
    setCustomBg(wallpaper.src);
    setSelectedWallpaper(wallpaper.id);
    toast({ title: 'Fond d\'écran appliqué', description: wallpaper.name });
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const imageData = reader.result as string;
      setBackgroundImage(imageData);
      setCustomBg(imageData);
      setSelectedWallpaper(null);
      toast({ title: 'Arrière-plan personnalisé appliqué' });
    };
    reader.readAsDataURL(file);
  };

  const handleToggleBg = () => {
    const newState = !bgEnabled;
    setBgEnabled(newState);
    setBackgroundEnabled(newState);
  };

  const handleResetBg = () => {
    resetBackgroundImage();
    setCustomBg(null);
    setSelectedWallpaper(null);
    toast({ title: 'Arrière-plan par défaut restauré' });
  };

  // Logo handlers
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const imageData = reader.result as string;
      const updatedSettings = { ...appSettings, customLogo: imageData };
      saveAppSettings(updatedSettings);
      setAppSettings(updatedSettings);
      toast({ title: 'Logo personnalisé appliqué' });
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = () => {
    const updatedSettings = { ...appSettings, customLogo: undefined };
    saveAppSettings(updatedSettings);
    setAppSettings(updatedSettings);
    toast({ title: 'Logo par défaut restauré' });
  };

  // Sound handlers
  const handleSoundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('audio/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const soundData = reader.result as string;
      setClickSound(soundData);
      toast({ title: 'Son personnalisé appliqué' });
    };
    reader.readAsDataURL(file);
  };

  const handleToggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    setClickSoundEnabled(newState);
  };

  const handleResetSound = () => {
    resetClickSound();
    toast({ title: 'Son par défaut restauré' });
  };

  const handleTestSound = () => {
    try {
      const audio = new Audio(getClickSound());
      audio.volume = 0.3;
      audio.play();
    } catch (e) {
      console.error('Error playing sound:', e);
    }
  };

  const currentBgImage = bgEnabled ? (customBg || bg1) : undefined;
  const currentLogo = appSettings.customLogo || logoOfficial;

  const sections = [
    { id: 'guide' as const, label: 'Guide', icon: BookOpen },
    { id: 'security' as const, label: 'Sécurité', icon: Lock },
    { id: 'accounts' as const, label: 'Comptes', icon: GraduationCap },
    { id: 'promos' as const, label: 'Promotions', icon: UserCheck },
    { id: 'models' as const, label: 'Modèles', icon: FileText },
    { id: 'stages' as const, label: 'Stages', icon: Layers },
    { id: 'permissions' as const, label: 'Permissions', icon: Shield },
    { id: 'appearance' as const, label: 'Apparence', icon: Palette },
    { id: 'data' as const, label: 'Données', icon: FolderArchive },
    { id: 'activity' as const, label: 'Activité', icon: Database },
  ];

  return (
    <Layout backgroundImage={currentBgImage}>
      <div className="max-w-6xl mx-auto">
        {/* Premium Header */}
        <div className="glass-panel p-6 mb-6 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-gold">
                <Settings className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Panneau d'Administration</h1>
                <p className="text-muted-foreground">Configuration du système</p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="flex gap-3">
              <div className="text-center px-4 py-2 stat-card-gold rounded-xl">
                <p className="text-xl font-bold gold-text">{studentAccounts.length}</p>
                <p className="text-xs text-muted-foreground">Élèves</p>
              </div>
              <div className="text-center px-4 py-2 stat-card-gold rounded-xl">
                <p className="text-xl font-bold text-success">{stages.filter(s => s.enabled).length}</p>
                <p className="text-xs text-muted-foreground">Stages actifs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="glass-card p-2 mb-6 flex flex-wrap gap-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => { playClick(); setActiveSection(section.id); }}
              className={`flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeSection === section.id
                  ? 'bg-gradient-gold text-primary-foreground shadow-lg shadow-primary/20'
                  : 'hover:bg-muted/50 text-muted-foreground'
              }`}
            >
              <section.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{section.label}</span>
            </button>
          ))}
        </div>

        {/* Section Content */}
        <div className="animate-fade-in">
          {/* Security Section */}
          {activeSection === 'security' && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Admin Password */}
              <div className="glass-card overflow-hidden">
                <div className="p-4 bg-gradient-gold border-b border-primary/20">
                  <h2 className="text-lg font-bold flex items-center gap-2 text-primary-foreground">
                    <Lock className="w-5 h-5" />
                    Mot de Passe Admin
                  </h2>
                </div>
                <form onSubmit={handleChangeAdminPassword} className="p-6 space-y-4">
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="glass-input w-full p-3 pr-12"
                      placeholder="Mot de passe actuel"
                    />
                    <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                      {showCurrentPassword ? <EyeOff className="w-5 h-5 text-muted-foreground" /> : <Eye className="w-5 h-5 text-muted-foreground" />}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="glass-input w-full p-3 pr-12"
                      placeholder="Nouveau mot de passe"
                    />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                      {showNewPassword ? <EyeOff className="w-5 h-5 text-muted-foreground" /> : <Eye className="w-5 h-5 text-muted-foreground" />}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="glass-input w-full p-3 pr-12"
                      placeholder="Confirmer le mot de passe"
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                      {showConfirmPassword ? <EyeOff className="w-5 h-5 text-muted-foreground" /> : <Eye className="w-5 h-5 text-muted-foreground" />}
                    </button>
                  </div>
                  <button type="submit" className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                    <Check className="w-5 h-5" /> Enregistrer
                  </button>
                </form>
                <div className="px-6 pb-4">
                  <p className="text-xs text-muted-foreground">Par défaut: <code className="bg-muted px-2 py-0.5 rounded">admin123</code></p>
                </div>
              </div>

              {/* Instructeur Password */}
              <div className="glass-card overflow-hidden">
                <div className="p-4 bg-success/20 border-b border-success/20">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Users className="w-5 h-5 text-success" />
                    Mot de Passe Instructeur
                  </h2>
                </div>
                <form onSubmit={handleChangeUserPassword} className="p-6 space-y-4">
                  <div className="relative">
                    <input
                      type={showNewUserPassword ? 'text' : 'password'}
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="glass-input w-full p-3 pr-12"
                      placeholder="Nouveau mot de passe"
                    />
                    <button type="button" onClick={() => setShowNewUserPassword(!showNewUserPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                      {showNewUserPassword ? <EyeOff className="w-5 h-5 text-muted-foreground" /> : <Eye className="w-5 h-5 text-muted-foreground" />}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showConfirmUserPassword ? 'text' : 'password'}
                      value={confirmUserPassword}
                      onChange={(e) => setConfirmUserPassword(e.target.value)}
                      className="glass-input w-full p-3 pr-12"
                      placeholder="Confirmer le mot de passe"
                    />
                    <button type="button" onClick={() => setShowConfirmUserPassword(!showConfirmUserPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                      {showConfirmUserPassword ? <EyeOff className="w-5 h-5 text-muted-foreground" /> : <Eye className="w-5 h-5 text-muted-foreground" />}
                    </button>
                  </div>
                  <button type="submit" className="btn-success w-full py-3 flex items-center justify-center gap-2">
                    <Check className="w-5 h-5" /> Enregistrer
                  </button>
                </form>
                <div className="px-6 pb-4">
                  <p className="text-xs text-muted-foreground">Par défaut: <code className="bg-muted px-2 py-0.5 rounded">user123</code></p>
                </div>
              </div>
            </div>
          )}

          {/* Accounts Section */}
          {activeSection === 'accounts' && (
            <div className="glass-card overflow-hidden">
              <div className="p-4 bg-gradient-gold border-b border-primary/20 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <h2 className="text-lg font-bold flex items-center gap-2 text-primary-foreground">
                  <GraduationCap className="w-5 h-5" />
                  Gestion des Comptes Élèves
                  <span className="text-sm font-normal opacity-80">({studentAccounts.length} comptes)</span>
                </h2>
                <div className="flex gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Rechercher..."
                      value={searchStudent}
                      onChange={(e) => setSearchStudent(e.target.value)}
                      className="glass-input pl-9 pr-4 py-2 w-48"
                    />
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                  <label className="btn-primary flex items-center gap-2 cursor-pointer py-2">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span className="hidden md:inline">Excel</span>
                    <input ref={excelInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} className="hidden" />
                  </label>
                  <button onClick={() => setShowAddStudent(true)} className="btn-success flex items-center gap-2 py-2">
                    <Plus className="w-4 h-4" /> <span className="hidden md:inline">Ajouter</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border/50">
                      <th className="text-left p-3 font-semibold text-muted-foreground text-sm">Matricule</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground text-sm">CIN</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground text-sm">Nom</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground text-sm">Prénom</th>
                      <th className="text-left p-3 font-semibold text-muted-foreground text-sm">Grade</th>
                      <th className="text-right p-3 font-semibold text-muted-foreground text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStudents.map((account) => (
                      <tr key={account.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-mono text-sm gold-text">{account.matricule}</td>
                        <td className="p-3 font-mono text-sm">{account.cin}</td>
                        <td className="p-3">{account.nom || '-'}</td>
                        <td className="p-3">{account.prenom || '-'}</td>
                        <td className="p-3">{account.grade || '-'}</td>
                        <td className="p-3 text-right">
                          <button onClick={() => { setEditingStudent(account); setStudentForm({ matricule: account.matricule, cin: account.cin, nom: account.nom || '', prenom: account.prenom || '', grade: account.grade || '', unite: account.unite || '' }); setShowAddStudent(true); }} className="p-2 hover:bg-muted rounded-lg">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteStudent(account.id)} className="p-2 hover:bg-destructive/20 rounded-lg text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredStudents.length === 0 && (
                  <p className="text-center text-muted-foreground py-12">
                    {searchStudent ? 'Aucun résultat' : 'Aucun compte élève'}
                  </p>
                )}
              </div>
              
              {/* Pagination */}
              <TablePagination
                totalItems={filteredStudents.length}
                currentPage={studentPage}
                pageSize={studentPageSize}
                onPageChange={setStudentPage}
                onPageSizeChange={setStudentPageSize}
              />

              {/* Add/Edit Student Modal */}
              {showAddStudent && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" style={{ zIndex: 9999 }}>
                  <div className="glass-card w-full max-w-md animate-scale-in my-8 flex flex-col shadow-2xl border border-border/50">
                    <div className="flex items-center justify-between p-6 pb-4 border-b border-border/30 shrink-0">
                      <h3 className="text-lg font-semibold">{editingStudent ? 'Modifier Compte' : 'Ajouter Compte'}</h3>
                      <button onClick={resetStudentForm} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[60vh]">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-1 block">Matricule *</label>
                          <input value={studentForm.matricule} onChange={(e) => setStudentForm(p => ({ ...p, matricule: e.target.value }))} className="glass-input w-full p-3" placeholder="Mle" />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">CIN *</label>
                          <input value={studentForm.cin} onChange={(e) => setStudentForm(p => ({ ...p, cin: e.target.value }))} className="glass-input w-full p-3" placeholder="CIN" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-1 block">Nom</label>
                          <input value={studentForm.nom} onChange={(e) => setStudentForm(p => ({ ...p, nom: e.target.value }))} className="glass-input w-full p-3" placeholder="Nom" />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Prénom</label>
                          <input value={studentForm.prenom} onChange={(e) => setStudentForm(p => ({ ...p, prenom: e.target.value }))} className="glass-input w-full p-3" placeholder="Prénom" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-1 block">Grade</label>
                          <input value={studentForm.grade} onChange={(e) => setStudentForm(p => ({ ...p, grade: e.target.value }))} className="glass-input w-full p-3" placeholder="Grade" />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Unité</label>
                          <input value={studentForm.unite} onChange={(e) => setStudentForm(p => ({ ...p, unite: e.target.value }))} className="glass-input w-full p-3" placeholder="Unité" />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 p-6 pt-4 border-t border-border/30 shrink-0 bg-background/50">
                      <button onClick={handleSaveStudent} className="btn-success flex-1 py-3">Enregistrer</button>
                      <button onClick={resetStudentForm} className="btn-ghost border border-border py-3 px-6">Annuler</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Excel Import Modal */}
              {showExcelModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" style={{ zIndex: 9999 }}>
                  <div className="glass-card w-full max-w-lg animate-scale-in my-8 flex flex-col shadow-2xl border border-border/50">
                    <div className="flex items-center justify-between p-6 pb-4 border-b border-border/30 shrink-0">
                      <h3 className="text-lg font-semibold">Mapper les Colonnes Excel</h3>
                      <button onClick={() => setShowExcelModal(false)} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 max-h-[60vh]">
                      <p className="text-sm text-muted-foreground mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                        {excelData.length} lignes détectées. Sélectionnez les colonnes correspondantes:
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Matricule (Mle) *</label>
                          <select value={columnMapping.matricule} onChange={(e) => setColumnMapping(p => ({ ...p, matricule: e.target.value }))} className="glass-input w-full p-3 mt-1">
                            <option value="">-- Sélectionner --</option>
                            {excelColumns.map(col => <option key={col} value={col}>{col}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">CIN *</label>
                          <select value={columnMapping.cin} onChange={(e) => setColumnMapping(p => ({ ...p, cin: e.target.value }))} className="glass-input w-full p-3 mt-1">
                            <option value="">-- Sélectionner --</option>
                            {excelColumns.map(col => <option key={col} value={col}>{col}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Nom</label>
                          <select value={columnMapping.nom} onChange={(e) => setColumnMapping(p => ({ ...p, nom: e.target.value }))} className="glass-input w-full p-3 mt-1">
                            <option value="">-- Sélectionner --</option>
                            {excelColumns.map(col => <option key={col} value={col}>{col}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Prénom</label>
                          <select value={columnMapping.prenom} onChange={(e) => setColumnMapping(p => ({ ...p, prenom: e.target.value }))} className="glass-input w-full p-3 mt-1">
                            <option value="">-- Sélectionner --</option>
                            {excelColumns.map(col => <option key={col} value={col}>{col}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Grade</label>
                          <select value={columnMapping.grade} onChange={(e) => setColumnMapping(p => ({ ...p, grade: e.target.value }))} className="glass-input w-full p-3 mt-1">
                            <option value="">-- Sélectionner --</option>
                            {excelColumns.map(col => <option key={col} value={col}>{col}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Unité</label>
                          <select value={columnMapping.unite} onChange={(e) => setColumnMapping(p => ({ ...p, unite: e.target.value }))} className="glass-input w-full p-3 mt-1">
                            <option value="">-- Sélectionner --</option>
                            {excelColumns.map(col => <option key={col} value={col}>{col}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 p-6 pt-4 border-t border-border/30 shrink-0 bg-background/50">
                      <button onClick={handleImportExcel} className="btn-success flex-1 py-3">Importer {excelData.length} comptes</button>
                      <button onClick={() => setShowExcelModal(false)} className="btn-ghost border border-border py-3 px-6">Annuler</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Promos Section */}
          {activeSection === 'promos' && (
            <div className="space-y-6">
              {/* Promo List */}
              <div className="glass-card overflow-hidden">
                <div className="p-4 bg-gradient-gold border-b border-primary/20 flex items-center justify-between">
                  <h2 className="text-lg font-bold flex items-center gap-2 text-primary-foreground">
                    <UserCheck className="w-5 h-5" />
                    Gestion des Promotions
                    <span className="text-sm font-normal opacity-80">({promos.length})</span>
                  </h2>
                  <div className="flex gap-2">
                    <button onClick={() => { playClick(); setShowAssignPromo(true); }} className="btn-primary flex items-center gap-2 py-2">
                      <Users className="w-4 h-4" /> Assigner
                    </button>
                    <button onClick={() => { playClick(); setShowAddPromo(true); }} className="btn-success flex items-center gap-2 py-2">
                      <Plus className="w-4 h-4" /> Nouvelle
                    </button>
                  </div>
                </div>
                
                <div className="p-6 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {promos.length === 0 ? (
                    <p className="text-muted-foreground col-span-full text-center py-8">Aucune promotion créée</p>
                  ) : (
                    promos.map((promo) => {
                      const studentCount = studentAccounts.filter(s => s.promoId === promo.id).length;
                      return (
                        <div key={promo.id} className="p-4 rounded-xl border-2 border-primary/30 bg-card shadow-lg">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-bold gold-text">{promo.name}</h4>
                              <p className="text-sm text-muted-foreground">{promo.year} • {promo.level === 1 ? '1ère année' : '2ème année'}</p>
                            </div>
                            <span className="px-2 py-1 bg-primary/20 rounded-lg text-xs font-medium">{studentCount} élèves</span>
                          </div>
                          <div className="flex gap-2 mt-4">
                            {promo.level === 1 && (
                              <button onClick={() => handlePromotePromo(promo.id)} className="flex-1 py-2 btn-primary text-sm flex items-center justify-center gap-1">
                                <ArrowUpCircle className="w-4 h-4" /> Passer 2ème
                              </button>
                            )}
                            <button onClick={() => handleDeletePromoStudents(promo.id)} className="py-2 px-3 btn-ghost border border-destructive/30 text-destructive text-sm" title="Supprimer tous les élèves">
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeletePromo(promo.id)} className="py-2 px-3 bg-destructive/20 hover:bg-destructive/30 rounded-lg text-destructive text-sm">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Add Promo Modal */}
              {showAddPromo && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" style={{ zIndex: 9999 }}>
                  <div className="glass-card w-full max-w-md animate-scale-in my-8 flex flex-col shadow-2xl border border-border/50">
                    <div className="flex items-center justify-between p-6 pb-4 border-b border-border/30 shrink-0">
                      <h3 className="text-lg font-semibold">Nouvelle Promotion</h3>
                      <button onClick={() => setShowAddPromo(false)} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      <p className="text-sm text-muted-foreground p-3 bg-primary/10 rounded-lg border border-primary/20">
                        Le nom sera généré automatiquement: <strong className="gold-text">Promotion {promoForm.level === 1 ? '1ère année' : '2ème année'} {promoForm.year}</strong>
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-1 block">Année</label>
                          <input type="number" value={promoForm.year} onChange={(e) => setPromoForm(p => ({ ...p, year: parseInt(e.target.value) || new Date().getFullYear() }))} className="glass-input w-full p-3" />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Niveau</label>
                          <select value={promoForm.level} onChange={(e) => setPromoForm(p => ({ ...p, level: parseInt(e.target.value) }))} className="glass-input w-full p-3">
                            <option value={1}>1ère année</option>
                            <option value={2}>2ème année</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 p-6 pt-4 border-t border-border/30 shrink-0 bg-background/50">
                      <button onClick={handleAddPromo} className="btn-success flex-1 py-3">Créer</button>
                      <button onClick={() => setShowAddPromo(false)} className="btn-ghost border border-border py-3 px-6">Annuler</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Assign Students Modal */}
              {showAssignPromo && (() => {
                const unassignedStudents = studentAccounts.filter(s => !s.promoId);
                const filteredUnassigned = unassignedStudents.filter(s => 
                  assignSearchTerm === '' ||
                  s.matricule.toLowerCase().includes(assignSearchTerm.toLowerCase()) ||
                  s.nom?.toLowerCase().includes(assignSearchTerm.toLowerCase()) ||
                  s.prenom?.toLowerCase().includes(assignSearchTerm.toLowerCase())
                );
                const allFilteredSelected = filteredUnassigned.length > 0 && 
                  filteredUnassigned.every(s => selectedStudentsForPromo.includes(s.id));
                
                return (
                  <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" style={{ zIndex: 9999 }}>
                    <div className="glass-card w-full max-w-2xl animate-scale-in my-8 flex flex-col shadow-2xl border border-border/50">
                      <div className="flex items-center justify-between p-6 pb-4 border-b border-border/30 shrink-0">
                        <h3 className="text-lg font-semibold">Assigner à une Promotion</h3>
                        <button onClick={() => { setShowAssignPromo(false); setAssignSearchTerm(''); }} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[60vh]">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Sélectionner la promotion</label>
                          <select value={selectedPromoForAssign} onChange={(e) => setSelectedPromoForAssign(e.target.value)} className="glass-input w-full p-3">
                            <option value="">-- Choisir --</option>
                            {promos.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-medium">
                              Sélectionner les élèves 
                              <span className="ml-2 px-2 py-0.5 bg-primary/20 rounded-full text-xs">
                                {selectedStudentsForPromo.length} / {unassignedStudents.length}
                              </span>
                            </label>
                            <button
                              onClick={() => {
                                if (allFilteredSelected) {
                                  // Deselect all filtered
                                  setSelectedStudentsForPromo(prev => 
                                    prev.filter(id => !filteredUnassigned.some(s => s.id === id))
                                  );
                                } else {
                                  // Select all filtered
                                  const filteredIds = filteredUnassigned.map(s => s.id);
                                  setSelectedStudentsForPromo(prev => [...new Set([...prev, ...filteredIds])]);
                                }
                              }}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                                allFilteredSelected 
                                  ? 'bg-destructive/20 text-destructive hover:bg-destructive/30' 
                                  : 'bg-success/20 text-success hover:bg-success/30'
                              }`}
                            >
                              {allFilteredSelected ? (
                                <>
                                  <X className="w-4 h-4" />
                                  Désélectionner tout
                                </>
                              ) : (
                                <>
                                  <Check className="w-4 h-4" />
                                  Sélectionner tout ({filteredUnassigned.length})
                                </>
                              )}
                            </button>
                          </div>
                          
                          {/* Search input */}
                          <div className="relative mb-3">
                            <input
                              type="text"
                              placeholder="Rechercher par matricule, nom..."
                              value={assignSearchTerm}
                              onChange={(e) => setAssignSearchTerm(e.target.value)}
                              className="glass-input w-full pl-10 pr-4 py-2.5"
                            />
                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          </div>
                          
                          <div className="max-h-72 overflow-y-auto border border-border/30 rounded-xl divide-y divide-border/20">
                            {filteredUnassigned.length === 0 ? (
                              <p className="text-center text-muted-foreground py-8">
                                {assignSearchTerm ? 'Aucun résultat' : 'Aucun élève non assigné'}
                              </p>
                            ) : (
                              filteredUnassigned.map(student => (
                                <label 
                                  key={student.id} 
                                  className={`flex items-center gap-4 p-3 cursor-pointer transition-all ${
                                    selectedStudentsForPromo.includes(student.id) 
                                      ? 'bg-primary/10' 
                                      : 'hover:bg-muted/30'
                                  }`}
                                >
                                  <input 
                                    type="checkbox" 
                                    checked={selectedStudentsForPromo.includes(student.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedStudentsForPromo(prev => [...prev, student.id]);
                                      } else {
                                        setSelectedStudentsForPromo(prev => prev.filter(id => id !== student.id));
                                      }
                                    }}
                                    className="w-5 h-5 rounded border-2 border-primary/50 text-primary focus:ring-primary"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-sm gold-text font-semibold">{student.matricule}</span>
                                      {student.grade && (
                                        <span className="px-2 py-0.5 bg-muted rounded text-xs">{student.grade}</span>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground truncate">
                                      {student.nom} {student.prenom}
                                    </p>
                                  </div>
                                  {selectedStudentsForPromo.includes(student.id) && (
                                    <Check className="w-5 h-5 text-success shrink-0" />
                                  )}
                                </label>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 p-6 pt-4 border-t border-border/30 shrink-0 bg-background/50">
                        <button 
                          onClick={handleAssignStudentsToPromo} 
                          disabled={!selectedPromoForAssign || selectedStudentsForPromo.length === 0}
                          className="btn-success flex-1 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Assigner {selectedStudentsForPromo.length} élève{selectedStudentsForPromo.length > 1 ? 's' : ''}
                        </button>
                        <button onClick={() => { setShowAssignPromo(false); setAssignSearchTerm(''); }} className="btn-ghost border border-border py-3 px-6">Annuler</button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Models Section */}
          {activeSection === 'models' && (
            <div className="grid md:grid-cols-3 gap-6">
              {/* Model List */}
              <div className="glass-card overflow-hidden">
                <div className="p-4 bg-gradient-gold border-b border-primary/20 flex items-center justify-between">
                  <h2 className="text-base font-bold flex items-center gap-2 text-primary-foreground">
                    <FileText className="w-5 h-5" />
                    Modèles
                  </h2>
                  <button onClick={() => { playClick(); setShowAddModel(true); }} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="p-4 space-y-2 max-h-[500px] overflow-y-auto">
                  {documentModels.sort((a, b) => a.order - b.order).map((model) => (
                    <div
                      key={model.id}
                      className={`w-full p-3 rounded-xl transition-all flex items-center gap-3 ${
                        selectedModel?.id === model.id 
                          ? 'bg-primary/20 border border-primary/40' 
                          : 'hover:bg-muted/30 border border-transparent'
                      } ${!model.enabled ? 'opacity-50' : ''}`}
                    >
                      <button 
                        onClick={() => handleSelectModel(model)}
                        className="flex-1 flex items-center gap-3 text-left"
                      >
                        <FileText className={`w-5 h-5 shrink-0 ${model.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{model.name}</p>
                          {model.description && <p className="text-xs text-muted-foreground truncate">{model.description}</p>}
                        </div>
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleToggleDocumentModel(model); }}
                        className="p-1.5 hover:bg-muted/50 rounded-lg shrink-0"
                        title={model.enabled ? 'Désactiver' : 'Activer'}
                      >
                        {model.enabled ? (
                          <ToggleRight className="w-5 h-5 text-success" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Model Files */}
              <div className="md:col-span-2 glass-card overflow-hidden">
                {selectedModel ? (
                  <>
                    <div className="p-4 bg-success/20 border-b border-success/20 flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold flex items-center gap-2">
                          <File className="w-5 h-5 text-success" />
                          {selectedModel.name}
                        </h2>
                        <p className="text-sm text-muted-foreground">{modelFiles.length} fichiers</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { playClick(); setShowAddModelFile(true); }} className="btn-success flex items-center gap-2 py-2">
                          <Plus className="w-4 h-4" /> Fichier
                        </button>
                        {!['compte_rendu', 'demande_permission', 'demande_mariage'].includes(selectedModel.id) && (
                          <button onClick={() => handleDeleteDocumentModel(selectedModel.id)} className="p-2 bg-destructive/20 hover:bg-destructive/30 rounded-lg text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                      {modelFiles.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Aucun fichier</p>
                      ) : (
                        modelFiles.map((file) => (
                          <div key={file.id} className="flex items-center gap-3 p-3 bg-muted/20 rounded-xl border border-border/30">
                            {file.type === 'ppt' ? (
                              <Presentation className="w-8 h-8 text-orange-500 shrink-0" />
                            ) : file.type === 'word' ? (
                              <FileType className="w-8 h-8 text-blue-500 shrink-0" />
                            ) : (
                              <File className="w-8 h-8 text-red-500 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{file.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{file.fileName}</p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <button onClick={() => handleDownloadModelFile(file)} className="p-2 hover:bg-muted rounded-lg">
                                <Download className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteModelFile(file.id)} className="p-2 hover:bg-destructive/20 rounded-lg text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    <div className="text-center">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Sélectionnez un modèle</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Add Model Modal */}
              {showAddModel && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" style={{ zIndex: 9999 }}>
                  <div className="glass-card w-full max-w-md animate-scale-in my-8 flex flex-col shadow-2xl border border-border/50">
                    <div className="flex items-center justify-between p-6 pb-4 border-b border-border/30 shrink-0">
                      <h3 className="text-lg font-semibold">Nouveau Modèle</h3>
                      <button onClick={() => setShowAddModel(false)} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Nom *</label>
                        <input value={modelForm.name} onChange={(e) => setModelForm(p => ({ ...p, name: e.target.value }))} className="glass-input w-full p-3" placeholder="Ex: Attestation de travail" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Description</label>
                        <input value={modelForm.description} onChange={(e) => setModelForm(p => ({ ...p, description: e.target.value }))} className="glass-input w-full p-3" placeholder="Description du modèle" />
                      </div>
                    </div>
                    <div className="flex gap-3 p-6 pt-4 border-t border-border/30 shrink-0 bg-background/50">
                      <button onClick={handleAddDocumentModel} className="btn-success flex-1 py-3">Ajouter</button>
                      <button onClick={() => setShowAddModel(false)} className="btn-ghost border border-border py-3 px-6">Annuler</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Add Model File Modal */}
              {showAddModelFile && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" style={{ zIndex: 9999 }}>
                  <div className="glass-card w-full max-w-md animate-scale-in my-8 flex flex-col shadow-2xl border border-border/50">
                    <div className="flex items-center justify-between p-6 pb-4 border-b border-border/30 shrink-0">
                      <h3 className="text-lg font-semibold">Ajouter Fichier</h3>
                      <button onClick={() => setShowAddModelFile(false)} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Titre *</label>
                        <input value={modelFileForm.title} onChange={(e) => setModelFileForm(p => ({ ...p, title: e.target.value }))} className="glass-input w-full p-3" placeholder="Titre du fichier" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Description</label>
                        <input value={modelFileForm.description} onChange={(e) => setModelFileForm(p => ({ ...p, description: e.target.value }))} className="glass-input w-full p-3" placeholder="Description" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Fichier * (max 10 Mo)</label>
                        <label className={`w-full py-3 flex items-center justify-center gap-2 cursor-pointer rounded-xl transition-all ${
                          modelFileForm.fileData 
                            ? 'bg-success/20 border-2 border-success/50 text-success' 
                            : 'btn-primary'
                        }`}>
                          {modelFileForm.fileData ? <Check className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                          <span className="truncate max-w-[200px]">{modelFileForm.fileName || 'Sélectionner fichier'}</span>
                          <input ref={modelFileInputRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.rtf,.odt,.odp,.ods" onChange={handleModelFileUpload} className="hidden" />
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-3 p-6 pt-4 border-t border-border/30 shrink-0 bg-background/50">
                      <button 
                        onClick={handleSaveModelFile} 
                        disabled={!modelFileForm.title || !modelFileForm.fileData}
                        className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                          modelFileForm.title && modelFileForm.fileData
                            ? 'btn-success'
                            : 'bg-muted text-muted-foreground cursor-not-allowed'
                        }`}
                      >
                        <Check className="w-4 h-4" /> Enregistrer
                      </button>
                      <button onClick={() => { setShowAddModelFile(false); setModelFileForm({ title: '', description: '', type: 'pdf', fileName: '', fileData: '' }); }} className="btn-ghost border border-border py-3 px-6">Annuler</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stages Section with Drag & Drop */}
          {activeSection === 'stages' && (
            <div className="glass-card overflow-hidden">
              <div className="p-4 bg-gradient-gold border-b border-primary/20 flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2 text-primary-foreground">
                  <Layers className="w-5 h-5" />
                  Gestion des Stages
                </h2>
                <button onClick={() => setShowAddStage(true)} className="btn-success flex items-center gap-2 py-2">
                  <Plus className="w-4 h-4" /> Ajouter Stage
                </button>
              </div>

              <div className="p-6">
                <p className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
                  <GripVertical className="w-4 h-4" />
                  Glissez-déposez les stages pour réorganiser leur ordre
                </p>
                
                <DndContext 
                  sensors={sensors} 
                  collisionDetection={closestCenter} 
                  onDragEnd={handleStageDragEnd}
                >
                  <SortableContext 
                    items={stages.sort((a, b) => a.order - b.order).map(s => s.id)} 
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="grid md:grid-cols-2 gap-4">
                      {stages.sort((a, b) => a.order - b.order).map((stage) => (
                        <SortableStageItem
                          key={stage.id}
                          stage={stage}
                          onToggle={handleToggleStage}
                          onDelete={handleDeleteStage}
                          onChangeDisableTarget={handleChangeDisableTarget}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                <p className="text-sm text-muted-foreground mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <strong>Note:</strong> FCB est désactivé par défaut. Activez-le ici pour l'afficher dans les cours.
                </p>
              </div>

              {/* Add Stage Modal */}
              {showAddStage && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" style={{ zIndex: 9999 }}>
                  <div className="glass-card w-full max-w-md animate-scale-in my-8 flex flex-col shadow-2xl border border-border/50">
                    <div className="flex items-center justify-between p-6 pb-4 border-b border-border/30 shrink-0">
                      <h3 className="text-lg font-semibold">Ajouter Stage</h3>
                      <button onClick={() => setShowAddStage(false)} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Nom du stage *</label>
                        <input value={stageForm.name} onChange={(e) => setStageForm(p => ({ ...p, name: e.target.value }))} className="glass-input w-full p-3" placeholder="Ex: CAT3" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Description</label>
                        <input value={stageForm.description} onChange={(e) => setStageForm(p => ({ ...p, description: e.target.value }))} className="glass-input w-full p-3" placeholder="Description du stage" />
                      </div>
                    </div>
                    <div className="flex gap-3 p-6 pt-4 border-t border-border/30 shrink-0 bg-background/50">
                      <button onClick={handleAddStage} className="btn-success flex-1 py-3">Ajouter</button>
                      <button onClick={() => setShowAddStage(false)} className="btn-ghost border border-border py-3 px-6">Annuler</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Permissions Section */}
          {activeSection === 'permissions' && (
            <PermissionsManager />
          )}

          {/* Appearance Section */}
          {activeSection === 'appearance' && (
            <div className="space-y-6">
              {/* Logo Settings */}
              <div className="glass-card overflow-hidden">
                <div className="p-4 bg-gradient-gold border-b border-primary/20">
                  <h2 className="text-lg font-bold flex items-center gap-2 text-primary-foreground">
                    <ImageIcon className="w-5 h-5" />
                    Logo de l'Application
                  </h2>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-6 mb-6">
                    <div className="w-24 h-24 rounded-2xl bg-card border-2 border-primary/30 p-2 shadow-gold">
                      <img src={currentLogo} alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-3">
                        Personnalisez le logo affiché dans l'application. Format recommandé: PNG ou JPG, carré.
                      </p>
                      <div className="flex gap-3">
                        <label className="btn-primary py-2 px-4 flex items-center gap-2 cursor-pointer">
                          <Upload className="w-4 h-4" /> Changer le logo
                          <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        </label>
                        {appSettings.customLogo && (
                          <button onClick={handleResetLogo} className="btn-ghost py-2 px-4 border border-border flex items-center gap-2">
                            <RotateCcw className="w-4 h-4" /> Réinitialiser
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Wallpaper Gallery */}
              <div className="glass-card overflow-hidden">
                <div className="p-4 bg-success/20 border-b border-success/20">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-success" />
                    Fonds d'écran
                  </h2>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4 p-4 bg-muted/30 rounded-xl">
                    <span className="font-medium">Afficher l'arrière-plan</span>
                    <button onClick={handleToggleBg} className={`w-14 h-8 rounded-full transition-colors relative ${bgEnabled ? 'bg-gradient-gold' : 'bg-muted'}`}>
                      <div className={`w-6 h-6 bg-foreground rounded-full absolute top-1 transition-transform ${bgEnabled ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {wallpapers.map((wp) => (
                      <button
                        key={wp.id}
                        onClick={() => handleSelectWallpaper(wp)}
                        className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all group ${
                          selectedWallpaper === wp.id || customBg === wp.src
                            ? 'border-primary ring-2 ring-primary/30 shadow-gold'
                            : 'border-border/30 hover:border-border'
                        }`}
                      >
                        <img src={wp.src} alt={wp.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                          <span className="text-white text-xs font-medium p-2">{wp.name}</span>
                        </div>
                        {(selectedWallpaper === wp.id || customBg === wp.src) && (
                          <div className="absolute top-2 right-2 w-6 h-6 bg-gradient-gold rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-primary-foreground" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <label className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 cursor-pointer">
                      <ImagePlus className="w-5 h-5" /> Image personnalisée
                      <input ref={bgInputRef} type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
                    </label>
                    <button onClick={handleResetBg} className="btn-ghost py-3 px-6 border border-border flex items-center gap-2">
                      <RotateCcw className="w-4 h-4" /> Réinitialiser
                    </button>
                  </div>
                </div>
              </div>

              {/* Sound Settings */}
              <div className="glass-card overflow-hidden">
                <div className="p-4 bg-accent/20 border-b border-accent/20">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    {soundEnabled ? <Volume2 className="w-5 h-5 text-accent" /> : <VolumeX className="w-5 h-5 text-muted-foreground" />}
                    Son de Clic
                  </h2>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                    <span className="font-medium">Activer les sons</span>
                    <button onClick={handleToggleSound} className={`w-14 h-8 rounded-full transition-colors relative ${soundEnabled ? 'bg-gradient-gold' : 'bg-muted'}`}>
                      <div className={`w-6 h-6 bg-foreground rounded-full absolute top-1 transition-transform ${soundEnabled ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <label className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 cursor-pointer">
                      <Upload className="w-4 h-4" /> Changer le son
                      <input ref={soundInputRef} type="file" accept="audio/*" onChange={handleSoundUpload} className="hidden" />
                    </label>
                    <button onClick={handleTestSound} className="btn-success py-3 px-6 flex items-center gap-2">
                      <Volume2 className="w-4 h-4" /> Tester
                    </button>
                    <button onClick={handleResetSound} className="btn-ghost py-3 px-6 border border-border">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Download Toggle */}
              <div className="glass-card overflow-hidden">
                <div className="p-4 bg-blue-500/20 border-b border-blue-500/20">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Download className="w-5 h-5 text-blue-400" />
                    Téléchargement de Fichiers
                  </h2>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                    <div>
                      <span className="font-medium">Autoriser le téléchargement</span>
                      <p className="text-sm text-muted-foreground mt-1">
                        Permet aux utilisateurs de télécharger les fichiers PDF, PPT, Word et vidéos
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        const newValue = !downloadEnabled;
                        setDownloadEnabledState(newValue);
                        setDownloadEnabled(newValue);
                        toast({ title: newValue ? 'Téléchargement activé' : 'Téléchargement désactivé' });
                      }} 
                      className={`w-14 h-8 rounded-full transition-colors relative ${downloadEnabled ? 'bg-gradient-gold' : 'bg-muted'}`}
                    >
                      <div className={`w-6 h-6 bg-foreground rounded-full absolute top-1 transition-transform ${downloadEnabled ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Data Section */}
          {activeSection === 'data' && (
            <div className="space-y-6">
              <div className="glass-card overflow-hidden">
                <div className="p-4 bg-gradient-gold border-b border-primary/20">
                  <h2 className="text-lg font-bold flex items-center gap-2 text-primary-foreground">
                    <FolderArchive className="w-5 h-5" />
                    Exporter / Importer Données
                  </h2>
                </div>

                <div className="p-6 grid md:grid-cols-2 gap-6">
                  <div className="p-6 stat-card-gold">
                    <div className="w-12 h-12 bg-gradient-gold rounded-xl flex items-center justify-center mb-4 shadow-gold">
                      <FolderArchive className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Export/Import Complet (ZIP)</h3>
                    <p className="text-sm text-muted-foreground mb-6">Archive avec tous les fichiers et données</p>
                    <div className="flex gap-3">
                      <button onClick={handleExportZip} disabled={isExporting} className="btn-primary flex-1 py-3 flex items-center justify-center gap-2">
                        <Download className="w-4 h-4" /> {isExporting ? 'Export...' : 'Exporter ZIP'}
                      </button>
                      <label className="btn-success flex-1 py-3 flex items-center justify-center gap-2 cursor-pointer">
                        <Upload className="w-4 h-4" /> Importer
                        <input ref={zipInputRef} type="file" accept=".zip" onChange={handleImportZipWithChoice} className="hidden" />
                      </label>
                    </div>
                  </div>

                  <div className="p-6 bg-muted/30 rounded-2xl border border-border/30">
                    <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mb-4">
                      <Download className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Export JSON (backup simple)</h3>
                    <p className="text-sm text-muted-foreground mb-6">Données sans fichiers séparés</p>
                    <div className="flex gap-3">
                      <button onClick={handleExportData} className="btn-ghost flex-1 py-3 flex items-center justify-center gap-2 border border-border">
                        <Download className="w-4 h-4" /> JSON
                      </button>
                      <label className="btn-ghost flex-1 py-3 flex items-center justify-center gap-2 cursor-pointer border border-border">
                        <Upload className="w-4 h-4" /> Importer
                        <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportJsonWithChoice} className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delete All Data */}
              <div className="glass-card overflow-hidden">
                <div className="p-4 bg-destructive/20 border-b border-destructive/30">
                  <h2 className="text-lg font-bold flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-5 h-5" />
                    Zone Dangereuse
                  </h2>
                </div>
                <div className="p-6">
                  <p className="text-muted-foreground mb-4">Supprimer toutes les données de l'application (cours, fichiers, élèves, paramètres).</p>
                  <button 
                    onClick={() => setShowDeleteConfirm(true)} 
                    className="btn-ghost py-3 px-6 border-2 border-destructive text-destructive hover:bg-destructive/10 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Supprimer toutes les données
                  </button>
                </div>
              </div>

              {/* Import Mode Modal */}
              {showImportModeModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
                  <div className="glass-card w-full max-w-md animate-scale-in shadow-2xl border border-border/50">
                    <div className="flex items-center justify-between p-6 pb-4 border-b border-border/30">
                      <h3 className="text-lg font-semibold">Mode d'importation</h3>
                      <button onClick={() => { setShowImportModeModal(false); setPendingImportFile(null); }} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="p-6 space-y-4">
                      <p className="text-muted-foreground">Comment voulez-vous importer les données?</p>
                      <div className="space-y-3">
                        <button 
                          onClick={() => setImportMode('replace')}
                          className={`w-full p-4 rounded-xl border-2 text-left transition-all ${importMode === 'replace' ? 'border-primary bg-primary/10' : 'border-border/30 hover:border-border'}`}
                        >
                          <div className="font-semibold">Remplacer tout</div>
                          <div className="text-sm text-muted-foreground">Efface les données existantes et importe les nouvelles</div>
                        </button>
                        <button 
                          onClick={() => setImportMode('merge')}
                          className={`w-full p-4 rounded-xl border-2 text-left transition-all ${importMode === 'merge' ? 'border-primary bg-primary/10' : 'border-border/30 hover:border-border'}`}
                        >
                          <div className="font-semibold">Fusionner</div>
                          <div className="text-sm text-muted-foreground">Garde les données existantes et ajoute les nouvelles</div>
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-3 p-6 pt-4 border-t border-border/30">
                      <button onClick={handleImportWithMode} className="btn-primary flex-1 py-3">Importer</button>
                      <button onClick={() => { setShowImportModeModal(false); setPendingImportFile(null); }} className="btn-ghost border border-border py-3 px-6">Annuler</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Delete Confirmation Modal */}
              {showDeleteConfirm && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
                  <div className="glass-card w-full max-w-md animate-scale-in shadow-2xl border border-destructive/50">
                    <div className="flex items-center justify-between p-6 pb-4 border-b border-border/30">
                      <h3 className="text-lg font-semibold text-destructive flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" /> Confirmation
                      </h3>
                      <button onClick={() => setShowDeleteConfirm(false)} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="p-6">
                      <p className="text-muted-foreground mb-4">Êtes-vous sûr de vouloir supprimer <strong>TOUTES</strong> les données? Cette action est irréversible.</p>
                    </div>
                    <div className="flex gap-3 p-6 pt-4 border-t border-border/30">
                      <button onClick={handleDeleteAllData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex-1 py-3 rounded-lg font-medium">Oui, tout supprimer</button>
                      <button onClick={() => setShowDeleteConfirm(false)} className="btn-ghost border border-border py-3 px-6">Annuler</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Guide Section */}
          {activeSection === 'guide' && (
            <div className="space-y-6">
              {/* Welcome Card */}
              <div className="glass-panel p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-gold flex items-center justify-center shadow-gold animate-float">
                  <Sparkles className="w-10 h-10 text-primary-foreground" />
                </div>
                <h2 className="text-3xl font-bold mb-3">Bienvenue sur CSM</h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  Centre Sportif Militaire - Votre plateforme de gestion des cours, élèves et promotions
                </p>
              </div>

              {/* Quick Start Guide */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Step 1 */}
                <div className="glass-card p-6 group hover:border-primary/40 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 group-hover:bg-gradient-gold group-hover:shadow-gold transition-all">
                      <span className="text-lg font-bold gold-text group-hover:text-primary-foreground">1</span>
                    </div>
                    <div>
                      <h3 className="font-bold mb-2 flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-primary" />
                        Créer les Comptes
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Importez vos élèves via Excel ou ajoutez-les manuellement dans l'onglet <strong>Comptes</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="glass-card p-6 group hover:border-primary/40 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 group-hover:bg-gradient-gold group-hover:shadow-gold transition-all">
                      <span className="text-lg font-bold gold-text group-hover:text-primary-foreground">2</span>
                    </div>
                    <div>
                      <h3 className="font-bold mb-2 flex items-center gap-2">
                        <UserCheck className="w-5 h-5 text-success" />
                        Gérer les Promotions
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Créez des promotions et assignez les élèves dans l'onglet <strong>Promotions</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="glass-card p-6 group hover:border-primary/40 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 group-hover:bg-gradient-gold group-hover:shadow-gold transition-all">
                      <span className="text-lg font-bold gold-text group-hover:text-primary-foreground">3</span>
                    </div>
                    <div>
                      <h3 className="font-bold mb-2 flex items-center gap-2">
                        <Layers className="w-5 h-5 text-accent" />
                        Configurer les Stages
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Activez ou désactivez les stages disponibles dans l'onglet <strong>Stages</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="glass-card p-6 group hover:border-primary/40 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 group-hover:bg-gradient-gold group-hover:shadow-gold transition-all">
                      <span className="text-lg font-bold gold-text group-hover:text-primary-foreground">4</span>
                    </div>
                    <div>
                      <h3 className="font-bold mb-2 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-400" />
                        Ajouter des Modèles
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Uploadez vos modèles de documents (Word, PDF, PPT) dans <strong>Modèles</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="glass-card p-6 group hover:border-primary/40 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 group-hover:bg-gradient-gold group-hover:shadow-gold transition-all">
                      <span className="text-lg font-bold gold-text group-hover:text-primary-foreground">5</span>
                    </div>
                    <div>
                      <h3 className="font-bold mb-2 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-orange-400" />
                        Gérer les Cours
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Ajoutez des catégories et des cours depuis la page <strong>Accueil</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 6 */}
                <div className="glass-card p-6 group hover:border-primary/40 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 group-hover:bg-gradient-gold group-hover:shadow-gold transition-all">
                      <span className="text-lg font-bold gold-text group-hover:text-primary-foreground">6</span>
                    </div>
                    <div>
                      <h3 className="font-bold mb-2 flex items-center gap-2">
                        <Database className="w-5 h-5 text-purple-400" />
                        Sauvegarder les Données
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Exportez régulièrement vos données via l'onglet <strong>Données</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features Overview */}
              <div className="glass-card overflow-hidden">
                <div className="p-4 bg-gradient-gold border-b border-primary/20">
                  <h2 className="text-lg font-bold flex items-center gap-2 text-primary-foreground">
                    <Lightbulb className="w-5 h-5" />
                    Fonctionnalités Principales
                  </h2>
                </div>
                <div className="p-6 grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 bg-muted/20 rounded-xl">
                    <Shield className="w-6 h-6 text-success shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold mb-1">Accès Sécurisé</h4>
                      <p className="text-sm text-muted-foreground">
                        3 modes d'accès: Admin (gestion complète), Utilisateur (consultation), Élève (accès personnel)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-muted/20 rounded-xl">
                    <FileSpreadsheet className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold mb-1">Import Excel</h4>
                      <p className="text-sm text-muted-foreground">
                        Importez des centaines d'élèves en un clic via fichier Excel/CSV
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-muted/20 rounded-xl">
                    <FolderArchive className="w-6 h-6 text-accent shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold mb-1">Stockage Illimité</h4>
                      <p className="text-sm text-muted-foreground">
                        Aucune limite de taille ou de nombre de fichiers grâce à IndexedDB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-muted/20 rounded-xl">
                    <Palette className="w-6 h-6 text-pink-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold mb-1">Personnalisation</h4>
                      <p className="text-sm text-muted-foreground">
                        Changez le fond d'écran, le logo et les sons selon vos préférences
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="glass-card p-6 border-l-4 border-l-primary">
                <div className="flex items-start gap-4">
                  <HelpCircle className="w-8 h-8 text-primary shrink-0" />
                  <div>
                    <h3 className="font-bold mb-2">Astuce Rapide</h3>
                    <p className="text-muted-foreground">
                      Utilisez le bouton <strong>"Sélectionner tout"</strong> dans la fenêtre d'assignation pour assigner rapidement tous les élèves à une promotion. 
                      Vous pouvez aussi filtrer par nom ou matricule avant de sélectionner.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Activity Log Section */}
          {activeSection === 'activity' && (
            <div className="space-y-6">
              <div className="glass-card overflow-hidden">
                <div className="p-4 bg-gradient-gold border-b border-primary/20">
                  <h2 className="text-lg font-bold flex items-center gap-2 text-primary-foreground">
                    <Database className="w-5 h-5" />
                    Journal d'Activité
                  </h2>
                  <p className="text-sm text-primary-foreground/80 mt-1">
                    Suivi des connexions et consultations
                  </p>
                </div>
                <div className="p-6">
                  <ActivityLogSection />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Parametres;

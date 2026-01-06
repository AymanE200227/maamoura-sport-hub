import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Lock, Check, Eye, EyeOff, Download, Upload, Users, Volume2, VolumeX, 
  RotateCcw, FolderArchive, GraduationCap, Settings, Trash2, Edit, Plus, 
  FileSpreadsheet, Layers, ToggleLeft, ToggleRight, X, Palette, ImagePlus,
  Monitor, Image as ImageIcon
} from 'lucide-react';
import Layout from '@/components/Layout';
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
  getStudentAccounts,
  addStudentAccount,
  updateStudentAccount,
  deleteStudentAccount,
  importStudentAccountsBulk,
  getStages,
  updateStage,
  addStage,
  deleteStage,
  getAppSettings,
  saveAppSettings
} from '@/lib/storage';
import { exportToZip, importFromZip } from '@/lib/zipExport';
import { 
  getClickSound, 
  setClickSound, 
  resetClickSound, 
  isClickSoundEnabled, 
  setClickSoundEnabled 
} from '@/hooks/useClickSound';
import { useToast } from '@/hooks/use-toast';
import { StudentAccount, Stage, AppSettings } from '@/types';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const soundInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // Active section
  const [activeSection, setActiveSection] = useState<'security' | 'accounts' | 'stages' | 'appearance' | 'data'>('security');
  
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

  // Student accounts state
  const [studentAccounts, setStudentAccounts] = useState<StudentAccount[]>([]);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentAccount | null>(null);
  const [studentForm, setStudentForm] = useState({ matricule: '', cin: '', nom: '', prenom: '', grade: '', unite: '' });
  const [searchStudent, setSearchStudent] = useState('');
  
  // Excel import state
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [excelData, setExcelData] = useState<Record<string, string>[]>([]);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState({ matricule: '', cin: '', nom: '', prenom: '', grade: '', unite: '' });
  
  // Stages state
  const [stages, setStages] = useState<Stage[]>([]);
  const [showAddStage, setShowAddStage] = useState(false);
  const [stageForm, setStageForm] = useState({ name: '', description: '' });

  // App settings
  const [appSettings, setAppSettings] = useState<AppSettings>(getAppSettings());

  useEffect(() => {
    if (!userMode) {
      navigate('/');
    }
    if (userMode !== 'admin') {
      navigate('/accueil');
    }
    loadData();
  }, [userMode, navigate]);

  const loadData = useCallback(() => {
    setStudentAccounts(getStudentAccounts());
    setStages(getStages());
    setAppSettings(getAppSettings());
  }, []);

  // Filtered students - memoized
  const filteredStudents = useMemo(() => studentAccounts.filter(s => 
    s.matricule.toLowerCase().includes(searchStudent.toLowerCase()) ||
    s.nom?.toLowerCase().includes(searchStudent.toLowerCase()) ||
    s.prenom?.toLowerCase().includes(searchStudent.toLowerCase()) ||
    s.grade?.toLowerCase().includes(searchStudent.toLowerCase())
  ), [studentAccounts, searchStudent]);

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
    { id: 'security' as const, label: 'Sécurité', icon: Lock },
    { id: 'accounts' as const, label: 'Comptes', icon: GraduationCap },
    { id: 'stages' as const, label: 'Stages', icon: Layers },
    { id: 'appearance' as const, label: 'Apparence', icon: Palette },
    { id: 'data' as const, label: 'Données', icon: FolderArchive },
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
              onClick={() => setActiveSection(section.id)}
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

              {/* User Password */}
              <div className="glass-card overflow-hidden">
                <div className="p-4 bg-success/20 border-b border-success/20">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Users className="w-5 h-5 text-success" />
                    Mot de Passe Utilisateur
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

              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
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
                    {filteredStudents.map((account) => (
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

          {/* Stages Section */}
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
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stages.sort((a, b) => a.order - b.order).map((stage) => (
                    <div key={stage.id} className={`p-4 rounded-xl border-2 transition-all ${
                      stage.enabled 
                        ? 'bg-card border-primary/30 shadow-lg shadow-primary/5' 
                        : 'bg-muted/20 border-border/20 opacity-60'
                    }`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-lg gold-text">{stage.name}</h4>
                          <p className="text-sm text-muted-foreground">{stage.description}</p>
                        </div>
                        <button 
                          onClick={() => handleToggleStage(stage)} 
                          className={`p-2 rounded-lg transition-colors ${stage.enabled ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}
                        >
                          {stage.enabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs px-2 py-1 rounded-full ${stage.enabled ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                          {stage.enabled ? 'Activé' : 'Désactivé'}
                        </span>
                        {!['fcb', 'cat1', 'cat2', 'be', 'bs', 'aide'].includes(stage.id) && (
                          <button onClick={() => handleDeleteStage(stage.id)} className="p-2 hover:bg-destructive/20 rounded-lg text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

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
            </div>
          )}

          {/* Data Section */}
          {activeSection === 'data' && (
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
                      <input ref={zipInputRef} type="file" accept=".zip" onChange={handleImportZip} className="hidden" />
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
                      <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportData} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>

              <div className="mx-6 mb-6 p-4 bg-destructive/10 rounded-xl border border-destructive/30">
                <p className="text-sm text-destructive flex items-center gap-2">
                  <span className="font-bold">⚠️ Attention:</span> L'importation remplacera toutes les données existantes.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Parametres;

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Users, Plus, Edit, Trash2, LogOut, UserCheck, Calendar,
  SkipForward, Clock, History, Settings, Search, ChevronRight,
  AlertTriangle, Check, X, RefreshCw, Award, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import TablePagination from '@/components/TablePagination';
import {
  getSoldiers,
  addSoldier,
  updateSoldier,
  deleteSoldier,
  toggleSoldierActive,
  checkAndRotate,
  skipCurrentChef,
  assignChefForDate,
  getPermanenceHistory,
  getStatistics,
  getUserMode,
  clearUserMode,
  getSettings,
  saveSettings,
} from '@/lib/permanenceStorage';
import { Soldier, GRADES, getGradeLabel, PermanenceRecord, Grade } from '@/types/permanence';
import logoImage from '@/assets/logo-official.png';

const PermanenceAdmin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Check auth
  useEffect(() => {
    if (getUserMode() !== 'admin') {
      navigate('/permanence');
    }
  }, [navigate]);

  // State
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [currentChef, setCurrentChef] = useState<Soldier | null>(null);
  const [currentRecord, setCurrentRecord] = useState<PermanenceRecord | null>(null);
  const [activeSection, setActiveSection] = useState<'dashboard' | 'soldiers' | 'history' | 'settings'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Dialogs
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  
  // Form state
  const [editingSoldier, setEditingSoldier] = useState<Soldier | null>(null);
  const [formData, setFormData] = useState({ matricule: '', nom: '', prenom: '', grade: 'sergent' as Grade });
  const [skipNote, setSkipNote] = useState('');
  const [assignDate, setAssignDate] = useState('');
  const [assignSoldierId, setAssignSoldierId] = useState('');
  
  // Settings
  const [settings, setSettings] = useState(getSettings());
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');

  // Load data
  const loadData = useCallback(() => {
    setSoldiers(getSoldiers());
    const { chef, record } = checkAndRotate();
    setCurrentChef(chef);
    setCurrentRecord(record);
  }, []);

  useEffect(() => {
    loadData();
    // Check rotation every minute
    const interval = setInterval(() => {
      const { chef, record } = checkAndRotate();
      setCurrentChef(chef);
      setCurrentRecord(record);
    }, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Filtered soldiers
  const filteredSoldiers = useMemo(() => {
    return soldiers.filter(s => 
      s.matricule.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.prenom.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [soldiers, searchTerm]);

  // Pagination
  const paginatedSoldiers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSoldiers.slice(start, start + itemsPerPage);
  }, [filteredSoldiers, currentPage, itemsPerPage]);

  // Statistics
  const stats = useMemo(() => getStatistics(), [soldiers]);
  const history = useMemo(() => getPermanenceHistory(10), [currentRecord]);

  // Handlers
  const handleLogout = useCallback(() => {
    clearUserMode();
    navigate('/permanence');
  }, [navigate]);

  const handleAddSoldier = useCallback(() => {
    if (!formData.matricule || !formData.nom || !formData.prenom) {
      toast({ title: "Erreur", description: "Tous les champs sont requis", variant: "destructive" });
      return;
    }
    addSoldier(formData);
    setSoldiers(getSoldiers());
    setShowAddDialog(false);
    setFormData({ matricule: '', nom: '', prenom: '', grade: 'sergent' });
    toast({ title: "Succès", description: "Soldat ajouté avec succès" });
  }, [formData, toast]);

  const handleEditSoldier = useCallback(() => {
    if (!editingSoldier) return;
    updateSoldier(editingSoldier.id, formData);
    setSoldiers(getSoldiers());
    setShowEditDialog(false);
    setEditingSoldier(null);
    toast({ title: "Succès", description: "Soldat modifié avec succès" });
  }, [editingSoldier, formData, toast]);

  const handleDeleteSoldier = useCallback(() => {
    if (!editingSoldier) return;
    deleteSoldier(editingSoldier.id);
    setSoldiers(getSoldiers());
    loadData();
    setShowDeleteDialog(false);
    setEditingSoldier(null);
    toast({ title: "Succès", description: "Soldat supprimé avec succès" });
  }, [editingSoldier, loadData, toast]);

  const handleToggleActive = useCallback((id: string) => {
    toggleSoldierActive(id);
    setSoldiers(getSoldiers());
    toast({ title: "Succès", description: "Statut modifié" });
  }, [toast]);

  const handleSkip = useCallback(() => {
    const { chef, record } = skipCurrentChef(skipNote);
    setCurrentChef(chef);
    setCurrentRecord(record);
    setShowSkipDialog(false);
    setSkipNote('');
    toast({ title: "Succès", description: "Nouveau chef de permanence assigné" });
  }, [skipNote, toast]);

  const handleAssign = useCallback(() => {
    if (!assignDate || !assignSoldierId) {
      toast({ title: "Erreur", description: "Sélectionnez une date et un soldat", variant: "destructive" });
      return;
    }
    assignChefForDate(assignSoldierId, assignDate);
    loadData();
    setShowAssignDialog(false);
    setAssignDate('');
    setAssignSoldierId('');
    toast({ title: "Succès", description: "Chef de permanence assigné" });
  }, [assignDate, assignSoldierId, loadData, toast]);

  const handleSaveSettings = useCallback(() => {
    const updatedSettings = { ...settings };
    if (newAdminPassword) updatedSettings.adminPassword = newAdminPassword;
    if (newUserPassword) updatedSettings.userPassword = newUserPassword;
    saveSettings(updatedSettings);
    setSettings(updatedSettings);
    setNewAdminPassword('');
    setNewUserPassword('');
    toast({ title: "Succès", description: "Paramètres sauvegardés" });
  }, [settings, newAdminPassword, newUserPassword, toast]);

  const openEditDialog = useCallback((soldier: Soldier) => {
    setEditingSoldier(soldier);
    setFormData({ matricule: soldier.matricule, nom: soldier.nom, prenom: soldier.prenom, grade: soldier.grade });
    setShowEditDialog(true);
  }, []);

  const openDeleteDialog = useCallback((soldier: Soldier) => {
    setEditingSoldier(soldier);
    setShowDeleteDialog(true);
  }, []);

  // Current time display
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const menuItems = [
    { id: 'dashboard' as const, label: 'Tableau de bord', icon: Award },
    { id: 'soldiers' as const, label: 'Gestion Soldats', icon: Users },
    { id: 'history' as const, label: 'Historique', icon: History },
    { id: 'settings' as const, label: 'Paramètres', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="glass-panel border-b border-border/50 px-4 lg:px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <img src={logoImage} alt="Logo" className="w-7 h-7 object-contain" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-foreground">Gestion Permanence</h1>
              <p className="text-xs text-muted-foreground">Panneau Administrateur</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg">
            <Clock className="w-4 h-4" />
            {currentTime.toLocaleTimeString('fr-FR')}
          </div>
          <Badge variant="outline" className="hidden sm:flex bg-red-500/10 text-red-600 border-red-500/20">
            <Shield className="w-3 h-3 mr-1" />
            Admin
          </Badge>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Déconnexion">
            <LogOut className="w-5 h-5 text-muted-foreground hover:text-destructive" />
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-[calc(100vh-64px)] glass-panel border-r border-border/50 p-4 hidden lg:block">
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                  activeSection === item.id
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
                {activeSection === item.id && <ChevronRight className="w-4 h-4 ml-auto" />}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile nav */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 glass-panel border-t border-border/50 p-2 z-50">
          <nav className="flex justify-around">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                  activeSection === item.id
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6">
          {/* Dashboard */}
          {activeSection === 'dashboard' && (
            <div className="space-y-6">
              {/* Today's Chef Card */}
              <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="w-6 h-6 text-primary" />
                      <CardTitle>Chef de Permanence Aujourd'hui</CardTitle>
                    </div>
                    <Badge className="bg-primary/20 text-primary">
                      {currentTime.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {currentChef ? (
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-xl shadow-primary/30">
                        {currentChef.prenom.charAt(0)}{currentChef.nom.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-foreground">
                          {currentChef.prenom} {currentChef.nom}
                        </h3>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge variant="secondary">{getGradeLabel(currentChef.grade)}</Badge>
                          <span className="text-muted-foreground">Mle: {currentChef.matricule}</span>
                        </div>
                        {currentRecord?.note && (
                          <p className="text-sm text-muted-foreground mt-2 italic">
                            Note: {currentRecord.note}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button onClick={() => setShowSkipDialog(true)} variant="outline" className="gap-2">
                          <SkipForward className="w-4 h-4" />
                          Passer
                        </Button>
                        <Button onClick={() => setShowAssignDialog(true)} variant="outline" className="gap-2">
                          <Calendar className="w-4 h-4" />
                          Modifier
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                      <p className="text-lg">Aucun chef de permanence assigné</p>
                      <p className="text-sm">Ajoutez des soldats actifs pour démarrer la rotation</p>
                      <Button onClick={() => setShowAssignDialog(true)} className="mt-4 gap-2">
                        <UserCheck className="w-4 h-4" />
                        Assigner manuellement
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="glass-panel">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-blue-500/10">
                        <Users className="w-6 h-6 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.totalSoldiers}</p>
                        <p className="text-sm text-muted-foreground">Total Soldats</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-panel">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-green-500/10">
                        <UserCheck className="w-6 h-6 text-green-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.activeSoldiers}</p>
                        <p className="text-sm text-muted-foreground">Soldats Actifs</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-panel">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-purple-500/10">
                        <Award className="w-6 h-6 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.totalPermanences}</p>
                        <p className="text-sm text-muted-foreground">Permanences</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-panel">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-orange-500/10">
                        <SkipForward className="w-6 h-6 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.skippedCount}</p>
                        <p className="text-sm text-muted-foreground">Passés</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent History */}
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Historique Récent
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {history.length > 0 ? (
                    <div className="space-y-3">
                      {history.slice(0, 5).map((record) => (
                        <div key={record.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                              {record.soldier ? `${record.soldier.prenom.charAt(0)}${record.soldier.nom.charAt(0)}` : '?'}
                            </div>
                            <div>
                              <p className="font-medium">
                                {record.soldier ? `${record.soldier.prenom} ${record.soldier.nom}` : 'Soldat supprimé'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(record.visionnement).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {record.wasSkipped && <Badge variant="outline" className="text-orange-500 border-orange-500/20">Passé</Badge>}
                            <Badge variant="secondary">{record.assignedBy === 'admin' ? 'Manuel' : 'Auto'}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">Aucun historique disponible</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Soldiers Management */}
          {activeSection === 'soldiers' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Gestion des Soldats</h2>
                  <p className="text-muted-foreground">Gérez la liste des soldats pour la rotation</p>
                </div>
                <Button onClick={() => setShowAddDialog(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Ajouter un soldat
                </Button>
              </div>

              <Card className="glass-panel">
                <CardHeader className="pb-4">
                  <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher par matricule, nom ou prénom..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="pl-10"
                      />
                    </div>
                    <Button variant="outline" onClick={loadData} className="gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Actualiser
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-border/50 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Matricule</TableHead>
                          <TableHead>Nom</TableHead>
                          <TableHead>Prénom</TableHead>
                          <TableHead>Grade</TableHead>
                          <TableHead className="text-center">Actif</TableHead>
                          <TableHead className="text-center">Permanences</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedSoldiers.length > 0 ? (
                          paginatedSoldiers.map((soldier) => (
                            <TableRow key={soldier.id} className="hover:bg-muted/30">
                              <TableCell className="font-mono font-medium">{soldier.matricule}</TableCell>
                              <TableCell className="font-medium">{soldier.nom}</TableCell>
                              <TableCell>{soldier.prenom}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{getGradeLabel(soldier.grade)}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={soldier.isActive}
                                  onCheckedChange={() => handleToggleActive(soldier.id)}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary">{stats.permanenceCount[soldier.id] || 0}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button size="icon" variant="ghost" onClick={() => openEditDialog(soldier)}>
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => openDeleteDialog(soldier)}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                              {searchTerm ? 'Aucun soldat trouvé' : 'Aucun soldat enregistré'}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <TablePagination
                    currentPage={currentPage}
                    totalItems={filteredSoldiers.length}
                    pageSize={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* History */}
          {activeSection === 'history' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Historique des Permanences</h2>
                <p className="text-muted-foreground">Consultez l'historique complet des assignations</p>
              </div>

              <Card className="glass-panel">
                <CardContent className="pt-6">
                  {history.length > 0 ? (
                    <div className="space-y-3">
                      {history.map((record) => (
                        <div key={record.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-border/50">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold">
                              {record.soldier ? `${record.soldier.prenom.charAt(0)}${record.soldier.nom.charAt(0)}` : '?'}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">
                                {record.soldier ? `${record.soldier.prenom} ${record.soldier.nom}` : 'Soldat supprimé'}
                              </p>
                              {record.soldier && (
                                <p className="text-sm text-muted-foreground">
                                  {getGradeLabel(record.soldier.grade)} • Mle: {record.soldier.matricule}
                                </p>
                              )}
                              {record.note && (
                                <p className="text-sm text-muted-foreground italic mt-1">
                                  "{record.note}"
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge className="bg-primary/10 text-primary">
                              {new Date(record.visionnement).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </Badge>
                            <div className="flex items-center gap-2">
                              {record.wasSkipped && (
                                <Badge variant="outline" className="text-orange-500 border-orange-500/30 bg-orange-500/5">
                                  Passé
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-xs">
                                {record.assignedBy === 'admin' ? 'Manuel' : 'Automatique'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Aucun historique disponible</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Settings */}
          {activeSection === 'settings' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Paramètres</h2>
                <p className="text-muted-foreground">Configurez les mots de passe et paramètres de rotation</p>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="glass-panel">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-red-500" />
                      Mot de passe Administrateur
                    </CardTitle>
                    <CardDescription>Modifier le mot de passe d'accès admin</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nouveau mot de passe</Label>
                      <Input
                        type="password"
                        value={newAdminPassword}
                        onChange={(e) => setNewAdminPassword(e.target.value)}
                        placeholder="Laisser vide pour ne pas modifier"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-panel">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-500" />
                      Mot de passe Consultation
                    </CardTitle>
                    <CardDescription>Modifier le mot de passe d'accès utilisateur</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nouveau mot de passe</Label>
                      <Input
                        type="password"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder="Laisser vide pour ne pas modifier"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-panel lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      Paramètres de Rotation
                    </CardTitle>
                    <CardDescription>Configurez l'heure de rotation automatique</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Heure de rotation (0-23)</Label>
                      <Select
                        value={settings.rotationHour.toString()}
                        onValueChange={(v) => setSettings({ ...settings, rotationHour: parseInt(v) })}
                      >
                        <SelectTrigger className="w-full max-w-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {i.toString().padStart(2, '0')}:00
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">
                        La rotation automatique se fera à cette heure chaque jour
                      </p>
                    </div>
                    <Button onClick={handleSaveSettings} className="gap-2">
                      <Check className="w-4 h-4" />
                      Sauvegarder les paramètres
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add Soldier Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un Soldat</DialogTitle>
            <DialogDescription>Remplissez les informations du nouveau soldat</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Matricule</Label>
              <Input
                value={formData.matricule}
                onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                placeholder="Ex: 123456"
              />
            </div>
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                placeholder="Nom de famille"
              />
            </div>
            <div className="space-y-2">
              <Label>Prénom</Label>
              <Input
                value={formData.prenom}
                onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                placeholder="Prénom"
              />
            </div>
            <div className="space-y-2">
              <Label>Grade</Label>
              <Select
                value={formData.grade}
                onValueChange={(v) => setFormData({ ...formData, grade: v as Grade })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRADES.map((g) => (
                    <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Annuler</Button>
            <Button onClick={handleAddSoldier}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Soldier Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le Soldat</DialogTitle>
            <DialogDescription>Modifiez les informations du soldat</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Matricule</Label>
              <Input
                value={formData.matricule}
                onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Prénom</Label>
              <Input
                value={formData.prenom}
                onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Grade</Label>
              <Select
                value={formData.grade}
                onValueChange={(v) => setFormData({ ...formData, grade: v as Grade })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRADES.map((g) => (
                    <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Annuler</Button>
            <Button onClick={handleEditSoldier}>Sauvegarder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer le soldat "{editingSoldier?.prenom} {editingSoldier?.nom}" ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDeleteSoldier}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Skip Dialog */}
      <Dialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Passer le Chef de Permanence</DialogTitle>
            <DialogDescription>
              Un nouveau chef sera assigné aléatoirement. Vous pouvez ajouter une note explicative.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Note (optionnel)</Label>
              <Textarea
                value={skipNote}
                onChange={(e) => setSkipNote(e.target.value)}
                placeholder="Raison du changement..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSkipDialog(false)}>Annuler</Button>
            <Button onClick={handleSkip} className="gap-2">
              <SkipForward className="w-4 h-4" />
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assigner un Chef de Permanence</DialogTitle>
            <DialogDescription>
              Sélectionnez une date et un soldat pour l'assignation manuelle
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={assignDate}
                onChange={(e) => setAssignDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Soldat</Label>
              <Select value={assignSoldierId} onValueChange={setAssignSoldierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un soldat" />
                </SelectTrigger>
                <SelectContent>
                  {soldiers.filter(s => s.isActive).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.prenom} {s.nom} ({getGradeLabel(s.grade)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Annuler</Button>
            <Button onClick={handleAssign} className="gap-2">
              <UserCheck className="w-4 h-4" />
              Assigner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PermanenceAdmin;

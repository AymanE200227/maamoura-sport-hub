import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Check, Eye, EyeOff, Download, Upload, Users, Image, Volume2, VolumeX, RotateCcw, FolderArchive } from 'lucide-react';
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
  setBackgroundEnabled
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
import bgImage from '@/assets/bg.jpg';

const Parametres = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const userMode = getUserMode();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const soundInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  
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

  // Sound state
  const [soundEnabled, setSoundEnabled] = useState(isClickSoundEnabled());
  const [customSound, setCustomSound] = useState<string | null>(null);

  useEffect(() => {
    if (!userMode) {
      navigate('/');
    }
    if (userMode !== 'admin') {
      navigate('/accueil');
    }
  }, [userMode, navigate]);

  const handleChangeAdminPassword = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: 'Erreur',
        description: 'Tous les champs sont requis',
        variant: 'destructive'
      });
      return;
    }

    if (!verifyAdminPassword(currentPassword)) {
      toast({
        title: 'Erreur',
        description: 'Le mot de passe actuel est incorrect',
        variant: 'destructive'
      });
      return;
    }

    if (newPassword.length < 4) {
      toast({
        title: 'Erreur',
        description: 'Le nouveau mot de passe doit contenir au moins 4 caractères',
        variant: 'destructive'
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Erreur',
        description: 'Les mots de passe ne correspondent pas',
        variant: 'destructive'
      });
      return;
    }

    setAdminPassword(newPassword);
    
    toast({
      title: 'Succès',
      description: 'Le mot de passe administrateur a été modifié'
    });

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleChangeUserPassword = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUserPassword || !confirmUserPassword) {
      toast({
        title: 'Erreur',
        description: 'Tous les champs sont requis',
        variant: 'destructive'
      });
      return;
    }

    if (newUserPassword.length < 4) {
      toast({
        title: 'Erreur',
        description: 'Le mot de passe doit contenir au moins 4 caractères',
        variant: 'destructive'
      });
      return;
    }

    if (newUserPassword !== confirmUserPassword) {
      toast({
        title: 'Erreur',
        description: 'Les mots de passe ne correspondent pas',
        variant: 'destructive'
      });
      return;
    }

    setUserPassword(newUserPassword);
    
    toast({
      title: 'Succès',
      description: 'Le mot de passe utilisateur a été modifié'
    });

    setNewUserPassword('');
    setConfirmUserPassword('');
  };

  // ZIP Export (folder with files)
  const handleExportZip = async () => {
    setIsExporting(true);
    try {
      await exportToZip();
      toast({
        title: 'Export réussi',
        description: 'Archive ZIP créée avec tous les fichiers et données'
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: "Erreur lors de l'export",
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  // ZIP Import
  const handleImportZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const success = await importFromZip(file);
      if (success) {
        toast({
          title: 'Import réussi',
          description: 'Toutes les données ont été importées. Rechargement...'
        });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast({
          title: 'Erreur',
          description: "L'archive n'est pas valide",
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: "Erreur lors de l'import",
        variant: 'destructive'
      });
    }
  };

  // Legacy JSON export (backup)
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
    
    toast({
      title: 'Export réussi',
      description: 'Données exportées en JSON (sans fichiers séparés)'
    });
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (importAllData(content)) {
        toast({
          title: 'Import réussi',
          description: 'Toutes les données ont été importées. Rechargement...'
        });
        // Reload to apply changes
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast({
          title: 'Erreur',
          description: "Le fichier n'est pas valide",
          variant: 'destructive'
        });
      }
    };
    reader.readAsText(file);
  };

  // Background handlers
  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Erreur', description: 'Veuillez choisir une image', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const imageData = reader.result as string;
      setBackgroundImage(imageData);
      setCustomBg(imageData);
      toast({ title: 'Succès', description: 'Arrière-plan personnalisé appliqué' });
    };
    reader.readAsDataURL(file);
  };

  const handleToggleBg = () => {
    const newState = !bgEnabled;
    setBgEnabled(newState);
    setBackgroundEnabled(newState);
    toast({ 
      title: newState ? 'Arrière-plan activé' : 'Arrière-plan désactivé',
      description: newState ? 'L\'arrière-plan est maintenant visible' : 'L\'arrière-plan est masqué'
    });
  };

  const handleResetBg = () => {
    resetBackgroundImage();
    setCustomBg(null);
    toast({ title: 'Succès', description: 'Arrière-plan par défaut restauré' });
  };

  // Sound handlers
  const handleSoundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast({ title: 'Erreur', description: 'Veuillez choisir un fichier audio', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const soundData = reader.result as string;
      setClickSound(soundData);
      setCustomSound(soundData);
      toast({ title: 'Succès', description: 'Son de clic personnalisé appliqué' });
    };
    reader.readAsDataURL(file);
  };

  const handleToggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    setClickSoundEnabled(newState);
    toast({ 
      title: newState ? 'Son activé' : 'Son désactivé',
      description: newState ? 'Les sons de clic sont activés' : 'Les sons de clic sont désactivés'
    });
  };

  const handleResetSound = () => {
    resetClickSound();
    setCustomSound(null);
    toast({ title: 'Succès', description: 'Son de clic par défaut restauré' });
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

  const currentBgImage = bgEnabled ? (customBg || bgImage) : undefined;

  return (
    <Layout backgroundImage={currentBgImage}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Admin Password Section */}
        <div className="glass-card p-8 animate-fade-in">
          <h1 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Lock className="w-6 h-6 text-primary" />
            Mot de Passe Administrateur
          </h1>

          <form onSubmit={handleChangeAdminPassword} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">
                Mot de passe actuel
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="glass-input w-full pl-12 pr-12 py-3"
                  placeholder="Entrez le mot de passe actuel"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <Eye className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="glass-input w-full pl-12 pr-12 py-3"
                  placeholder="Entrez le nouveau mot de passe"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <Eye className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="glass-input w-full pl-12 pr-12 py-3"
                  placeholder="Confirmez le nouveau mot de passe"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <Eye className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full py-3 flex items-center justify-center gap-2">
              <Check className="w-5 h-5" />
              Enregistrer
            </button>
          </form>

          <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border/30">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Mot de passe par défaut: <code className="bg-muted px-2 py-0.5 rounded">admin123</code>
            </p>
          </div>
        </div>

        {/* User Password Section */}
        <div className="glass-card p-8 animate-fade-in">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Users className="w-6 h-6 text-accent" />
            Mot de Passe Utilisateur
          </h2>

          <form onSubmit={handleChangeUserPassword} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">
                Nouveau mot de passe utilisateur
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showNewUserPassword ? 'text' : 'password'}
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="glass-input w-full pl-12 pr-12 py-3"
                  placeholder="Nouveau mot de passe utilisateur"
                />
                <button
                  type="button"
                  onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                >
                  {showNewUserPassword ? (
                    <EyeOff className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <Eye className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showConfirmUserPassword ? 'text' : 'password'}
                  value={confirmUserPassword}
                  onChange={(e) => setConfirmUserPassword(e.target.value)}
                  className="glass-input w-full pl-12 pr-12 py-3"
                  placeholder="Confirmez le mot de passe"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmUserPassword(!showConfirmUserPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                >
                  {showConfirmUserPassword ? (
                    <EyeOff className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <Eye className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-success w-full py-3 flex items-center justify-center gap-2">
              <Check className="w-5 h-5" />
              Enregistrer
            </button>
          </form>

          <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border/30">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Mot de passe par défaut: <code className="bg-muted px-2 py-0.5 rounded">user123</code>
            </p>
          </div>
        </div>

        {/* Background Settings Section */}
        <div className="glass-card p-8 animate-fade-in">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Image className="w-6 h-6 text-primary" />
            Arrière-plan
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <p className="font-medium">Afficher l'arrière-plan</p>
                <p className="text-sm text-muted-foreground">Activer ou désactiver l'image de fond</p>
              </div>
              <button
                onClick={handleToggleBg}
                className={`w-14 h-8 rounded-full transition-colors relative ${bgEnabled ? 'bg-primary' : 'bg-muted'}`}
              >
                <div className={`w-6 h-6 bg-foreground rounded-full absolute top-1 transition-transform ${bgEnabled ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <label className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-5 h-5" />
                Changer l'arrière-plan
                <input
                  ref={bgInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBgUpload}
                  className="hidden"
                />
              </label>

              <button onClick={handleResetBg} className="btn-ghost flex-1 py-3 flex items-center justify-center gap-2 border border-border">
                <RotateCcw className="w-5 h-5" />
                Réinitialiser
              </button>
            </div>

            {customBg && (
              <div className="p-4 bg-success/10 rounded-lg border border-success/30">
                <p className="text-sm text-success">✓ Arrière-plan personnalisé actif</p>
              </div>
            )}
          </div>
        </div>

        {/* Sound Settings Section */}
        <div className="glass-card p-8 animate-fade-in">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            {soundEnabled ? <Volume2 className="w-6 h-6 text-primary" /> : <VolumeX className="w-6 h-6 text-muted-foreground" />}
            Son de Clic
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <p className="font-medium">Activer les sons</p>
                <p className="text-sm text-muted-foreground">Jouer un son lors des clics</p>
              </div>
              <button
                onClick={handleToggleSound}
                className={`w-14 h-8 rounded-full transition-colors relative ${soundEnabled ? 'bg-primary' : 'bg-muted'}`}
              >
                <div className={`w-6 h-6 bg-foreground rounded-full absolute top-1 transition-transform ${soundEnabled ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <label className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-5 h-5" />
                Changer le son
                <input
                  ref={soundInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleSoundUpload}
                  className="hidden"
                />
              </label>

              <button onClick={handleTestSound} className="btn-success flex-1 py-3 flex items-center justify-center gap-2">
                <Volume2 className="w-5 h-5" />
                Tester
              </button>

              <button onClick={handleResetSound} className="btn-ghost flex-1 py-3 flex items-center justify-center gap-2 border border-border">
                <RotateCcw className="w-5 h-5" />
                Réinitialiser
              </button>
            </div>
          </div>
        </div>

        {/* Export/Import Section */}
        <div className="glass-card p-8 animate-fade-in">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <FolderArchive className="w-6 h-6 text-primary" />
            Exporter / Importer Données
          </h2>

          <p className="text-muted-foreground mb-6">
            Exportez toutes les données sous forme d'archive ZIP contenant un dossier <strong>fichiers</strong> et un fichier <strong>data.json</strong>.
          </p>

          {/* ZIP Export/Import - Primary */}
          <div className="space-y-4">
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/30">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <FolderArchive className="w-4 h-4" />
                Export/Import Complet (ZIP)
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Archive ZIP avec dossier fichiers + data.json - idéal pour transfert entre PC
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={handleExportZip} 
                  disabled={isExporting}
                  className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  {isExporting ? 'Export en cours...' : 'Exporter ZIP'}
                </button>

                <label className="btn-success flex-1 py-3 flex items-center justify-center gap-2 cursor-pointer">
                  <Upload className="w-5 h-5" />
                  Importer ZIP
                  <input
                    ref={zipInputRef}
                    type="file"
                    accept=".zip"
                    onChange={handleImportZip}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* JSON Export/Import - Secondary */}
            <div className="p-4 bg-muted/30 rounded-lg border border-border/30">
              <h3 className="font-semibold mb-2 text-sm">Export JSON (backup simple)</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={handleExportData} className="btn-ghost flex-1 py-2 text-sm flex items-center justify-center gap-2 border border-border">
                  <Download className="w-4 h-4" />
                  JSON
                </button>

                <label className="btn-ghost flex-1 py-2 text-sm flex items-center justify-center gap-2 cursor-pointer border border-border">
                  <Upload className="w-4 h-4" />
                  Importer JSON
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportData}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-warning/10 rounded-lg border border-warning/30">
            <p className="text-sm text-warning">
              <strong>Attention:</strong> L'importation remplacera toutes les données existantes et rechargera l'application.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Parametres;

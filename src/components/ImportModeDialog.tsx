import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RefreshCw, GitMerge, Eye, Layers, FileText, AlertTriangle } from 'lucide-react';

export type ImportMode = 'merge' | 'replace' | 'preview';

interface ImportModeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (mode: ImportMode) => void;
  stats?: {
    stages: number;
    types: number;
    lecons: number;
    files: number;
  };
}

const modes = [
  {
    id: 'merge' as ImportMode,
    title: 'Fusionner',
    description: 'Ajoute les nouvelles données, remplace les fichiers existants par nom',
    icon: GitMerge,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30',
    details: [
      'Conserve les données existantes',
      'Ajoute les nouveaux stages/types/leçons',
      'Remplace les fichiers avec le même nom'
    ]
  },
  {
    id: 'replace' as ImportMode,
    title: 'Remplacer tout',
    description: 'Supprime toutes les données et importe depuis zéro',
    icon: RefreshCw,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30',
    warning: true,
    details: [
      'Supprime TOUTES les données actuelles',
      'Importe uniquement le contenu du dossier',
      'Irréversible sans sauvegarde'
    ]
  },
  {
    id: 'preview' as ImportMode,
    title: 'Prévisualiser',
    description: 'Voir ce qui sera importé avant de confirmer',
    icon: Eye,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30',
    details: [
      'Affiche la structure du dossier',
      'Permet de vérifier avant d\'importer',
      'Choix du mode après prévisualisation'
    ]
  }
];

export default function ImportModeDialog({ 
  open, 
  onOpenChange, 
  onSelect, 
  stats 
}: ImportModeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Mode d'importation
          </DialogTitle>
          <DialogDescription>
            Choisissez comment importer les données du dossier sélectionné
          </DialogDescription>
        </DialogHeader>
        
        {/* Stats Preview */}
        {stats && (
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg text-sm">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-primary" />
              <span>{stats.stages} stages</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-amber-500" />
              <span>{stats.types} types</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-500" />
              <span>{stats.lecons} leçons</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-purple-500" />
              <span>{stats.files} fichiers</span>
            </div>
          </div>
        )}
        
        {/* Mode Options */}
        <div className="grid gap-3 mt-2">
          {modes.map(mode => (
            <button
              key={mode.id}
              onClick={() => {
                onSelect(mode.id);
                onOpenChange(false);
              }}
              className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${mode.bgColor}`}
            >
              <div className={`p-2 rounded-lg ${mode.color} bg-current/10`}>
                <mode.icon className={`w-6 h-6 ${mode.color}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{mode.title}</h3>
                  {mode.warning && (
                    <span className="flex items-center gap-1 text-xs text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                      <AlertTriangle className="w-3 h-3" />
                      Attention
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{mode.description}</p>
                <ul className="mt-2 space-y-1">
                  {mode.details.map((detail, idx) => (
                    <li key={idx} className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-current" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

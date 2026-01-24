import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export type ImportProgressPhase = 'parsing' | 'importing';

export interface ImportProgressState {
  open: boolean;
  phase: ImportProgressPhase;
  processed: number;
  total: number;
  current?: string;
}

const phaseLabel: Record<ImportProgressPhase, string> = {
  parsing: 'Analyse du dossier…',
  importing: 'Import des données…',
};

export default function ImportProgressOverlay({ open, phase, processed, total, current }: ImportProgressState) {
  if (!open) return null;
  const pct = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-background/70 backdrop-blur-sm">
      <div className="glass-card w-[min(640px,calc(100vw-2rem))] p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{phaseLabel[phase]}</p>
            <p className="text-sm text-muted-foreground">
              {processed}/{total} ({pct}%)
            </p>
          </div>
        </div>

        <div className="mt-4">
          <Progress value={pct} />
          {current ? (
            <p className="mt-2 text-xs text-muted-foreground truncate" title={current}>
              {current}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

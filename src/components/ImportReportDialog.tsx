import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ImportReport } from '@/lib/folderParser';

interface ImportReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ImportReport | null;
}

const StatRow = ({ label, value }: { label: string; value: number | string }) => (
  <div className="flex items-center justify-between gap-4 py-2 border-b border-border/40 last:border-b-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-medium tabular-nums">{value}</span>
  </div>
);

export default function ImportReportDialog({ open, onOpenChange, report }: ImportReportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Rapport d'import</DialogTitle>
          <DialogDescription>
            {report ? `Durée: ${Math.round(report.durationMs / 1000)}s • Fichiers importés: ${report.files.imported}` : '—'}
          </DialogDescription>
        </DialogHeader>

        {!report ? (
          <div className="text-sm text-muted-foreground">Aucun rapport disponible.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold mb-2">Structure</h3>
              <StatRow label="Stages (créés)" value={report.stages.created} />
              <StatRow label="Stages (existants)" value={report.stages.matched} />
              <StatRow label="Types (créés)" value={report.types.created} />
              <StatRow label="Types (existants)" value={report.types.matched} />
              <StatRow label="Leçons (créées)" value={report.lecons.created} />
              <StatRow label="Leçons (existantes)" value={report.lecons.matched} />
              <StatRow label="Titres (créés)" value={report.headings.created} />
              <StatRow label="Titres (existants)" value={report.headings.matched} />
            </div>

            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold mb-2">Fichiers</h3>
              <StatRow label="Ajoutés" value={report.files.created} />
              <StatRow label="Remplacés" value={report.files.replaced} />
              <StatRow label="Importés (total)" value={report.files.imported} />
              <StatRow label="Erreurs" value={report.files.errors} />

              {report.warnings.length > 0 ? (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2">Avertissements</h4>
                  <div className="max-h-40 overflow-auto rounded-md border border-border/40 bg-muted/20 p-3">
                    <ul className="list-disc pl-5 space-y-1">
                      {report.warnings.map((w, idx) => (
                        <li key={idx} className="text-xs text-muted-foreground">
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

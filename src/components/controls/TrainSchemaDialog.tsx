import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Train } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Wagon {
  position_voiture: number;
  numero_voiture?: string;
  numero_ordre_voiture?: number;
  categorie_voiture?: string;
  classe_voiture?: string | number;
  sous_type_materiel?: string;
}

interface TrainSchemaDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  trainNumber: string;
  date: string;
}

function getWagonStyle(w: Wagon): { bg: string; label: string; short: string } {
  const cat = (w.categorie_voiture ?? '').toUpperCase();
  const cls = String(w.classe_voiture ?? '');

  if (cat.includes('LOCO') || cat.includes('MOTRICE')) return { bg: 'bg-gray-700 text-white',       label: 'Loco',         short: 'L' };
  if (cat.includes('BAR')  || cat.includes('RESTAUR'))  return { bg: 'bg-yellow-400 text-yellow-900', label: 'Bar',          short: 'B' };
  if (cat.includes('SPEC'))                              return { bg: 'bg-purple-400 text-white',      label: 'Spéciale',     short: 'S' };
  if (cls === '1')                                        return { bg: 'bg-blue-500 text-white',        label: '1ère cl.',     short: '1' };
  if (cls === '2')                                        return { bg: 'bg-green-500 text-white',       label: '2ème cl.',     short: '2' };
  if (cat.includes('VB2N') || cat.includes('CORAIL'))    return { bg: 'bg-slate-400 text-white',        label: cat,            short: '?' };
  return { bg: 'bg-slate-300 text-slate-800', label: cat || '?', short: '?' };
}

export function TrainSchemaDialog({ open, onOpenChange, trainNumber, date }: TrainSchemaDialogProps) {
  const [wagons, setWagons]     = useState<Wagon[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!open || !trainNumber) return;
    setLoading(true);
    setError(null);
    setWagons([]);

    const num = trainNumber.replace(/\D/g, '');
    fetch(`/api/sncf-composition?trainNumber=${encodeURIComponent(num)}&date=${encodeURIComponent(date)}`)
      .then(r => r.json())
      .then(data => {
        const records: Wagon[] = (data.results ?? data.records ?? []).map((r: any) => r.record?.fields ?? r);
        if (records.length === 0) setError('Aucune composition disponible pour ce train.');
        else setWagons(records.sort((a, b) => (a.position_voiture ?? 0) - (b.position_voiture ?? 0)));
      })
      .catch(() => setError('Erreur lors du chargement de la composition.'))
      .finally(() => setLoading(false));
  }, [open, trainNumber, date]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Train className="h-4 w-4" />
            Schéma train {trainNumber}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement de la composition…
          </div>
        )}

        {error && !isLoading && (
          <p className="text-sm text-muted-foreground text-center py-8">{error}</p>
        )}

        {!isLoading && wagons.length > 0 && (
          <div className="space-y-4">
            {/* Schéma horizontal */}
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {/* Sens de marche */}
              <div className="flex flex-col items-center shrink-0 mr-1">
                <span className="text-[10px] text-muted-foreground">Tête</span>
                <span className="text-lg">→</span>
              </div>
              {wagons.map((w, i) => {
                const { bg, label, short } = getWagonStyle(w);
                return (
                  <div key={i} className="flex flex-col items-center gap-0.5 shrink-0">
                    {/* Wagon block */}
                    <div
                      className={cn(
                        'w-10 h-14 rounded-sm flex flex-col items-center justify-center border border-black/10 text-xs font-bold',
                        bg
                      )}
                      title={label}
                    >
                      <span className="text-[10px] opacity-70">{w.numero_voiture ?? w.numero_ordre_voiture ?? ''}</span>
                      <span>{short}</span>
                    </div>
                    <span className="text-[9px] text-muted-foreground leading-none">{w.position_voiture}</span>
                  </div>
                );
              })}
              <div className="flex flex-col items-center shrink-0 ml-1">
                <span className="text-[10px] text-muted-foreground">Queue</span>
              </div>
            </div>

            {/* Légende */}
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                { bg: 'bg-blue-500', label: '1ère classe' },
                { bg: 'bg-green-500', label: '2ème classe' },
                { bg: 'bg-yellow-400', label: 'Bar / Restaurant' },
                { bg: 'bg-purple-400', label: 'Spéciale' },
                { bg: 'bg-gray-700', label: 'Locomotive' },
              ].map(({ bg, label }) => (
                <div key={label} className="flex items-center gap-1">
                  <div className={cn('w-3 h-3 rounded-sm', bg)} />
                  <span className="text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>

            {/* Tableau détail */}
            <div className="max-h-48 overflow-y-auto rounded border text-xs">
              <table className="w-full">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="text-left px-2 py-1">Pos.</th>
                    <th className="text-left px-2 py-1">N°</th>
                    <th className="text-left px-2 py-1">Catégorie</th>
                    <th className="text-left px-2 py-1">Classe</th>
                  </tr>
                </thead>
                <tbody>
                  {wagons.map((w, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1">{w.position_voiture}</td>
                      <td className="px-2 py-1">{w.numero_voiture ?? w.numero_ordre_voiture ?? '—'}</td>
                      <td className="px-2 py-1">{w.categorie_voiture ?? '—'}</td>
                      <td className="px-2 py-1">{w.classe_voiture ? `${w.classe_voiture}ère/ème` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

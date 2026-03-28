import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Train, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TrainInfo } from '@/hooks/useTrainLookup';

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
  /** Données déjà chargées via Info SNCF — utilisées comme fallback si pas de composition */
  trainInfo?: TrainInfo | null;
}

function getWagonStyle(w: Wagon): { bg: string; label: string; short: string } {
  const cat = (w.categorie_voiture ?? '').toUpperCase();
  const cls = String(w.classe_voiture ?? '');

  if (cat.includes('LOCO') || cat.includes('MOTRICE')) return { bg: 'bg-gray-700 text-white',       label: 'Loco',     short: 'L' };
  if (cat.includes('BAR')  || cat.includes('RESTAUR'))  return { bg: 'bg-yellow-400 text-yellow-900', label: 'Bar',      short: 'B' };
  if (cat.includes('SPEC'))                              return { bg: 'bg-purple-400 text-white',      label: 'Spéc.',    short: 'S' };
  if (cls === '1')                                        return { bg: 'bg-blue-500 text-white',        label: '1ère cl.', short: '1' };
  if (cls === '2')                                        return { bg: 'bg-green-500 text-white',       label: '2ème cl.', short: '2' };
  return { bg: 'bg-slate-300 text-slate-800', label: cat || '?', short: '?' };
}

// ── Vue itinéraire (fallback quand pas de composition) ────────────────────────

function StopsFallback({ stops, origin, destination }: { stops: TrainInfo['stops']; origin: string; destination: string }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Composition non disponible pour ce train. Itinéraire :
      </p>
      <div>
        {stops.map((stop, i) => (
          <div key={i} className="flex items-stretch gap-3">
            <div className="flex flex-col items-center w-5 shrink-0">
              <div className={cn(
                'w-3 h-3 rounded-full border-2 mt-[14px] shrink-0',
                i === 0 || i === stops.length - 1
                  ? 'border-primary bg-primary'
                  : 'border-muted-foreground/50 bg-background'
              )} />
              {i < stops.length - 1 && <div className="flex-1 w-0.5 bg-border" />}
            </div>
            <div className="flex-1 pb-3 pt-2">
              <div className="flex items-center justify-between gap-2">
                <span className={cn(
                  'text-sm leading-tight',
                  i === 0 || i === stops.length - 1 ? 'font-semibold' : 'text-muted-foreground'
                )}>
                  {stop.name}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {stop.platform && (
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" />V{stop.platform}
                    </span>
                  )}
                  <span className="text-sm font-mono tabular-nums text-muted-foreground">
                    {stop.departureTime || stop.arrivalTime}
                  </span>
                  {stop.isDelayed && stop.delayMinutes && (
                    <span className="text-xs font-bold text-amber-600">+{stop.delayMinutes} min</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── TrainSchemaDialog ─────────────────────────────────────────────────────────

export function TrainSchemaDialog({ open, onOpenChange, trainNumber, date, trainInfo }: TrainSchemaDialogProps) {
  const [wagons,    setWagons]    = useState<Wagon[]>([]);
  const [isLoading, setLoading]  = useState(false);
  const [fallback,  setFallback] = useState<TrainInfo | null>(null);

  useEffect(() => {
    if (!open || !trainNumber) return;
    setLoading(true);
    setWagons([]);
    setFallback(null);

    const num = trainNumber.replace(/\D/g, '');
    fetch(`/api/sncf-composition?trainNumber=${encodeURIComponent(num)}&date=${encodeURIComponent(date)}`)
      .then(r => r.json())
      .then(data => {
        const records: Wagon[] = (data.results ?? data.records ?? []).map((r: any) => r.record?.fields ?? r);
        if (records.length > 0) {
          setWagons(records.sort((a, b) => (a.position_voiture ?? 0) - (b.position_voiture ?? 0)));
        } else {
          // Pas de composition → fallback : utiliser trainInfo passé en prop, sinon appeler l'API lookup
          if (trainInfo?.stops?.length) {
            setFallback(trainInfo);
          } else {
            return fetch(`/api/sncf-lookup?trainNumber=${encodeURIComponent(num)}&date=${encodeURIComponent(date)}`)
              .then(r => r.json())
              .then(json => {
                const journey = json.vehicle_journeys?.[0];
                if (!journey) return;
                const rawStops = journey.stop_times ?? [];
                if (rawStops.length < 2) return;
                const stops = rawStops.map((s: any) => ({
                  name:          (s.stop_point?.name ?? '').replace(/\s*\([^)]*\)/, '').trim(),
                  departureTime: parseHHMM(s.departure_time),
                  arrivalTime:   parseHHMM(s.arrival_time),
                  platform:      s.stop_point?.platform_code ?? undefined,
                  isDelayed:     s.departure_status === 'delayed',
                }));
                setFallback({
                  origin:      stops[0].name,
                  destination: stops[stops.length - 1].name,
                  departureTime: stops[0].departureTime,
                  stops,
                  status: 'unknown',
                } as TrainInfo);
              });
          }
        }
      })
      .catch(() => {
        // Même en cas d'erreur réseau, utiliser le trainInfo prop si dispo
        if (trainInfo?.stops?.length) setFallback(trainInfo);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, trainNumber, date]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Train className="h-4 w-4" />
            Train {trainNumber}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement…
          </div>
        )}

        {/* ── Composition disponible ── */}
        {!isLoading && wagons.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              <div className="flex flex-col items-center shrink-0 mr-1">
                <span className="text-[10px] text-muted-foreground">Tête</span>
                <span className="text-lg">→</span>
              </div>
              {wagons.map((w, i) => {
                const { bg, label, short } = getWagonStyle(w);
                return (
                  <div key={i} className="flex flex-col items-center gap-0.5 shrink-0">
                    <div
                      className={cn('w-10 h-14 rounded-sm flex flex-col items-center justify-center border border-black/10 text-xs font-bold', bg)}
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
                      <td className="px-2 py-1">{w.classe_voiture ? `${w.classe_voiture}ème cl.` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Fallback itinéraire ── */}
        {!isLoading && wagons.length === 0 && fallback?.stops?.length && (
          <StopsFallback stops={fallback.stops} origin={fallback.origin} destination={fallback.destination} />
        )}

        {/* ── Aucune donnée ── */}
        {!isLoading && wagons.length === 0 && !fallback?.stops?.length && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Aucune donnée disponible pour ce train.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function parseHHMM(hhmmss: string | undefined): string {
  if (!hhmmss || hhmmss.length < 4) return '';
  const h = Math.floor(parseInt(hhmmss.slice(0, 2))) % 24;
  const m = hhmmss.slice(2, 4);
  return `${String(h).padStart(2, '0')}:${m}`;
}

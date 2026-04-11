import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Train, MapPin, AlertTriangle } from 'lucide-react';
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

function TimeDisplay({ label, time, baseTime, isDelayed }: { label: string; time?: string; baseTime?: string; isDelayed?: boolean }) {
  if (!time) return null;
  const hasDelay = isDelayed && baseTime && baseTime !== time;
  return (
    <div className="text-right leading-tight">
      <span className="text-[10px] text-muted-foreground/60 uppercase">{label}</span>
      <div className="flex items-center gap-1 justify-end">
        {hasDelay && (
          <span className="text-xs font-mono tabular-nums text-muted-foreground/50 line-through">{baseTime}</span>
        )}
        <span className={cn('text-xs font-mono tabular-nums', hasDelay ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-muted-foreground')}>
          {time}
        </span>
      </div>
    </div>
  );
}

function StopsFallback({ stops, origin, destination }: { stops: TrainInfo['stops']; origin: string; destination: string }) {
  const hasAnyDelay = stops.some(s => s.isDelayed);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Composition non disponible pour ce train. Itinéraire :
        </p>
        {hasAnyDelay && (
          <Badge variant="outline" className="text-amber-600 border-amber-300 gap-1 text-[10px]">
            <AlertTriangle className="h-3 w-3" />
            Retard
          </Badge>
        )}
      </div>
      <div>
        {stops.map((stop, i) => {
          const isFirst = i === 0;
          const isLast = i === stops.length - 1;
          const isTerminal = isFirst || isLast;
          return (
            <div key={i} className="flex items-stretch gap-3">
              <div className="flex flex-col items-center w-5 shrink-0">
                <div className={cn(
                  'w-3 h-3 rounded-full border-2 mt-[14px] shrink-0',
                  stop.isDelayed
                    ? 'border-amber-500 bg-amber-500'
                    : isTerminal
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground/50 bg-background'
                )} />
                {i < stops.length - 1 && <div className="flex-1 w-0.5 bg-border" />}
              </div>
              <div className={cn('flex-1 pb-3 pt-2', stop.isDelayed && 'bg-amber-50/50 dark:bg-amber-900/10 -mx-1 px-1 rounded')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={cn(
                      'text-sm leading-tight',
                      isTerminal ? 'font-semibold' : 'text-muted-foreground'
                    )}>
                      {stop.name}
                    </span>
                    {stop.platform && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 shrink-0">
                        <MapPin className="h-2.5 w-2.5" />V{stop.platform}
                      </span>
                    )}
                    {stop.isDelayed && stop.delayMinutes && (
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 shrink-0">+{stop.delayMinutes}min</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!isFirst && (
                      <TimeDisplay label="arr." time={stop.arrivalTime} baseTime={stop.baseArrivalTime} isDelayed={stop.isDelayed} />
                    )}
                    {!isLast && (
                      <TimeDisplay label="dép." time={stop.departureTime} baseTime={stop.baseDepartureTime} isDelayed={stop.isDelayed} />
                    )}
                    {isFirst && !stop.arrivalTime && (
                      <TimeDisplay label="dép." time={stop.departureTime} baseTime={stop.baseDepartureTime} isDelayed={stop.isDelayed} />
                    )}
                    {isLast && !stop.departureTime && (
                      <TimeDisplay label="arr." time={stop.arrivalTime} baseTime={stop.baseArrivalTime} isDelayed={stop.isDelayed} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
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
                const stops = rawStops.map((s: any) => {
                  const isDelayed = s.departure_status === 'delayed';
                  const depTime = parseHHMM(s.departure_time);
                  const arrTime = parseHHMM(s.arrival_time);
                  const baseDep = isDelayed && s.base_departure_time ? parseHHMM(s.base_departure_time) : undefined;
                  const baseArr = isDelayed && s.base_arrival_time ? parseHHMM(s.base_arrival_time) : undefined;
                  let delayMinutes: number | undefined;
                  if (isDelayed && s.base_departure_time && s.departure_time) {
                    const d = toMinutes(s.departure_time) - toMinutes(s.base_departure_time);
                    if (d > 0) delayMinutes = d;
                  }
                  return {
                    name:          (s.stop_point?.name ?? '').replace(/\s*\([^)]*\)/, '').trim(),
                    departureTime: depTime,
                    arrivalTime:   arrTime,
                    baseDepartureTime: baseDep && baseDep !== depTime ? baseDep : undefined,
                    baseArrivalTime:   baseArr && baseArr !== arrTime ? baseArr : undefined,
                    platform:      s.stop_point?.platform_code ?? undefined,
                    isDelayed,
                    delayMinutes,
                  };
                });
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

function toMinutes(hhmmss: string): number {
  return parseInt(hhmmss.slice(0, 2)) * 60 + parseInt(hhmmss.slice(2, 4));
}

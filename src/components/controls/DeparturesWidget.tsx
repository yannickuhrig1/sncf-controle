import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
  LocateFixed,
  MapPin,
  RefreshCw,
  Search,
  XCircle,
  Train,
  Clock,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useStationDepartures, DepartureEntry, nowMinus1hDatetime, nextDatetimeAfterLast } from '@/hooks/useStationDepartures';
import { useTrainLookup, formatDuration } from '@/hooks/useTrainLookup';
import { format } from 'date-fns';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────────────────

interface StopTime {
  name:              string;
  arrivalTime:       string;
  departureTime:     string;
  baseArrivalTime:   string | null;
  baseDepartureTime: string | null;
  platform:          string | null;
  isDelayed:         boolean;
  delayMinutes:      number | null;
}

interface NearbyStation { id: string; name: string; distance: number; }

// ── Helpers ────────────────────────────────────────────────────────────────────

function getModeColors(mode: 'departures' | 'arrivals') {
  return mode === 'departures'
    ? { border: 'border-l-4 border-l-blue-500', bg: 'bg-blue-50/50 dark:bg-blue-950/15', hoverBg: 'hover:bg-blue-100/60 dark:hover:bg-blue-950/25', time: 'text-blue-700 dark:text-blue-300' }
    : { border: 'border-l-4 border-l-green-500', bg: 'bg-green-50/50 dark:bg-green-950/15', hoverBg: 'hover:bg-green-100/60 dark:hover:bg-green-950/25', time: 'text-green-700 dark:text-green-300' };
}

function occupancyLabel(occ: string | undefined): { label: string; cls: string } | null {
  switch (occ) {
    case 'empty':
    case 'many_seats_available':       return { label: 'Peu chargé',  cls: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-300'  };
    case 'few_seats_available':        return { label: 'Chargé',      cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' };
    case 'standing_room_only':
    case 'crushed_standing_room_only': return { label: 'Très chargé', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' };
    case 'full':                       return { label: 'Complet',     cls: 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-300'    };
    default: return null;
  }
}

// ── TrainHeader ────────────────────────────────────────────────────────────────

function TrainHeader({ dep, mode }: { dep: DepartureEntry; mode: 'departures' | 'arrivals' }) {
  const mc  = getModeColors(mode);
  const occ = occupancyLabel(dep.occupancy);
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl ${mc.bg} ${mc.border}`}>
      <div className="w-14 shrink-0 text-center">
        {dep.delayMinutes > 0 ? (
          <>
            <div className="text-xs tabular-nums text-muted-foreground/60 line-through">
              {dep.scheduledTime}
            </div>
            <div className="text-sm font-bold tabular-nums text-amber-600 dark:text-amber-400">
              {dep.realTime}
            </div>
            <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
              +{dep.delayMinutes} min
            </div>
          </>
        ) : (
          <div className={`text-sm font-bold tabular-nums ${dep.status === 'cancelled' ? 'line-through text-muted-foreground' : mc.time}`}>
            {dep.scheduledTime}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {dep.trainType && (
            <Badge variant="outline" className="text-xs h-5 px-1.5 font-medium border-muted-foreground/30">
              {dep.trainType}
            </Badge>
          )}
          <span className="text-sm font-semibold">{dep.trainNumber}</span>
          {dep.platform && (
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <MapPin className="h-3 w-3" />V{dep.platform}
            </span>
          )}
          {occ && (
            <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${occ.cls}`}>
              {occ.label}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 truncate">
          {mode === 'arrivals' ? '← ' : '→ '}{dep.direction}
        </div>
        {dep.delayReason && (
          <div className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 italic truncate">
            {dep.delayReason}
          </div>
        )}
      </div>
      <div className="shrink-0">
        {dep.status === 'on_time'   && <CheckCircle2 className="h-5 w-5 text-green-500" />}
        {dep.status === 'delayed'   && <AlertTriangle className="h-5 w-5 text-amber-500" />}
        {dep.status === 'cancelled' && <XCircle       className="h-5 w-5 text-red-500" />}
      </div>
    </div>
  );
}

// ── TrainNumberSearch ──────────────────────────────────────────────────────────

function TrainNumberSearch() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [trainNumber, setTrainNumber] = useState('');
  const [date,        setDate]        = useState(today);
  const { lookup, isLoading, trainInfo, error } = useTrainLookup();

  const handleSearch = () => {
    if (!trainNumber.trim()) { toast.error('Saisissez un numéro de train'); return; }
    lookup(trainNumber.trim(), date);
  };

  const OCCUPANCY_LABELS: Record<string, { label: string; cls: string }> = {
    empty:                      { label: 'Vide',            cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
    many_seats_available:       { label: 'Peu chargé',      cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
    few_seats_available:        { label: 'Chargé',          cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
    standing_room_only:         { label: 'Très chargé',     cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
    crushed_standing_room_only: { label: 'Bondé',           cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
    not_accepting_passengers:   { label: 'Accès refusé',    cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  };

  return (
    <div className="space-y-4">
      {/* Inputs */}
      <div className="flex gap-2">
        <Input
          placeholder="N° train (ex : 88524)"
          value={trainNumber}
          inputMode="numeric"
          onChange={e => setTrainNumber(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          className="flex-1"
        />
        <Input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-36 shrink-0"
        />
        <Button type="button" size="icon" onClick={handleSearch} disabled={isLoading || !trainNumber.trim()}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {error && !isLoading && (
        <p className="text-sm text-destructive text-center py-4">{error}</p>
      )}

      {trainInfo && (
        <div className="space-y-3">
          {/* En-tête train */}
          <div className="flex items-center gap-2 flex-wrap p-3 bg-muted/40 rounded-xl border">
            <Train className="h-4 w-4 text-muted-foreground shrink-0" />
            {trainInfo.trainType && (
              <Badge variant="outline" className="text-xs h-5 px-1.5 font-medium border-muted-foreground/30">
                {trainInfo.trainType}
              </Badge>
            )}
            <span className="font-semibold text-sm">{trainNumber.trim()}</span>
            <span className="text-sm text-muted-foreground">{trainInfo.origin} → {trainInfo.destination}</span>
            {/* Statut */}
            {trainInfo.status === 'on_time'   && <Badge className="bg-green-100 text-green-700 border-0 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />À l'heure</Badge>}
            {trainInfo.status === 'delayed'   && <Badge className="bg-amber-100 text-amber-700 border-0 text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Retard {trainInfo.delayMinutes ? `+${trainInfo.delayMinutes} min` : ''}</Badge>}
            {trainInfo.status === 'cancelled' && <Badge className="bg-red-500 text-white border-0 text-xs"><XCircle className="h-3 w-3 mr-1" />Supprimé</Badge>}
          </div>

          {/* Méta : durée, occupation */}
          <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground px-1">
            {trainInfo.journeyDuration && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Durée : {formatDuration(trainInfo.journeyDuration)}
              </span>
            )}
            {trainInfo.occupancy && (() => {
              const occ = OCCUPANCY_LABELS[trainInfo.occupancy!];
              return occ ? (
                <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md font-medium ${occ.cls}`}>
                  <Users className="h-3 w-3" />{occ.label}
                </span>
              ) : (
                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{trainInfo.occupancy}</span>
              );
            })()}
            {trainInfo.disruptionReason && (
              <span className="text-amber-600 dark:text-amber-400 italic">{trainInfo.disruptionReason}</span>
            )}
          </div>

          {/* Liste des arrêts */}
          <div>
            {trainInfo.stops.map((stop, i) => {
              const isFirst = i === 0;
              const isLast = i === trainInfo.stops.length - 1;
              const isTerminal = isFirst || isLast;
              return (
              <div key={i} className="flex items-stretch gap-3">
                <div className="flex flex-col items-center w-5 shrink-0">
                  <div className={`w-3 h-3 rounded-full border-2 mt-[14px] shrink-0 ${
                    stop.isDelayed
                      ? 'border-amber-500 bg-amber-500'
                      : isTerminal
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground/50 bg-background'
                  }`} />
                  {i < trainInfo.stops.length - 1 && <div className="flex-1 w-0.5 bg-border" />}
                </div>
                <div className={`flex-1 pb-3 pt-2 ${stop.isDelayed ? 'bg-amber-50/50 dark:bg-amber-900/10 -mx-1 px-1 rounded' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`text-sm leading-tight ${
                        isTerminal ? 'font-semibold' : 'text-muted-foreground'
                      }`}>
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
                      {!isFirst && stop.arrivalTime && (
                        <div className="text-right leading-tight">
                          <span className="text-[10px] text-muted-foreground/60 uppercase">arr.</span>
                          <div className="flex items-center gap-1 justify-end">
                            {stop.baseArrivalTime && (
                              <span className="text-xs font-mono tabular-nums text-muted-foreground/50 line-through">{stop.baseArrivalTime}</span>
                            )}
                            <span className={`text-xs font-mono tabular-nums ${stop.isDelayed && stop.baseArrivalTime ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-muted-foreground'}`}>
                              {stop.arrivalTime}
                            </span>
                          </div>
                        </div>
                      )}
                      {!isLast && stop.departureTime && (
                        <div className="text-right leading-tight">
                          <span className="text-[10px] text-muted-foreground/60 uppercase">dép.</span>
                          <div className="flex items-center gap-1 justify-end">
                            {stop.baseDepartureTime && (
                              <span className="text-xs font-mono tabular-nums text-muted-foreground/50 line-through">{stop.baseDepartureTime}</span>
                            )}
                            <span className={`text-xs font-mono tabular-nums ${stop.isDelayed && stop.baseDepartureTime ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-muted-foreground'}`}>
                              {stop.departureTime}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── DeparturesWidget ───────────────────────────────────────────────────────────

export function DeparturesWidget({ showTrainSearch = false }: { showTrainSearch?: boolean }) {
  const [searchMode,        setSearchMode]        = useState<'station' | 'train'>('station');
  const [station,           setStation]           = useState('');
  const [mode,              setMode]              = useState<'departures' | 'arrivals'>('departures');
  const [selected,          setSelected]          = useState<DepartureEntry | null>(null);
  const [stops,             setStops]             = useState<StopTime[]>([]);
  const [stopsLoading,      setStopsLoading]      = useState(false);
  const [stopsError,        setStopsError]        = useState<string | null>(null);
  const [isLocating,        setIsLocating]        = useState(false);
  const [nearbySuggestions, setNearbySuggestions] = useState<NearbyStation[]>([]);
  const [fromDatetime,      setFromDatetime]      = useState('');

  const { fetchDepartures, isLoading, error, departures, stationName } = useStationDepartures();

  const load = () => {
    setNearbySuggestions([]);
    if (!station.trim()) return;
    const dt = nowMinus1hDatetime();
    setFromDatetime(dt);
    fetchDepartures(station, dt, mode);
  };

  const loadMore = () => {
    if (!station.trim() || departures.length === 0) return;
    const lastDep = departures[departures.length - 1];
    const nextDt = nextDatetimeAfterLast(fromDatetime, lastDep.scheduledTime);
    fetchDepartures(station, nextDt, mode, true);
  };

  const handleLocate = () => {
    if (!navigator.geolocation) {
      toast.error('Géolocalisation non disponible sur cet appareil');
      return;
    }
    setIsLocating(true);
    setNearbySuggestions([]);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lon } = pos.coords;
          const res = await fetch(`/api/sncf-nearby?lat=${lat}&lon=${lon}&count=5`);
          if (!res.ok) throw new Error(`Erreur API (${res.status})`);
          const json = await res.json();
          const stations: NearbyStation[] = json.stations ?? [];
          if (stations.length === 0) {
            toast.error('Aucune gare trouvée à proximité');
          } else {
            setNearbySuggestions(stations);
          }
        } catch {
          toast.error('Impossible de trouver les gares à proximité');
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error('Accès à la localisation refusé');
        } else {
          toast.error('Impossible d\'obtenir votre position');
        }
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  const selectNearbySuggestion = (s: NearbyStation) => {
    setStation(s.name);
    setNearbySuggestions([]);
    const dt = nowMinus1hDatetime();
    setFromDatetime(dt);
    fetchDepartures(s.name, dt, mode);
  };

  useEffect(() => {
    if (stationName) {
      const dt = nowMinus1hDatetime();
      setFromDatetime(dt);
      fetchDepartures(station, dt, mode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const handleSelectTrain = async (dep: DepartureEntry) => {
    setSelected(dep);
    setStops([]);
    setStopsError(null);
    if (!dep.vehicleJourneyId) return;
    setStopsLoading(true);
    try {
      const res = await fetch(`/api/sncf-journey?id=${encodeURIComponent(dep.vehicleJourneyId)}`);
      if (!res.ok) throw new Error(`Erreur API (${res.status})`);
      const json = await res.json();
      setStops(json.stops ?? []);
    } catch (e) {
      setStopsError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setStopsLoading(false);
    }
  };

  const handleBack = () => { setSelected(null); setStops([]); setStopsError(null); };

  const handleStopClick = (stopName: string) => {
    setStation(stopName);
    setSelected(null);
    setStops([]);
    setStopsError(null);
    const dt = nowMinus1hDatetime();
    setFromDatetime(dt);
    fetchDepartures(stopName, dt, mode);
  };

  /* ── Vue détail d'un train ──────────────────────────────────────────────── */
  if (selected) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour aux {mode === 'departures' ? 'départs' : 'arrivées'}
        </button>
        <TrainHeader dep={selected} mode={mode} />
        {stopsLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {stopsError && (
          <p className="text-sm text-destructive text-center py-4">{stopsError}</p>
        )}
        {!stopsLoading && !stopsError && stops.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {selected.vehicleJourneyId ? 'Arrêts non disponibles' : 'Détail non disponible pour ce train'}
          </p>
        )}
        {stops.length > 0 && (
          <div>
            {stops.map((stop, i) => {
              const isFirst = i === 0;
              const isLast = i === stops.length - 1;
              const isTerminal = isFirst || isLast;
              const sn = stationName.toLowerCase();
              const isCurrentStation = sn && (
                stop.name.toLowerCase().includes(sn) ||
                sn.includes(stop.name.toLowerCase())
              );
              return (
                <div key={i} className="flex items-stretch gap-3">
                  <div className="flex flex-col items-center w-5 shrink-0">
                    <div className={`w-3 h-3 rounded-full border-2 mt-[14px] shrink-0 ${
                      isCurrentStation
                        ? 'border-blue-500 bg-blue-500 ring-2 ring-blue-300 dark:ring-blue-700'
                        : stop.isDelayed
                          ? 'border-amber-500 bg-amber-500'
                          : isTerminal
                            ? 'border-primary bg-primary'
                            : 'border-muted-foreground/50 bg-background'
                    }`} />
                    {i < stops.length - 1 && <div className="flex-1 w-0.5 bg-border" />}
                  </div>
                  <div className={`flex-1 pb-3 pt-2 -mx-1 px-1 rounded ${isCurrentStation ? 'bg-blue-50/70 dark:bg-blue-900/20' : stop.isDelayed ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <button
                          type="button"
                          className={`text-sm leading-tight text-left hover:underline transition-colors ${
                            isCurrentStation ? 'font-bold text-blue-700 dark:text-blue-300' : isTerminal ? 'font-semibold hover:text-primary' : 'text-muted-foreground hover:text-foreground'
                          }`}
                          onClick={() => handleStopClick(stop.name)}
                        >
                          {stop.name}
                        </button>
                        {isCurrentStation && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400">
                            Ici
                          </Badge>
                        )}
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
                        {!isFirst && stop.arrivalTime && (
                          <div className="text-right leading-tight">
                            <span className="text-[10px] text-muted-foreground/60 uppercase">arr.</span>
                            <div className="flex items-center gap-1 justify-end">
                              {stop.baseArrivalTime && (
                                <span className="text-xs font-mono tabular-nums text-muted-foreground/50 line-through">{stop.baseArrivalTime}</span>
                              )}
                              <span className={`text-xs font-mono tabular-nums ${stop.isDelayed && stop.baseArrivalTime ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-muted-foreground'}`}>
                                {stop.arrivalTime}
                              </span>
                            </div>
                          </div>
                        )}
                        {!isLast && stop.departureTime && (
                          <div className="text-right leading-tight">
                            <span className="text-[10px] text-muted-foreground/60 uppercase">dép.</span>
                            <div className="flex items-center gap-1 justify-end">
                              {stop.baseDepartureTime && (
                                <span className="text-xs font-mono tabular-nums text-muted-foreground/50 line-through">{stop.baseDepartureTime}</span>
                              )}
                              <span className={`text-xs font-mono tabular-nums ${stop.isDelayed && stop.baseDepartureTime ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-muted-foreground'}`}>
                                {stop.departureTime}
                              </span>
                            </div>
                          </div>
                        )}
                        {isFirst && !stop.arrivalTime && stop.departureTime && (
                          <div className="text-right leading-tight">
                            <span className="text-[10px] text-muted-foreground/60 uppercase">dép.</span>
                            <div className="flex items-center gap-1 justify-end">
                              {stop.baseDepartureTime && (
                                <span className="text-xs font-mono tabular-nums text-muted-foreground/50 line-through">{stop.baseDepartureTime}</span>
                              )}
                              <span className={`text-xs font-mono tabular-nums ${stop.isDelayed && stop.baseDepartureTime ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-muted-foreground'}`}>
                                {stop.departureTime}
                              </span>
                            </div>
                          </div>
                        )}
                        {isLast && !stop.departureTime && stop.arrivalTime && (
                          <div className="text-right leading-tight">
                            <span className="text-[10px] text-muted-foreground/60 uppercase">arr.</span>
                            <div className="flex items-center gap-1 justify-end">
                              {stop.baseArrivalTime && (
                                <span className="text-xs font-mono tabular-nums text-muted-foreground/50 line-through">{stop.baseArrivalTime}</span>
                              )}
                              <span className={`text-xs font-mono tabular-nums ${stop.isDelayed && stop.baseArrivalTime ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-muted-foreground'}`}>
                                {stop.arrivalTime}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* ── Vue liste ──────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-4">
      {/* Toggle mode de recherche (uniquement sur la page Infos) */}
      {showTrainSearch && (
        <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
          {(['station', 'train'] as const).map(m => (
            <button key={m} type="button" onClick={() => setSearchMode(m)}
              className={`flex-1 text-sm py-1.5 rounded-md transition-colors font-medium flex items-center justify-center gap-1.5 ${
                searchMode === m ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}>
              {m === 'station' ? <><MapPin className="h-3.5 w-3.5" />Par gare</> : <><Train className="h-3.5 w-3.5" />Par numéro</>}
            </button>
          ))}
        </div>
      )}

      {/* Mode recherche par numéro de train */}
      {showTrainSearch && searchMode === 'train' && <TrainNumberSearch />}

      {/* Mode recherche par gare */}
      {(!showTrainSearch || searchMode === 'station') && <>
      {/* Recherche */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="Nom de gare (ex : Paris Lyon)..."
            value={station}
            onChange={e => { setStation(e.target.value); setNearbySuggestions([]); }}
            onKeyDown={e => e.key === 'Enter' && load()}
            className="flex-1"
          />
          <Button type="button" size="icon" variant="outline"
            onClick={handleLocate} disabled={isLocating || isLoading}
            title="Gares proches de ma position">
            {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
          </Button>
          <Button type="button" size="icon" onClick={load} disabled={isLoading || !station.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
        {nearbySuggestions.length > 0 && (
          <div className="border rounded-xl overflow-hidden divide-y">
            {nearbySuggestions.map((s) => (
              <button key={s.id} type="button"
                className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                onClick={() => selectNearbySuggestion(s)}>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">{s.name}</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 ml-2">
                  {s.distance < 1000 ? `${s.distance} m` : `${(s.distance / 1000).toFixed(1)} km`}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Toggle Départs / Arrivées */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
        {(['departures', 'arrivals'] as const).map(m => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={`flex-1 text-sm py-1.5 rounded-md transition-colors font-medium ${
              mode === m ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}>
            {m === 'departures' ? 'Départs' : 'Arrivées'}
          </button>
        ))}
      </div>

      {stationName && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {mode === 'departures' ? 'Départs' : 'Arrivées'} · <span className="font-medium">{stationName}</span>
          </p>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={load} disabled={isLoading}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {error && !isLoading && (
        <p className="text-sm text-destructive text-center py-4">{error}</p>
      )}
      {!isLoading && !error && departures.length === 0 && stationName && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucun{mode === 'arrivals' ? 'e arrivée' : ' départ'} trouvé
        </p>
      )}

      <div className="space-y-1">
        {departures.map((dep, i) => {
          const mc  = getModeColors(mode);
          const occ = occupancyLabel(dep.occupancy);
          return (
            <button key={`${dep.trainNumber}-${i}`} type="button"
              className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${mc.bg} ${mc.border} ${mc.hoverBg} active:opacity-80`}
              onClick={() => handleSelectTrain(dep)}>
              <div className="w-14 shrink-0 text-center pt-0.5">
                {dep.delayMinutes > 0 ? (
                  <>
                    <div className="text-xs tabular-nums text-muted-foreground/60 line-through">
                      {dep.scheduledTime}
                    </div>
                    <div className="text-sm font-bold tabular-nums text-amber-600 dark:text-amber-400">
                      {dep.realTime}
                    </div>
                    <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      +{dep.delayMinutes} min
                    </div>
                  </>
                ) : (
                  <div className={`text-sm font-bold tabular-nums ${dep.status === 'cancelled' ? 'line-through text-muted-foreground' : mc.time}`}>
                    {dep.scheduledTime}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {dep.trainType && (
                    <Badge variant="outline" className="text-xs h-5 px-1.5 font-medium border-muted-foreground/30">
                      {dep.trainType}
                    </Badge>
                  )}
                  <span className="text-sm font-semibold">{dep.trainNumber}</span>
                  {dep.platform && (
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" />V{dep.platform}
                    </span>
                  )}
                  {occ && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${occ.cls}`}>
                      {occ.label}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">
                  {mode === 'arrivals' ? '← ' : '→ '}{dep.direction}
                </div>
                {dep.delayReason && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 italic truncate">
                    {dep.delayReason}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0 pt-0.5">
                {dep.status === 'on_time'   && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                {dep.status === 'delayed'   && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                {dep.status === 'cancelled' && <XCircle       className="h-4 w-4 text-red-500" />}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          );
        })}
      </div>

      {departures.length > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-2 text-muted-foreground"
          onClick={loadMore}
          disabled={isLoading}
        >
          {isLoading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <ChevronDown className="h-4 w-4" />}
          Charger plus
        </Button>
      )}
      </>}
    </div>
  );
}

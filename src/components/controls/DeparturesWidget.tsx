import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LocateFixed,
  MapPin,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useStationDepartures, DepartureEntry } from '@/hooks/useStationDepartures';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────────────────

interface StopTime {
  name:          string;
  arrivalTime:   string;
  departureTime: string;
  platform:      string | null;
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
        <div className={`text-sm font-bold tabular-nums ${dep.status === 'cancelled' ? 'line-through text-muted-foreground' : mc.time}`}>
          {dep.scheduledTime}
        </div>
        {dep.delayMinutes > 0 && (
          <div className="text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">
            +{dep.delayMinutes} min
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

// ── DeparturesWidget ───────────────────────────────────────────────────────────

export function DeparturesWidget() {
  const [station,          setStation]          = useState('');
  const [mode,             setMode]             = useState<'departures' | 'arrivals'>('departures');
  const [selected,         setSelected]         = useState<DepartureEntry | null>(null);
  const [stops,            setStops]            = useState<StopTime[]>([]);
  const [stopsLoading,     setStopsLoading]     = useState(false);
  const [stopsError,       setStopsError]       = useState<string | null>(null);
  const [isLocating,       setIsLocating]       = useState(false);
  const [nearbySuggestions, setNearbySuggestions] = useState<NearbyStation[]>([]);

  const { fetchDepartures, isLoading, error, departures, stationName } = useStationDepartures();

  const load = () => {
    setNearbySuggestions([]);
    if (station.trim()) fetchDepartures(station, undefined, mode);
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
    fetchDepartures(s.name, undefined, mode);
  };

  useEffect(() => {
    if (stationName) fetchDepartures(station, undefined, mode);
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
            {stops.map((stop, i) => (
              <div key={i} className="flex items-stretch gap-3">
                <div className="flex flex-col items-center w-5 shrink-0">
                  <div className={`w-3 h-3 rounded-full border-2 mt-[14px] shrink-0 ${
                    i === 0 || i === stops.length - 1
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground/50 bg-background'
                  }`} />
                  {i < stops.length - 1 && <div className="flex-1 w-0.5 bg-border" />}
                </div>
                <div className="flex-1 pb-3 pt-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm leading-tight ${
                      i === 0 || i === stops.length - 1 ? 'font-semibold' : 'text-muted-foreground'
                    }`}>
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
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── Vue liste ──────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-4">
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
                <div className={`text-sm font-bold tabular-nums ${dep.status === 'cancelled' ? 'line-through text-muted-foreground' : mc.time}`}>
                  {dep.scheduledTime}
                </div>
                {dep.delayMinutes > 0 && (
                  <div className="text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                    +{dep.delayMinutes} min
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
    </div>
  );
}

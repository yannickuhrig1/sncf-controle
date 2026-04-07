import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Train,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MapPin,
  ChevronDown,
} from 'lucide-react';
import {
  useStationDepartures,
  DepartureEntry,
  nowMinus1hDatetime,
  nextDatetimeAfterLast,
} from '@/hooks/useStationDepartures';
import { useState } from 'react';

interface DeparturesBoardProps {
  station:  string;
  onSelect: (entry: DepartureEntry) => void;
}

export function DeparturesBoard({ station, onSelect }: DeparturesBoardProps) {
  const [open,         setOpen]         = useState(false);
  const [fromDatetime, setFromDatetime] = useState('');
  const { fetchDepartures, isLoading, error, departures, stationName } = useStationDepartures();

  const load = () => {
    if (station.trim()) {
      const dt = nowMinus1hDatetime();
      setFromDatetime(dt);
      fetchDepartures(station, dt);
    }
  };

  const loadMore = () => {
    if (!station.trim() || departures.length === 0) return;
    const lastDep = departures[departures.length - 1];
    const nextDt = nextDatetimeAfterLast(fromDatetime, lastDep.scheduledTime);
    fetchDepartures(station, nextDt, 'departures', true);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) load();
  };

  const handleSelect = (entry: DepartureEntry) => {
    onSelect(entry);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={!station.trim()}
        >
          <Train className="h-3.5 w-3.5" />
          Départs
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl flex flex-col">
        <SheetHeader className="flex flex-row items-center justify-between pb-2 shrink-0">
          <SheetTitle className="text-base truncate">
            Départs · {stationName || station}
          </SheetTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={load}
            disabled={isLoading}
          >
            {isLoading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <RefreshCw className="h-4 w-4" />}
          </Button>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto -mx-6 px-3 space-y-1">
          {isLoading && departures.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && !isLoading && (
            <p className="text-sm text-destructive text-center py-10">{error}</p>
          )}
          {!isLoading && !error && departures.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-10">Aucun départ trouvé</p>
          )}
          {departures.map((dep, i) => (
            <button
              key={`${dep.trainNumber}-${i}`}
              type="button"
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/60 active:bg-muted transition-colors text-left"
              onClick={() => handleSelect(dep)}
            >
              {/* Heure */}
              <div className="w-14 shrink-0 text-center">
                <div className={`text-sm font-bold tabular-nums ${dep.status === 'cancelled' ? 'line-through text-muted-foreground' : ''}`}>
                  {dep.scheduledTime}
                </div>
                {dep.delayMinutes > 0 && (
                  <div className="text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                    +{dep.delayMinutes} min
                  </div>
                )}
              </div>

              {/* Infos train */}
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
                </div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">
                  → {dep.direction}
                </div>
              </div>

              {/* Statut */}
              <div className="shrink-0">
                {dep.status === 'on_time'   && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                {dep.status === 'delayed'   && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                {dep.status === 'cancelled' && <XCircle       className="h-5 w-5 text-red-500" />}
              </div>
            </button>
          ))}

          {departures.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-2 text-muted-foreground mt-2"
              onClick={loadMore}
              disabled={isLoading}
            >
              {isLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <ChevronDown className="h-4 w-4" />}
              Charger plus
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

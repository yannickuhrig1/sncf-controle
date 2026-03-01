import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Loader2,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Train,
  Clock,
  MapPin,
  MessageSquare,
  Plus,
} from 'lucide-react';
import { useTrainLookup, TrainInfo, TrainStatus, formatDuration } from '@/hooks/useTrainLookup';
import { toast } from 'sonner';

interface TrainLookupButtonProps {
  trainNumber: string;
  date: string;
  onResult: (info: TrainInfo) => void;
  onAdd?: (trainNumber: string, info?: TrainInfo) => void;
}

const STATUS_CONFIG: Record<TrainStatus, {
  label:     string;
  className: string;
  icon:      React.ReactNode;
}> = {
  on_time:   { label: 'À l\'heure', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0',  icon: <CheckCircle2 className="h-3 w-3" /> },
  delayed:   { label: 'Retard',     className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0', icon: <AlertTriangle className="h-3 w-3" /> },
  cancelled: { label: 'Supprimé',   className: 'bg-red-500 text-white border-0',                                                 icon: <XCircle className="h-3 w-3" /> },
  unknown:   { label: 'Inconnu',    className: '',                                                                               icon: <HelpCircle className="h-3 w-3" /> },
};

export function TrainLookupButton({ trainNumber, date, onResult, onAdd }: TrainLookupButtonProps) {
  const { lookup, isLoading, error, trainInfo, reset } = useTrainLookup();

  const handleLookup = async () => {
    if (!trainNumber.trim()) { toast.error('Saisissez un numéro de train'); return; }
    reset();
    const info = await lookup(trainNumber, date);
    if (info) {
      onResult(info);
      const parts = [
        info.trainType && `[${info.trainType}]`,
        `${info.origin} → ${info.destination}`,
        info.journeyDuration && formatDuration(info.journeyDuration),
        info.delayMinutes    && `Retard +${info.delayMinutes} min`,
      ].filter(Boolean);
      toast.success(parts.join(' · '));
    } else if (error) {
      toast.error(error);
    }
  };

  const handleAdd = () => {
    if (!trainNumber.trim()) return;
    onAdd?.(trainNumber.trim(), trainInfo ?? undefined);
    toast.success(`Train ${trainNumber.trim()} ajouté aux trains du jour`);
  };

  const cfg = trainInfo ? STATUS_CONFIG[trainInfo.status] : null;
  const hasDelayDetails = trainInfo && (trainInfo.delayMinutes || trainInfo.disruptionReason);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={handleLookup}
          disabled={isLoading || !trainNumber.trim()}
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          {isLoading ? 'Recherche…' : 'Info SNCF'}
        </Button>

        {onAdd && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={handleAdd}
            disabled={!trainNumber.trim()}
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </Button>
        )}

        {/* Type de train */}
        {trainInfo?.trainType && (
          <Badge variant="outline" className="text-xs h-6 gap-1 border-muted-foreground/30">
            <Train className="h-3 w-3" />
            {trainInfo.trainType}
            {trainInfo.operator && trainInfo.operator !== trainInfo.trainType && ` · ${trainInfo.operator}`}
          </Badge>
        )}

        {/* Statut — cliquable si retard ou émotif */}
        {cfg && trainInfo && (
          hasDelayDetails ? (
            <Popover>
              <PopoverTrigger asChild>
                <Badge
                  variant="outline"
                  className={`flex items-center gap-1 text-xs h-6 cursor-pointer ${cfg.className}`}
                >
                  {cfg.icon}
                  {cfg.label}
                  {trainInfo.delayMinutes && trainInfo.delayMinutes > 0 && (
                    <span className="font-bold">+{trainInfo.delayMinutes} min</span>
                  )}
                </Badge>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="start" className="w-72 p-3 space-y-2 text-sm">
                {trainInfo.delayMinutes && trainInfo.delayMinutes > 0 && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="font-semibold text-amber-700 dark:text-amber-400">
                      Retard : +{trainInfo.delayMinutes} min
                    </span>
                  </div>
                )}
                {trainInfo.disruptionReason && (
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {trainInfo.disruptionReason}
                    </p>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          ) : (
            <Badge variant="outline" className={`flex items-center gap-1 text-xs h-6 cursor-default ${cfg.className}`}>
              {cfg.icon}
              {cfg.label}
            </Badge>
          )
        )}

        {error && !isLoading && <span className="text-xs text-destructive">{error}</span>}
      </div>

      {/* Durée + voie 1ère gare */}
      {trainInfo && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {trainInfo.journeyDuration && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Durée : {formatDuration(trainInfo.journeyDuration)}
            </span>
          )}
          {trainInfo.stops[0]?.platform && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Voie {trainInfo.stops[0].platform} à {trainInfo.origin}
            </span>
          )}
          {trainInfo.arrivalTime && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Arrivée {trainInfo.destination} : {trainInfo.arrivalTime}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

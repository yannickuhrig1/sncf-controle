import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
} from 'lucide-react';
import { useTrainLookup, TrainInfo, TrainStatus, formatDuration } from '@/hooks/useTrainLookup';
import { toast } from 'sonner';

interface TrainLookupButtonProps {
  trainNumber: string;
  date: string;
  onResult: (info: TrainInfo) => void;
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

export function TrainLookupButton({ trainNumber, date, onResult }: TrainLookupButtonProps) {
  const { lookup, isLoading, error, trainInfo, reset } = useTrainLookup();
  const hasToken = !!localStorage.getItem('sncf_api_token');

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

  const cfg = trainInfo ? STATUS_CONFIG[trainInfo.status] : null;

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

        {!hasToken && (
          <span className="text-xs text-muted-foreground italic">(token requis dans Administration)</span>
        )}

        {/* Type de train */}
        {trainInfo?.trainType && (
          <Badge variant="outline" className="text-xs h-6 gap-1 border-muted-foreground/30">
            <Train className="h-3 w-3" />
            {trainInfo.trainType}
            {trainInfo.operator && trainInfo.operator !== trainInfo.trainType && ` · ${trainInfo.operator}`}
          </Badge>
        )}

        {/* Statut avec tooltip raison */}
        {cfg && trainInfo && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={`flex items-center gap-1 text-xs h-6 cursor-default ${cfg.className}`}>
                  {cfg.icon}
                  {cfg.label}
                  {trainInfo.delayMinutes && trainInfo.delayMinutes > 0 ? ` +${trainInfo.delayMinutes} min` : ''}
                </Badge>
              </TooltipTrigger>
              {trainInfo.disruptionReason && (
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  {trainInfo.disruptionReason}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
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

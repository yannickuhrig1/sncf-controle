import { RefreshCw, Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LastSyncIndicatorProps {
  lastSync: string | null;
  isFetching: boolean;
  onSync: () => void;
  compact?: boolean;
}

export function LastSyncIndicator({ 
  lastSync, 
  isFetching, 
  onSync,
  compact = false 
}: LastSyncIndicatorProps) {
  return (
    <button
      onClick={onSync}
      disabled={isFetching}
      className={cn(
        "flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        compact ? "px-2 py-1" : "px-3 py-1.5 rounded-md hover:bg-muted"
      )}
    >
      <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
      {!compact && (
        <span className="hidden sm:inline">
          {isFetching ? (
            "Synchronisation..."
          ) : lastSync ? (
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3 text-primary" />
              {lastSync}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Synchroniser
            </span>
          )}
        </span>
      )}
    </button>
  );
}

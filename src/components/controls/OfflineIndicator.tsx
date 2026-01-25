import { WifiOff, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  isOnline: boolean;
  pendingCount: number;
  offlineControlsCount?: number;
  isSyncing?: boolean;
  compact?: boolean;
}

export function OfflineIndicator({ 
  isOnline, 
  pendingCount, 
  offlineControlsCount = 0,
  isSyncing = false,
  compact = false 
}: OfflineIndicatorProps) {
  const totalPending = pendingCount + offlineControlsCount;

  if (isOnline && totalPending === 0 && !isSyncing) {
    return null;
  }

  if (isSyncing) {
    return (
      <Badge variant="secondary" className="gap-1.5 animate-pulse">
        <Loader2 className="h-3 w-3 animate-spin" />
        {!compact && <span>Synchronisation...</span>}
      </Badge>
    );
  }

  if (!isOnline) {
    return (
      <Badge variant="outline" className="gap-1.5 border-warning text-warning">
        <WifiOff className="h-3 w-3" />
        {!compact && <span>Hors-ligne</span>}
        {totalPending > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-warning text-warning-foreground text-xs font-semibold">
            {totalPending}
          </span>
        )}
      </Badge>
    );
  }

  if (totalPending > 0) {
    return (
      <Badge variant="outline" className="gap-1.5 border-primary text-primary">
        <CloudOff className="h-3 w-3" />
        {!compact && <span>{totalPending} en attente</span>}
        {compact && (
          <span className="px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            {totalPending}
          </span>
        )}
      </Badge>
    );
  }

  return null;
}

import { WifiOff, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  isOnline: boolean;
  pendingCount: number;
  isSyncing?: boolean;
  compact?: boolean;
}

export function OfflineIndicator({ 
  isOnline, 
  pendingCount, 
  isSyncing = false,
  compact = false 
}: OfflineIndicatorProps) {
  if (isOnline && pendingCount === 0 && !isSyncing) {
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
        {pendingCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-warning text-warning-foreground text-xs">
            {pendingCount}
          </span>
        )}
      </Badge>
    );
  }

  if (pendingCount > 0) {
    return (
      <Badge variant="outline" className="gap-1.5 border-primary text-primary">
        <CloudOff className="h-3 w-3" />
        {!compact && <span>{pendingCount} en attente</span>}
      </Badge>
    );
  }

  return null;
}

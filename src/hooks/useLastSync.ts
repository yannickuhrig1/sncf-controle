import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function useLastSync() {
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const updateLastSync = useCallback(() => {
    setLastSyncTime(new Date());
  }, []);

  const formattedLastSync = lastSyncTime
    ? format(lastSyncTime, "HH:mm:ss", { locale: fr })
    : null;

  const fullFormattedLastSync = lastSyncTime
    ? format(lastSyncTime, "d MMM à HH:mm:ss", { locale: fr })
    : null;

  return {
    lastSyncTime,
    formattedLastSync,
    fullFormattedLastSync,
    updateLastSync,
  };
}

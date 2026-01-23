import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const OFFLINE_QUEUE_KEY = 'offline_control_queue';
const LAST_SYNC_KEY = 'last_sync_timestamp';

export interface OfflinePendingAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useState<OfflinePendingAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  // Load pending actions from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (stored) {
        setPendingActions(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load offline queue:', e);
    }
  }, []);

  // Save pending actions to localStorage
  const savePendingActions = useCallback((actions: OfflinePendingAction[]) => {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(actions));
      setPendingActions(actions);
    } catch (e) {
      console.error('Failed to save offline queue:', e);
    }
  }, []);

  // Add action to offline queue
  const queueAction = useCallback((action: Omit<OfflinePendingAction, 'id' | 'timestamp'>) => {
    const newAction: OfflinePendingAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    
    const updated = [...pendingActions, newAction];
    savePendingActions(updated);
    
    return newAction;
  }, [pendingActions, savePendingActions]);

  // Remove action from queue
  const removeFromQueue = useCallback((actionId: string) => {
    const updated = pendingActions.filter(a => a.id !== actionId);
    savePendingActions(updated);
  }, [pendingActions, savePendingActions]);

  // Clear entire queue
  const clearQueue = useCallback(() => {
    savePendingActions([]);
  }, [savePendingActions]);

  // Get last sync timestamp
  const getLastSyncTimestamp = useCallback(() => {
    try {
      const stored = localStorage.getItem(LAST_SYNC_KEY);
      return stored ? new Date(parseInt(stored)) : null;
    } catch {
      return null;
    }
  }, []);

  // Update last sync timestamp
  const updateLastSyncTimestamp = useCallback(() => {
    try {
      localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
    } catch (e) {
      console.error('Failed to save last sync timestamp:', e);
    }
  }, []);

  // Handle online status changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connexion rétablie', {
        description: pendingActions.length > 0 
          ? `${pendingActions.length} action(s) en attente de synchronisation`
          : 'Données à jour',
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['controls'] });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Mode hors-ligne', {
        description: 'Les modifications seront synchronisées au retour de la connexion',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingActions.length, queryClient]);

  return {
    isOnline,
    pendingActions,
    pendingCount: pendingActions.length,
    isSyncing,
    setIsSyncing,
    queueAction,
    removeFromQueue,
    clearQueue,
    getLastSyncTimestamp,
    updateLastSyncTimestamp,
  };
}

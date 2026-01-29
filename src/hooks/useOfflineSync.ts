import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const OFFLINE_QUEUE_KEY = 'offline_control_queue';
const LAST_SYNC_KEY = 'last_sync_timestamp';
const SW_SYNC_TAG = 'offline-controls-sync';

export interface OfflinePendingAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

// Register background sync if available
async function registerBackgroundSync() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register(SW_SYNC_TAG);
      console.log('Background sync registered');
      return true;
    } catch (error) {
      console.warn('Background sync registration failed:', error);
      return false;
    }
  }
  return false;
}

// Request persistent storage for offline data
async function requestPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persist();
      console.log(`Persistent storage ${isPersisted ? 'granted' : 'denied'}`);
      return isPersisted;
    } catch (error) {
      console.warn('Persistent storage request failed:', error);
    }
  }
  return false;
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
    
    // Request persistent storage on mount
    requestPersistentStorage();
  }, []);

  // Save pending actions to localStorage
  const savePendingActions = useCallback((actions: OfflinePendingAction[]) => {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(actions));
      setPendingActions(actions);
      
      // Try to register background sync when there are pending actions
      if (actions.length > 0) {
        registerBackgroundSync();
      }
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

  // Listen for Service Worker sync completion messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SYNC_COMPLETED') {
        toast.success('Synchronisation terminée', {
          description: `${event.data.syncedCount} contrôle(s) synchronisé(s)`,
        });
        queryClient.invalidateQueries({ queryKey: ['controls'] });
        
        // Clear synced items from queue
        if (event.data.syncedIds) {
          const syncedIds = new Set(event.data.syncedIds);
          const remaining = pendingActions.filter(a => !syncedIds.has(a.id));
          savePendingActions(remaining);
        }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
    };
  }, [pendingActions, savePendingActions, queryClient]);

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
    registerBackgroundSync,
  };
}

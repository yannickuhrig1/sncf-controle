import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type ControlInsert = Database['public']['Tables']['controls']['Insert'];

const OFFLINE_CONTROLS_KEY = 'offline_controls_queue';

export interface OfflineControl {
  id: string;
  data: Omit<ControlInsert, 'agent_id' | 'team_id'>;
  createdAt: number;
  syncAttempts: number;
}

export function useOfflineControls() {
  const [offlineControls, setOfflineControls] = useState<OfflineControl[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Load offline controls from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(OFFLINE_CONTROLS_KEY);
      if (stored) {
        setOfflineControls(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load offline controls:', e);
    }
  }, []);

  // Save offline controls to localStorage
  const saveOfflineControls = useCallback((controls: OfflineControl[]) => {
    try {
      localStorage.setItem(OFFLINE_CONTROLS_KEY, JSON.stringify(controls));
      setOfflineControls(controls);
    } catch (e) {
      console.error('Failed to save offline controls:', e);
    }
  }, []);

  // Add a control to offline queue
  const addOfflineControl = useCallback((data: Omit<ControlInsert, 'agent_id' | 'team_id'>) => {
    const newControl: OfflineControl = {
      id: crypto.randomUUID(),
      data,
      createdAt: Date.now(),
      syncAttempts: 0,
    };

    const updated = [...offlineControls, newControl];
    saveOfflineControls(updated);

    toast.info('Contrôle sauvegardé localement', {
      description: 'Il sera synchronisé dès que la connexion sera rétablie',
    });

    return newControl;
  }, [offlineControls, saveOfflineControls]);

  // Update a control in offline queue
  const updateOfflineControl = useCallback((id: string, data: Omit<ControlInsert, 'agent_id' | 'team_id'>) => {
    const updated = offlineControls.map(c => 
      c.id === id ? { ...c, data } : c
    );
    saveOfflineControls(updated);
  }, [offlineControls, saveOfflineControls]);

  // Remove a control from offline queue
  const removeOfflineControl = useCallback((id: string) => {
    const updated = offlineControls.filter(c => c.id !== id);
    saveOfflineControls(updated);
  }, [offlineControls, saveOfflineControls]);

  // Sync all offline controls to Supabase
  const syncOfflineControls = useCallback(async () => {
    if (!profile || offlineControls.length === 0 || isSyncing) {
      return { synced: 0, failed: 0 };
    }

    setIsSyncing(true);
    let synced = 0;
    let failed = 0;

    for (const control of offlineControls) {
      try {
        const { error } = await supabase.from('controls').insert({
          ...control.data,
          agent_id: profile.id,
          team_id: profile.team_id,
        } as any);

        if (error) {
          throw error;
        }

        removeOfflineControl(control.id);
        synced++;
      } catch (error) {
        console.error('Failed to sync control:', error);
        failed++;
        
        // Update sync attempts
        const updated = offlineControls.map(c => 
          c.id === control.id 
            ? { ...c, syncAttempts: c.syncAttempts + 1 }
            : c
        );
        saveOfflineControls(updated);
      }
    }

    setIsSyncing(false);

    if (synced > 0) {
      queryClient.invalidateQueries({ queryKey: ['controls'] });
      queryClient.invalidateQueries({ queryKey: ['onboard-controls'] });
      
      toast.success(`${synced} contrôle(s) synchronisé(s)`, {
        description: failed > 0 ? `${failed} échec(s)` : undefined,
      });
    }

    return { synced, failed };
  }, [profile, offlineControls, isSyncing, removeOfflineControl, saveOfflineControls, queryClient]);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      
      // Auto-sync when coming back online
      if (offlineControls.length > 0 && profile) {
        toast.info('Connexion rétablie', {
          description: `Synchronisation de ${offlineControls.length} contrôle(s)...`,
        });
        
        // Small delay to ensure connection is stable
        setTimeout(() => {
          syncOfflineControls();
        }, 1000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Mode hors-ligne', {
        description: 'Les nouveaux contrôles seront sauvegardés localement',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [offlineControls.length, profile, syncOfflineControls]);

  // Clear all offline controls
  const clearOfflineControls = useCallback(() => {
    saveOfflineControls([]);
  }, [saveOfflineControls]);

  return {
    offlineControls,
    offlineCount: offlineControls.length,
    isOnline,
    isSyncing,
    addOfflineControl,
    updateOfflineControl,
    removeOfflineControl,
    syncOfflineControls,
    clearOfflineControls,
  };
}

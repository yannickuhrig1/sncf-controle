import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { EmbarkmentMissionData, EmbarkmentTrain } from '@/components/controls/EmbarkmentControl';
import type { Json } from '@/integrations/supabase/types';

interface EmbarkmentMissionRow {
  id: string;
  agent_id: string;
  team_id: string | null;
  mission_date: string;
  station_name: string;
  global_comment: string | null;
  trains: EmbarkmentTrain[];
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

interface UseEmbarkmentMissionsReturn {
  missions: EmbarkmentMissionRow[];
  currentMission: EmbarkmentMissionRow | null;
  isLoading: boolean;
  isSaving: boolean;
  saveMission: (data: EmbarkmentMissionData) => Promise<EmbarkmentMissionRow | null>;
  loadMission: (id: string) => Promise<EmbarkmentMissionRow | null>;
  deleteMission: (id: string) => Promise<boolean>;
  completeMission: (id: string) => Promise<boolean>;
  refreshMissions: () => Promise<void>;
  setCurrentMission: (mission: EmbarkmentMissionRow | null) => void;
  clearCurrentMission: () => void;
}

// Helper to safely parse trains from JSON
function parseTrains(trains: Json): EmbarkmentTrain[] {
  if (Array.isArray(trains)) {
    return trains as unknown as EmbarkmentTrain[];
  }
  return [];
}

// Helper to convert trains to JSON
function trainsToJson(trains: EmbarkmentTrain[]): Json {
  return trains as unknown as Json;
}

export function useEmbarkmentMissions(): UseEmbarkmentMissionsReturn {
  const { profile } = useAuth();
  const [missions, setMissions] = useState<EmbarkmentMissionRow[]>([]);
  const [currentMission, setCurrentMission] = useState<EmbarkmentMissionRow | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const refreshMissions = useCallback(async () => {
    if (!profile?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('embarkment_missions')
        .select('*')
        .order('mission_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const typedData = (data || []).map(row => ({
        ...row,
        trains: parseTrains(row.trains),
      }));

      setMissions(typedData);
    } catch (error) {
      console.error('Failed to load embarkment missions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    refreshMissions();
  }, [refreshMissions]);

  const saveMission = useCallback(async (data: EmbarkmentMissionData): Promise<EmbarkmentMissionRow | null> => {
    if (!profile?.id) {
      toast.error('Vous devez être connecté pour sauvegarder');
      return null;
    }

    setIsSaving(true);
    try {
      // Check if we have a current mission to update
      if (currentMission) {
        const { data: updated, error } = await supabase
          .from('embarkment_missions')
          .update({
            mission_date: data.date.split('T')[0],
            station_name: data.stationName,
            global_comment: data.globalComment || null,
            trains: trainsToJson(data.trains),
          })
          .eq('id', currentMission.id)
          .select()
          .single();

        if (error) throw error;

        const typedRow: EmbarkmentMissionRow = {
          ...updated,
          trains: parseTrains(updated.trains),
        };

        setCurrentMission(typedRow);
        await refreshMissions();
        toast.success('Mission mise à jour sur le serveur');
        return typedRow;
      } else {
        // Create new mission
        const { data: created, error } = await supabase
          .from('embarkment_missions')
          .insert({
            agent_id: profile.id,
            team_id: profile.team_id || null,
            mission_date: data.date.split('T')[0],
            station_name: data.stationName,
            global_comment: data.globalComment || null,
            trains: trainsToJson(data.trains),
          })
          .select()
          .single();

        if (error) throw error;

        const typedRow: EmbarkmentMissionRow = {
          ...created,
          trains: parseTrains(created.trains),
        };

        setCurrentMission(typedRow);
        await refreshMissions();
        toast.success('Mission sauvegardée sur le serveur');
        return typedRow;
      }
    } catch (error) {
      console.error('Failed to save embarkment mission:', error);
      toast.error('Erreur lors de la sauvegarde');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [profile?.id, profile?.team_id, currentMission, refreshMissions]);

  const loadMission = useCallback(async (id: string): Promise<EmbarkmentMissionRow | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('embarkment_missions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      const typedRow: EmbarkmentMissionRow = {
        ...data,
        trains: parseTrains(data.trains),
      };

      setCurrentMission(typedRow);
      return typedRow;
    } catch (error) {
      console.error('Failed to load mission:', error);
      toast.error('Erreur lors du chargement');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteMission = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('embarkment_missions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (currentMission?.id === id) {
        setCurrentMission(null);
      }
      
      await refreshMissions();
      toast.success('Mission supprimée');
      return true;
    } catch (error) {
      console.error('Failed to delete mission:', error);
      toast.error('Erreur lors de la suppression');
      return false;
    }
  }, [currentMission, refreshMissions]);

  const completeMission = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('embarkment_missions')
        .update({ is_completed: true })
        .eq('id', id);

      if (error) throw error;

      await refreshMissions();
      toast.success('Mission terminée');
      return true;
    } catch (error) {
      console.error('Failed to complete mission:', error);
      toast.error('Erreur lors de la finalisation');
      return false;
    }
  }, [refreshMissions]);

  const clearCurrentMission = useCallback(() => {
    setCurrentMission(null);
  }, []);

  return {
    missions,
    currentMission,
    isLoading,
    isSaving,
    saveMission,
    loadMission,
    deleteMission,
    completeMission,
    refreshMissions,
    setCurrentMission,
    clearCurrentMission,
  };
}

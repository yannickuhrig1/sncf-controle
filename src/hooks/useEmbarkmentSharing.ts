import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { EmbarkmentTrain } from '@/components/controls/EmbarkmentControl';

interface ResolvedShare {
  missionId: string;
  stationName: string;
  missionDate: string;
  trains: EmbarkmentTrain[];
}

interface UseEmbarkmentSharingReturn {
  isCreatingCode: boolean;
  isResolvingCode: boolean;
  createShareCode: (missionId: string) => Promise<string | null>;
  resolveShareCode: (code: string) => Promise<ResolvedShare | null>;
}

const CODE_REGEX = /^\d{6}$/;

function normalizeCode(input: string): string {
  // Strip everything but digits — handy when users paste a code with spaces.
  return input.replace(/\D/g, '').slice(0, 6);
}

export function isValidShareCode(code: string): boolean {
  return CODE_REGEX.test(code);
}

export function useEmbarkmentSharing(): UseEmbarkmentSharingReturn {
  const [isCreatingCode, setIsCreatingCode] = useState(false);
  const [isResolvingCode, setIsResolvingCode] = useState(false);

  const createShareCode = useCallback(async (missionId: string): Promise<string | null> => {
    setIsCreatingCode(true);
    try {
      const { data, error } = await supabase.rpc('create_embarkment_share_code', {
        p_mission_id: missionId,
      });
      if (error) throw error;
      if (!data || typeof data !== 'string') {
        toast.error('Impossible de générer un code');
        return null;
      }
      return data;
    } catch (error) {
      console.error('Failed to create share code:', error);
      toast.error("Erreur lors de la génération du code de partage");
      return null;
    } finally {
      setIsCreatingCode(false);
    }
  }, []);

  const resolveShareCode = useCallback(async (rawCode: string): Promise<ResolvedShare | null> => {
    const code = normalizeCode(rawCode);
    if (!isValidShareCode(code)) {
      toast.error('Code invalide (6 chiffres attendus)');
      return null;
    }

    setIsResolvingCode(true);
    try {
      const { data, error } = await supabase.rpc('resolve_embarkment_share_code', {
        p_code: code,
      });
      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      if (!row || !row.mission_id) {
        toast.error('Code introuvable ou expiré');
        return null;
      }

      return {
        missionId: row.mission_id,
        stationName: row.station_name,
        missionDate: row.mission_date,
        trains: (row.trains ?? []) as EmbarkmentTrain[],
      };
    } catch (error) {
      console.error('Failed to resolve share code:', error);
      toast.error('Erreur lors de la récupération de la mission');
      return null;
    } finally {
      setIsResolvingCode(false);
    }
  }, []);

  return {
    isCreatingCode,
    isResolvingCode,
    createShareCode,
    resolveShareCode,
  };
}

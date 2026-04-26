import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import type { ServiceItem } from '@/lib/pacificWebParser';

export interface ServiceDayRow {
  id: string;
  agent_id: string;
  team_id: string | null;
  service_date: string;          // YYYY-MM-DD
  code_journee: string;
  raw_text: string | null;
  items: ServiceItem[];
  created_at: string;
  updated_at: string;
}

interface CreateServiceDayInput {
  serviceDate: string;            // YYYY-MM-DD
  codeJournee: string;
  rawText: string;
  items: ServiceItem[];
}

interface UseServiceDaysReturn {
  isLoading: boolean;
  isSaving: boolean;
  serviceDays: ServiceDayRow[];
  /** Service days for today, oldest first. */
  todayServiceDays: ServiceDayRow[];
  refresh: () => Promise<void>;
  createServiceDay: (input: CreateServiceDayInput) => Promise<ServiceDayRow | null>;
  getServiceDay: (id: string) => Promise<ServiceDayRow | null>;
  deleteServiceDay: (id: string) => Promise<boolean>;
  /** Find recent service days with the same code_journee (excluding today). */
  findPriorByCode: (codeJournee: string, excludeDate?: string) => ServiceDayRow[];
}

function rowToServiceDay(row: Record<string, unknown>): ServiceDayRow {
  return {
    id: row.id as string,
    agent_id: row.agent_id as string,
    team_id: (row.team_id as string | null) ?? null,
    service_date: row.service_date as string,
    code_journee: row.code_journee as string,
    raw_text: (row.raw_text as string | null) ?? null,
    items: Array.isArray(row.items) ? (row.items as ServiceItem[]) : [],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export function useServiceDays(): UseServiceDaysReturn {
  const { profile } = useAuth();
  const [serviceDays, setServiceDays] = useState<ServiceDayRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!profile?.id) {
      setServiceDays([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_days')
        .select('*')
        .eq('agent_id', profile.id)
        .order('service_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(60);
      if (error) throw error;
      setServiceDays((data ?? []).map(rowToServiceDay));
    } catch (err) {
      console.error('Failed to load service days:', err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createServiceDay = useCallback(async (input: CreateServiceDayInput): Promise<ServiceDayRow | null> => {
    if (!profile?.id) {
      toast.error('Profil utilisateur introuvable');
      return null;
    }
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('service_days')
        .insert({
          agent_id: profile.id,
          team_id: profile.team_id ?? null,
          service_date: input.serviceDate,
          code_journee: input.codeJournee.trim(),
          raw_text: input.rawText,
          // Cast to unknown→Json for the typed client; the column is jsonb.
          items: input.items as unknown as object,
        })
        .select()
        .single();
      if (error) throw error;
      const row = rowToServiceDay(data);
      // Optimistic local update so the UI reflects it immediately.
      setServiceDays(prev => [row, ...prev]);
      toast.success('Journée importée');
      return row;
    } catch (err) {
      console.error('Failed to create service day:', err);
      toast.error("Erreur lors de l'enregistrement de la journée");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [profile?.id, profile?.team_id]);

  const getServiceDay = useCallback(async (id: string): Promise<ServiceDayRow | null> => {
    try {
      const { data, error } = await supabase
        .from('service_days')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return rowToServiceDay(data);
    } catch (err) {
      console.error('Failed to load service day:', err);
      return null;
    }
  }, []);

  const deleteServiceDay = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('service_days')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setServiceDays(prev => prev.filter(d => d.id !== id));
      toast.success('Journée supprimée');
      return true;
    } catch (err) {
      console.error('Failed to delete service day:', err);
      toast.error('Suppression impossible');
      return false;
    }
  }, []);

  const findPriorByCode = useCallback((codeJournee: string, excludeDate?: string): ServiceDayRow[] => {
    const normalized = codeJournee.trim().toLowerCase();
    if (!normalized) return [];
    return serviceDays.filter(d =>
      d.code_journee.toLowerCase() === normalized
      && (!excludeDate || d.service_date !== excludeDate)
    );
  }, [serviceDays]);

  // Today helper
  const todayStr = new Date().toISOString().split('T')[0];
  const todayServiceDays = serviceDays
    .filter(d => d.service_date === todayStr)
    .slice()
    .reverse();

  return {
    isLoading,
    isSaving,
    serviceDays,
    todayServiceDays,
    refresh,
    createServiceDay,
    getServiceDay,
    deleteServiceDay,
    findPriorByCode,
  };
}

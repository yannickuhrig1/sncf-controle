import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';

type Control = Database['public']['Tables']['controls']['Row'];

export type ViewMode = 'my-data' | 'all-data';

interface UseControlsWithFilterOptions {
  date?: Date | null;
  viewMode?: ViewMode;
}

// Get date string in Paris timezone
function getParisDateString(date: Date): string {
  return date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
}

// Get today's date string in Paris timezone
function getTodayParisDateString(): string {
  return getParisDateString(new Date());
}

export function useControlsWithFilter({ date, viewMode = 'my-data' }: UseControlsWithFilterOptions = {}) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const dateString = date ? getParisDateString(date) : getTodayParisDateString();

  const controlsQuery = useQuery({
    queryKey: ['controls', 'filtered', dateString, viewMode, profile?.id],
    queryFn: async () => {
      let query = supabase
        .from('controls')
        .select('*')
        .eq('control_date', dateString)
        .order('control_time', { ascending: false });

      // Filter by agent if viewing "my data" only
      if (viewMode === 'my-data' && profile) {
        query = query.eq('agent_id', profile.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Control[];
    },
    enabled: !!profile,
    // Refetch every minute to keep data fresh
    refetchInterval: 60000,
    // Refetch when window gains focus
    refetchOnWindowFocus: true,
  });

  const refetch = async () => {
    await controlsQuery.refetch();
  };

  return {
    controls: controlsQuery.data ?? [],
    isLoading: controlsQuery.isLoading,
    isFetching: controlsQuery.isFetching,
    refetch,
    dateString,
    getTodayParisDateString,
  };
}

export { getTodayParisDateString, getParisDateString };


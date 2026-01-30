import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

type Control = Database['public']['Tables']['controls']['Row'];

export type ViewMode = 'my-data' | 'all-data';
export type Period = 'day' | 'week' | 'month' | 'year';

interface UseControlsWithFilterOptions {
  date?: Date | null;
  viewMode?: ViewMode;
  period?: Period;
}

// Get date string in Paris timezone
function getParisDateString(date: Date): string {
  return date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
}

// Get today's date string in Paris timezone
function getTodayParisDateString(): string {
  return getParisDateString(new Date());
}

// Get date range based on period
function getDateRange(date: Date, period: Period): { startDate: string; endDate: string } {
  let start: Date;
  let end: Date;

  switch (period) {
    case 'week':
      start = startOfWeek(date, { weekStartsOn: 1 }); // Monday
      end = endOfWeek(date, { weekStartsOn: 1 });
      break;
    case 'month':
      start = startOfMonth(date);
      end = endOfMonth(date);
      break;
    case 'year':
      start = startOfYear(date);
      end = endOfYear(date);
      break;
    case 'day':
    default:
      start = date;
      end = date;
      break;
  }

  return {
    startDate: getParisDateString(start),
    endDate: getParisDateString(end),
  };
}

export function useControlsWithFilter({ date, viewMode = 'my-data', period = 'day' }: UseControlsWithFilterOptions = {}) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const baseDate = date || new Date();
  const { startDate, endDate } = getDateRange(baseDate, period);

  const controlsQuery = useQuery({
    queryKey: ['controls', 'filtered', startDate, endDate, period, viewMode, profile?.id],
    queryFn: async () => {
      let query = supabase
        .from('controls')
        .select('*')
        .order('control_date', { ascending: false })
        .order('control_time', { ascending: false });

      // Apply date range filter
      if (period === 'day') {
        query = query.eq('control_date', startDate);
      } else {
        query = query.gte('control_date', startDate).lte('control_date', endDate);
      }

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
    startDate,
    endDate,
    getTodayParisDateString,
  };
}

export { getTodayParisDateString, getParisDateString };


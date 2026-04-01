import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';

type Control = Database['public']['Tables']['controls']['Row'];

export function useControl(id: string | undefined) {
  const { profile } = useAuth();

  const query = useQuery({
    queryKey: ['control', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('controls')
        .select('*')
        .eq('id', id!)
        .single();

      if (error) throw error;
      return data as Control;
    },
    enabled: !!profile && !!id,
  });

  return {
    control: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
}

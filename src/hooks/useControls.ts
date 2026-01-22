import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';

type Control = Database['public']['Tables']['controls']['Row'];
type ControlInsert = Database['public']['Tables']['controls']['Insert'];

export function useControls() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const controlsQuery = useQuery({
    queryKey: ['controls'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('controls')
        .select('*')
        .order('control_date', { ascending: false })
        .order('control_time', { ascending: false });

      if (error) throw error;
      return data as Control[];
    },
    enabled: !!profile,
  });

  const todayControlsQuery = useQuery({
    queryKey: ['controls', 'today'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('controls')
        .select('*')
        .eq('control_date', today)
        .order('control_time', { ascending: false });

      if (error) throw error;
      return data as Control[];
    },
    enabled: !!profile,
  });

  const createControlMutation = useMutation({
    mutationFn: async (control: Omit<ControlInsert, 'agent_id' | 'team_id'>) => {
      if (!profile) throw new Error('Profile not found');

      const { data, error } = await supabase
        .from('controls')
        .insert({
          ...control,
          agent_id: profile.id,
          team_id: profile.team_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controls'] });
    },
  });

  const updateControlMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Control> & { id: string }) => {
      const { data, error } = await supabase
        .from('controls')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controls'] });
    },
  });

  const deleteControlMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('controls')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controls'] });
    },
  });

  const refetch = async () => {
    await Promise.all([
      controlsQuery.refetch(),
      todayControlsQuery.refetch(),
    ]);
  };

  return {
    controls: controlsQuery.data ?? [],
    todayControls: todayControlsQuery.data ?? [],
    isLoading: controlsQuery.isLoading,
    isFetching: controlsQuery.isFetching || todayControlsQuery.isFetching,
    createControl: createControlMutation.mutateAsync,
    updateControl: updateControlMutation.mutateAsync,
    deleteControl: deleteControlMutation.mutateAsync,
    isCreating: createControlMutation.isPending,
    isUpdating: updateControlMutation.isPending,
    isDeleting: deleteControlMutation.isPending,
    refetch,
  };
}

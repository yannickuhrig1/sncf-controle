import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';

type Control = Database['public']['Tables']['controls']['Row'];
type ControlInsert = Database['public']['Tables']['controls']['Insert'];

const PAGE_SIZE = 50;

export function useControls() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const controlsQuery = useQuery({
    queryKey: ['controls'],
    queryFn: async () => {
      // Fetch all controls without row limit (Supabase default is 1000)
      const { data, error } = await supabase
        .from('controls')
        .select('*')
        .order('control_date', { ascending: false })
        .order('control_time', { ascending: false })
        .limit(10000); // Explicitly set high limit to avoid missing records

      if (error) throw error;
      return data as Control[];
    },
    enabled: !!profile,
  });

  // Infinite query for paginated loading
  const infiniteControlsQuery = useInfiniteQuery({
    queryKey: ['controls', 'infinite'],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      const { data, error, count } = await supabase
        .from('controls')
        .select('*', { count: 'exact' })
        .order('control_date', { ascending: false })
        .order('control_time', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return {
        data: data as Control[],
        nextPage: data.length === PAGE_SIZE ? pageParam + 1 : undefined,
        totalCount: count ?? 0,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
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
      infiniteControlsQuery.refetch(),
    ]);
  };

  // Flatten infinite query pages
  const infiniteControls = infiniteControlsQuery.data?.pages.flatMap(page => page.data) ?? [];

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
    // Infinite pagination
    infiniteControls,
    fetchNextPage: infiniteControlsQuery.fetchNextPage,
    hasNextPage: infiniteControlsQuery.hasNextPage,
    isFetchingNextPage: infiniteControlsQuery.isFetchingNextPage,
    isLoadingInfinite: infiniteControlsQuery.isLoading,
    totalCount: infiniteControlsQuery.data?.pages[0]?.totalCount ?? 0,
  };
}

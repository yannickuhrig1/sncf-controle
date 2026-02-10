import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface OnboardControl {
  id: string;
  agent_id: string;
  team_id: string | null;
  train_number: string;
  origin: string | null;
  destination: string | null;
  control_date: string;
  control_time: string;
  nb_passagers: number;
  nb_en_regle: number;
  tarifs_controle: number;
  pv: number;
  stt_50: number;
  stt_50_amount: number | null;
  stt_100: number;
  stt_100_amount: number | null;
  rnv: number;
  rnv_amount: number | null;
  titre_tiers: number | null;
  titre_tiers_amount: number | null;
  doc_naissance: number | null;
  doc_naissance_amount: number | null;
  autre_tarif: number | null;
  autre_tarif_amount: number | null;
  pv_absence_titre: number | null;
  pv_absence_titre_amount: number | null;
  pv_titre_invalide: number | null;
  pv_titre_invalide_amount: number | null;
  pv_refus_controle: number | null;
  pv_refus_controle_amount: number | null;
  pv_autre: number | null;
  pv_autre_amount: number | null;
  ri_positive: number;
  ri_negative: number;
  notes: string | null;
  created_at: string;
  location: string;
  location_type: 'train';
}

export function useOnboardControls() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all onboard controls (location_type = 'train')
  const controlsQuery = useQuery({
    queryKey: ['onboard-controls', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('controls')
        .select('*')
        .eq('location_type', 'train')
        .order('control_date', { ascending: false })
        .order('control_time', { ascending: false });

      if (error) throw error;
      return data as OnboardControl[];
    },
    enabled: !!profile,
  });

  const controls = controlsQuery.data ?? [];
  const isLoading = controlsQuery.isLoading;
  const isFetching = controlsQuery.isFetching;

  // Create control
  const createMutation = useMutation({
    mutationFn: async (data: Partial<OnboardControl>) => {
      const { error } = await supabase.from('controls').insert({
        ...data,
        agent_id: profile?.id,
        team_id: profile?.team_id,
        location_type: 'train',
      } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboard-controls'] });
      queryClient.invalidateQueries({ queryKey: ['controls'] });
    },
  });

  // Update control
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<OnboardControl> }) => {
      const { error } = await supabase.from('controls').update(data).eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboard-controls'] });
      queryClient.invalidateQueries({ queryKey: ['controls'] });
    },
  });

  // Delete control
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('controls').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboard-controls'] });
      queryClient.invalidateQueries({ queryKey: ['controls'] });
      toast({
        title: 'Contrôle supprimé',
        description: 'Le contrôle a été supprimé avec succès.',
      });
    },
  });

  const refetch = () => controlsQuery.refetch();

  return {
    controls,
    isLoading,
    isFetching,
    refetch,
    createControl: createMutation.mutateAsync,
    updateControl: updateMutation.mutateAsync,
    deleteControl: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

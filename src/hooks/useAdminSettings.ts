import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface FraudRateThresholds {
  low: number;  // < low = green
  medium: number; // >= low && < medium = yellow, >= medium = red
}

export const DEFAULT_FRAUD_THRESHOLDS: FraudRateThresholds = {
  low: 5,
  medium: 10,
};

export function useAdminSettings() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings' as any)
        .select('*');
      
      if (error) throw error;
      return (data || []) as unknown as Array<{ id: string; key: string; value: any; description: string }>;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  const getFraudThresholds = (): FraudRateThresholds => {
    const setting = settings?.find(s => s.key === 'fraud_rate_thresholds');
    if (setting?.value) {
      return {
        low: setting.value.low ?? DEFAULT_FRAUD_THRESHOLDS.low,
        medium: setting.value.medium ?? DEFAULT_FRAUD_THRESHOLDS.medium,
      };
    }
    return DEFAULT_FRAUD_THRESHOLDS;
  };

  const updateFraudThresholds = useMutation({
    mutationFn: async (thresholds: FraudRateThresholds) => {
      const { error } = await supabase
        .from('admin_settings' as any)
        .update({ value: thresholds })
        .eq('key', 'fraud_rate_thresholds');
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('Seuils de fraude mis à jour');
    },
    onError: (error: Error) => {
      toast.error('Erreur: ' + error.message);
    },
  });

  return {
    settings,
    isLoading,
    fraudThresholds: getFraudThresholds(),
    updateFraudThresholds: updateFraudThresholds.mutate,
    isUpdating: updateFraudThresholds.isPending,
    canEdit: isAdmin(),
  };
}

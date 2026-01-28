import { useEffect } from 'react';
import { useAdminSettings } from './useAdminSettings';
import { setFraudThresholds, getFraudThresholds } from '@/lib/stats';

/**
 * Hook to sync fraud thresholds from admin settings to the global stats module.
 * This ensures all components using getFraudRateColor/getFraudRateBgColor
 * will use the dynamic thresholds set by admins.
 */
export function useFraudThresholds() {
  const { fraudThresholds, isLoading } = useAdminSettings();

  useEffect(() => {
    if (!isLoading && fraudThresholds) {
      setFraudThresholds(fraudThresholds);
    }
  }, [fraudThresholds, isLoading]);

  return {
    thresholds: fraudThresholds,
    isLoading,
  };
}

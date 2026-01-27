import type { Database } from '@/integrations/supabase/types';

type Control = Database['public']['Tables']['controls']['Row'];

export interface ControlStats {
  totalPassengers: number;
  passengersInRule: number;
  fraudCount: number;
  fraudRate: number;
  tarifsControle: number;
  pv: number;
  stt50: number;
  stt100: number;
  rnv: number;
  riPositive: number;
  riNegative: number;
  controlCount: number;
}

export function calculateStats(controls: Control[]): ControlStats {
  const stats = controls.reduce(
    (acc, control) => {
      acc.totalPassengers += control.nb_passagers;
      acc.passengersInRule += control.nb_en_regle;
      acc.tarifsControle += control.tarifs_controle;
      acc.pv += control.pv;
      acc.stt50 += control.stt_50;
      acc.stt100 += control.stt_100;
      acc.rnv += control.rnv;
      acc.riPositive += control.ri_positive;
      acc.riNegative += control.ri_negative;
      acc.controlCount += 1;
      return acc;
    },
    {
      totalPassengers: 0,
      passengersInRule: 0,
      tarifsControle: 0,
      pv: 0,
      stt50: 0,
      stt100: 0,
      rnv: 0,
      riPositive: 0,
      riNegative: 0,
      controlCount: 0,
    }
  );

  // Fraud calculation: fraudCount = tarifsControle + pv
  const fraudCount = stats.tarifsControle + stats.pv;
  // Fraud rate = (fraudCount / totalPassengers) * 100
  const fraudRate = stats.totalPassengers > 0 
    ? (fraudCount / stats.totalPassengers) * 100 
    : 0;

  return {
    ...stats,
    fraudCount,
    fraudRate,
  };
}

export function formatFraudRate(rate: number): string {
  return `${rate.toFixed(2)}%`;
}

// Default thresholds - can be overridden by admin settings
let fraudThresholds = { low: 5, medium: 10 };

export function setFraudThresholds(thresholds: { low: number; medium: number }) {
  fraudThresholds = thresholds;
}

export function getFraudThresholds() {
  return fraudThresholds;
}

export function getFraudRateColor(rate: number): string {
  if (rate < fraudThresholds.low) return 'text-green-600';
  if (rate < fraudThresholds.medium) return 'text-yellow-600';
  return 'text-red-600';
}

export function getFraudRateBgColor(rate: number): string {
  if (rate < fraudThresholds.low) return 'bg-green-100 dark:bg-green-900/30';
  if (rate < fraudThresholds.medium) return 'bg-yellow-100 dark:bg-yellow-900/30';
  return 'bg-red-100 dark:bg-red-900/30';
}

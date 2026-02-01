import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Train, TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
import { subDays, subMonths, parseISO, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type Control = Database['public']['Tables']['controls']['Row'];

interface TrainFraudCompactProps {
  controls: Control[];
  trainNumber: string;
}

type Period = '7d' | '30d';

interface PeriodStats {
  totalPassengers: number;
  fraudCount: number;
  fraudRate: number;
  controlCount: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
}

export function TrainFraudCompact({ controls, trainNumber }: TrainFraudCompactProps) {
  const [period, setPeriod] = useState<Period>('7d');

  const stats = useMemo(() => {
    if (!trainNumber.trim()) return null;

    const normalizedInput = trainNumber.toLowerCase().trim();
    const now = new Date();
    
    // Filter controls for this train
    const trainControls = controls.filter((control) => {
      const controlTrainNumber = control.train_number?.toLowerCase().trim() || '';
      return controlTrainNumber.includes(normalizedInput) || normalizedInput.includes(controlTrainNumber);
    });

    if (trainControls.length === 0) return null;

    // Calculate stats for current period
    const periodStart = period === '7d' ? subDays(now, 7) : subMonths(now, 1);
    const previousPeriodStart = period === '7d' ? subDays(now, 14) : subMonths(now, 2);
    
    const currentPeriodControls = trainControls.filter(c => 
      isAfter(parseISO(c.control_date), periodStart)
    );
    
    const previousPeriodControls = trainControls.filter(c => {
      const date = parseISO(c.control_date);
      return isAfter(date, previousPeriodStart) && !isAfter(date, periodStart);
    });

    const calculatePeriodStats = (periodControls: Control[]): Omit<PeriodStats, 'trend' | 'trendValue'> => {
      const totalPassengers = periodControls.reduce((sum, c) => sum + c.nb_passagers, 0);
      const fraudCount = periodControls.reduce((sum, c) => sum + c.tarifs_controle + c.pv, 0);
      const fraudRate = totalPassengers > 0 ? (fraudCount / totalPassengers) * 100 : 0;
      return { totalPassengers, fraudCount, fraudRate, controlCount: periodControls.length };
    };

    const current = calculatePeriodStats(currentPeriodControls);
    const previous = calculatePeriodStats(previousPeriodControls);

    // Calculate trend
    let trend: 'up' | 'down' | 'stable' = 'stable';
    let trendValue = 0;
    
    if (previous.fraudRate > 0 && current.fraudRate > 0) {
      trendValue = ((current.fraudRate - previous.fraudRate) / previous.fraudRate) * 100;
      if (trendValue > 5) trend = 'up';
      else if (trendValue < -5) trend = 'down';
    }

    return { ...current, trend, trendValue };
  }, [controls, trainNumber, period]);

  // No train number entered
  if (!trainNumber.trim()) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Train className="h-4 w-4" />
            <span>Saisissez un n° de train pour voir l'historique</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No data for this train
  if (!stats) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Train className="h-4 w-4 text-primary" />
              <span className="font-medium">Train {trainNumber}</span>
            </div>
            <span className="text-sm text-muted-foreground">Aucun historique</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const TrendIcon = stats.trend === 'up' ? TrendingUp : stats.trend === 'down' ? TrendingDown : Minus;
  const trendColor = stats.trend === 'up' ? 'text-destructive' : stats.trend === 'down' ? 'text-chart-2' : 'text-muted-foreground';

  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Train info */}
          <div className="flex items-center gap-2 min-w-0">
            <Train className="h-4 w-4 text-primary shrink-0" />
            <span className="font-medium truncate">Train {trainNumber}</span>
          </div>

          {/* Period toggle */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant={period === '7d' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setPeriod('7d')}
            >
              7j
            </Button>
            <Button
              variant={period === '30d' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setPeriod('30d')}
            >
              30j
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          {/* Control count */}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">
              <span className="font-semibold">{stats.controlCount}</span>
              <span className="text-muted-foreground ml-1">contrôle{stats.controlCount > 1 ? 's' : ''}</span>
            </span>
          </div>

          {/* Fraud rate with trend */}
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={cn(
                "font-mono",
                stats.fraudRate > 10 ? "border-destructive text-destructive" :
                stats.fraudRate > 5 ? "border-amber-500 text-amber-600 dark:border-amber-400 dark:text-amber-400" :
                "border-chart-2 text-chart-2"
              )}
            >
              {stats.fraudRate.toFixed(1)}%
            </Badge>
            
            {/* Trend indicator */}
            <div className={cn("flex items-center gap-0.5 text-xs", trendColor)}>
              <TrendIcon className="h-3.5 w-3.5" />
              {stats.trend !== 'stable' && (
                <span>{Math.abs(stats.trendValue).toFixed(0)}%</span>
              )}
            </div>
          </div>
        </div>

        {/* Mini bar visualization */}
        <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-500",
              stats.fraudRate > 10 ? "bg-destructive" :
              stats.fraudRate > 5 ? "bg-amber-500" :
              "bg-chart-2"
            )}
            style={{ width: `${Math.min(stats.fraudRate * 5, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
          <span>0%</span>
          <span>20%+</span>
        </div>
      </CardContent>
    </Card>
  );
}

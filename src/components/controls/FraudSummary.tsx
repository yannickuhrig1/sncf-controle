import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FraudSummaryProps {
  passengers: number;
  fraudCount: number;
  fraudRate: number;
}

export function FraudSummary({ passengers, fraudCount, fraudRate }: FraudSummaryProps) {
  const getRateColor = (rate: number) => {
    if (rate < 5) return 'text-green-600 dark:text-green-400';
    if (rate < 10) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getRateBgColor = (rate: number) => {
    if (rate < 5) return 'bg-green-100 dark:bg-green-900/30';
    if (rate < 10) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  return (
    <Card className={cn('border-2', getRateBgColor(fraudRate))}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-background">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Voyageurs</p>
              <p className="text-lg font-semibold">{passengers}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-full', getRateBgColor(fraudRate))}>
              {fraudRate < 5 ? (
                <CheckCircle className={cn('h-5 w-5', getRateColor(fraudRate))} />
              ) : (
                <AlertTriangle className={cn('h-5 w-5', getRateColor(fraudRate))} />
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Taux de fraude</p>
              <p className={cn('text-lg font-bold', getRateColor(fraudRate))}>
                {fraudRate.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
        
        {fraudCount > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="text-sm text-muted-foreground text-center">
              {fraudCount} infraction{fraudCount > 1 ? 's' : ''} détectée{fraudCount > 1 ? 's' : ''}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

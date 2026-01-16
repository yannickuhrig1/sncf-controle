import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, TrendingUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TarifEntry } from './TarifListItem';

interface FraudSummaryCardProps {
  passengers: number;
  fraudCount: number;
  fraudRate: number;
  tarifsBord: TarifEntry[];
  tarifsControle: TarifEntry[];
  pvList: TarifEntry[];
  stt50Count: number;
  stt100Count: number;
  onReset: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function FraudSummaryCard({
  passengers,
  fraudCount,
  fraudRate,
  tarifsBord,
  tarifsControle,
  pvList,
  stt50Count,
  stt100Count,
}: FraudSummaryCardProps) {
  const getRateColor = (rate: number) => {
    if (rate < 5) return 'text-green-600 dark:text-green-400';
    if (rate < 10) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getProgressColor = (rate: number) => {
    if (rate < 5) return 'bg-green-500';
    if (rate < 10) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const totalTarifsBord = tarifsBord.reduce((sum, t) => sum + t.montant, 0);
  const totalTarifsControle = tarifsControle.reduce((sum, t) => sum + t.montant, 0) + (stt50Count * 50);
  const totalPv = pvList.reduce((sum, t) => sum + t.montant, 0) + (stt100Count * 100);

  return (
    <Card className="sticky top-20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Résumé en temps réel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fraud Rate Display */}
        <div className="text-center p-4 rounded-lg bg-muted/50">
          <div className="flex items-center justify-center gap-2 mb-2">
            {fraudRate < 5 ? (
              <CheckCircle className={cn('h-6 w-6', getRateColor(fraudRate))} />
            ) : (
              <AlertTriangle className={cn('h-6 w-6', getRateColor(fraudRate))} />
            )}
            <span className={cn('text-4xl font-bold', getRateColor(fraudRate))}>
              {fraudRate.toFixed(1)}%
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Taux de fraude</p>
          <div className="mt-3">
            <Progress
              value={Math.min(fraudRate, 100)}
              className="h-2"
              style={{
                ['--progress-background' as string]: getProgressColor(fraudRate),
              }}
            />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-semibold">{passengers}</p>
            <p className="text-xs text-muted-foreground">Passagers</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-semibold">{fraudCount}</p>
            <p className="text-xs text-muted-foreground">Fraudes</p>
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-1.5 border-b border-border/50">
            <span className="text-muted-foreground">Tarifs à bord ({tarifsBord.length})</span>
            <span className="font-medium">{totalTarifsBord.toFixed(2)}€</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-border/50">
            <span className="text-muted-foreground">
              Tarifs contrôle ({tarifsControle.length + stt50Count})
            </span>
            <span className="font-medium">{totalTarifsControle.toFixed(2)}€</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-border/50">
            <span className="text-muted-foreground">
              PV ({pvList.length + stt100Count})
            </span>
            <span className="font-medium">{totalPv.toFixed(2)}€</span>
          </div>
          <div className="flex justify-between py-1.5 font-semibold">
            <span>Total encaissé</span>
            <span className="text-primary">
              {(totalTarifsBord + totalTarifsControle + totalPv).toFixed(2)}€
            </span>
          </div>
        </div>

        {/* Info note */}
        <p className="text-xs text-muted-foreground text-center italic">
          ⚠️ Les tarifs à bord ne comptent pas dans le taux de fraude
        </p>
      </CardContent>
    </Card>
  );
}

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, Users, FileText, Ticket, TrendingUp, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFraudThresholds } from '@/lib/stats';
import { motion } from 'framer-motion';

export interface OperationDetail {
  id: string;
  type: string;
  typeLabel: string;
  montant?: number;
  category: 'bord' | 'controle' | 'pv' | 'exceptionnel';
}

interface FraudSummaryProps {
  passengers: number;
  fraudCount: number;
  fraudRate: number;
  onPassengersChange?: (value: number) => void;
  tarifsControle?: Array<{ id: string; type: string; typeLabel: string; montant?: number; category?: string }>;
  pvList?: Array<{ id: string; type: string; typeLabel: string; montant?: number; category?: string }>;
  stt50Count?: number;
  stt100Count?: number;
}

export function FraudSummary({
  passengers,
  fraudCount,
  fraudRate,
  onPassengersChange,
  tarifsControle = [],
  pvList = [],
  stt50Count = 0,
  stt100Count = 0,
}: FraudSummaryProps) {
  const [isEditingPassengers, setIsEditingPassengers] = useState(false);
  const [inputValue, setInputValue] = useState(String(passengers));
  const [showDetails, setShowDetails] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditingPassengers) {
      setInputValue(String(passengers));
    }
  }, [passengers, isEditingPassengers]);

  useEffect(() => {
    if (isEditingPassengers && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingPassengers]);

  const thresholds = getFraudThresholds();

  const getRateColor = (rate: number) => {
    if (rate === 0) return 'text-foreground';
    if (rate < thresholds.low) return 'text-emerald-600 dark:text-emerald-400';
    if (rate < thresholds.medium) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getStripGradient = (rate: number) => {
    if (rate === 0) return 'from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700';
    if (rate < thresholds.low) return 'from-emerald-400 to-green-500';
    if (rate < thresholds.medium) return 'from-amber-400 to-orange-500';
    return 'from-rose-500 to-red-600';
  };

  const getBarColor = (rate: number) => {
    if (rate === 0) return 'bg-slate-300 dark:bg-slate-600';
    if (rate < thresholds.low) return 'bg-emerald-500';
    if (rate < thresholds.medium) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const handlePassengerSubmit = () => {
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed) && parsed >= 0 && onPassengersChange) {
      onPassengersChange(parsed);
    }
    setIsEditingPassengers(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePassengerSubmit();
    } else if (e.key === 'Escape') {
      setInputValue(String(passengers));
      setIsEditingPassengers(false);
    }
  };

  const hasDetails = tarifsControle.length > 0 || pvList.length > 0 || stt50Count > 0 || stt100Count > 0;

  return (
    <>
      <Card className="border-0 shadow-md overflow-hidden bg-card/95">
        {/* Top colored strip */}
        <div className={cn('h-1 bg-gradient-to-r transition-all duration-700', getStripGradient(fraudRate))} />

        <CardContent className="p-0">
          <div className="grid grid-cols-3 divide-x divide-border/40">

            {/* Voyageurs */}
            <button
              type="button"
              className={cn(
                'px-4 sm:px-6 py-4 flex flex-col gap-1.5 text-left transition-colors w-full',
                onPassengersChange ? 'cursor-pointer hover:bg-muted/40 active:bg-muted/60' : 'cursor-default'
              )}
              onClick={() => onPassengersChange && setIsEditingPassengers(true)}
              disabled={!onPassengersChange}
            >
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Voyageurs
                </span>
                {onPassengersChange && !isEditingPassengers && (
                  <Pencil className="h-2.5 w-2.5 text-muted-foreground/40 ml-auto" />
                )}
              </div>
              {isEditingPassengers ? (
                <Input
                  ref={inputRef}
                  type="number"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onBlur={handlePassengerSubmit}
                  onKeyDown={handleKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  className="h-9 w-24 text-xl font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  min={0}
                />
              ) : (
                <p className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight">
                  {passengers}
                </p>
              )}
            </button>

            {/* Infractions */}
            <button
              type="button"
              className={cn(
                'px-4 sm:px-6 py-4 flex flex-col gap-1.5 text-left transition-colors w-full',
                hasDetails ? 'cursor-pointer hover:bg-muted/40 active:bg-muted/60' : 'cursor-default'
              )}
              onClick={() => hasDetails && setShowDetails(true)}
              disabled={!hasDetails}
            >
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Infractions
                </span>
              </div>
              <p className={cn(
                'text-2xl sm:text-3xl font-bold tabular-nums tracking-tight',
                fraudCount > 0 ? 'text-amber-600 dark:text-amber-400' : ''
              )}>
                {fraudCount}
              </p>
            </button>

            {/* Taux de fraude */}
            <button
              type="button"
              className={cn(
                'px-4 sm:px-6 py-4 flex flex-col gap-1.5 text-left transition-colors w-full',
                hasDetails ? 'cursor-pointer hover:bg-muted/40 active:bg-muted/60' : 'cursor-default'
              )}
              onClick={() => hasDetails && setShowDetails(true)}
              disabled={!hasDetails}
            >
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Taux fraude
                </span>
              </div>
              <p className={cn('text-2xl sm:text-3xl font-bold tabular-nums tracking-tight', getRateColor(fraudRate))}>
                {fraudRate.toFixed(1)}%
              </p>
            </button>
          </div>

          {/* Progress bar */}
          {passengers > 0 && (
            <div className="px-4 pb-3">
              <div className="h-1.5 rounded-full bg-muted/70 overflow-hidden">
                <motion.div
                  className={cn('h-full rounded-full transition-colors duration-700', getBarColor(fraudRate))}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(fraudRate * 5, 100)}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Détail des opérations
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-lg bg-muted text-center">
                <p className="text-xs text-muted-foreground mb-1">Voyageurs</p>
                <p className="text-xl font-bold">{passengers}</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-center">
                <p className="text-xs text-muted-foreground mb-1">Infractions</p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{fraudCount}</p>
              </div>
              <div className={cn('p-3 rounded-lg text-center', fraudRate === 0 ? 'bg-muted' : fraudRate < thresholds.low ? 'bg-emerald-50 dark:bg-emerald-900/20' : fraudRate < thresholds.medium ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-red-50 dark:bg-red-900/20')}>
                <p className="text-xs text-muted-foreground mb-1">Taux</p>
                <p className={cn('text-xl font-bold', getRateColor(fraudRate))}>
                  {fraudRate.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* STT counters */}
            {(stt50Count > 0 || stt100Count > 0) && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Ticket className="h-4 w-4" />
                  Compteurs STT
                </h4>
                <div className="space-y-1">
                  {stt50Count > 0 && (
                    <div className="flex items-center justify-between p-2 rounded bg-muted">
                      <span className="text-sm">STT 50€</span>
                      <Badge variant="secondary">{stt50Count} × 50€ = {stt50Count * 50}€</Badge>
                    </div>
                  )}
                  {stt100Count > 0 && (
                    <div className="flex items-center justify-between p-2 rounded bg-muted">
                      <span className="text-sm">PV 100€</span>
                      <Badge variant="secondary">{stt100Count} × 100€ = {stt100Count * 100}€</Badge>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tarifs contrôle */}
            {tarifsControle.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Tarifs contrôle ({tarifsControle.length})
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {tarifsControle.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded bg-muted">
                      <span className="text-sm">{item.typeLabel}</span>
                      {item.montant && <Badge variant="outline">{item.montant}€</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PV list */}
            {pvList.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  Procès-verbaux ({pvList.length})
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {pvList.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded bg-red-50 dark:bg-red-900/20">
                      <span className="text-sm">{item.typeLabel}</span>
                      {item.montant && <Badge variant="destructive">{item.montant}€</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total */}
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between">
                <span className="font-medium">Total infractions</span>
                <span className={cn('text-lg font-bold', getRateColor(fraudRate))}>
                  {fraudCount}
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

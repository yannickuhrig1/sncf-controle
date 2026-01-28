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
import { AlertTriangle, CheckCircle, Users, FileText, Ticket, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFraudRateColor, getFraudRateBgColor, getFraudThresholds } from '@/lib/stats';

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

  // Use dynamic thresholds from admin settings
  const getRateColor = (rate: number) => {
    const thresholds = getFraudThresholds();
    if (rate < thresholds.low) return 'text-green-600 dark:text-green-400';
    if (rate < thresholds.medium) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getRateBgColor = (rate: number) => {
    const thresholds = getFraudThresholds();
    if (rate < thresholds.low) return 'bg-green-100 dark:bg-green-900/30';
    if (rate < thresholds.medium) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
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
      <Card className={cn('border-2', getRateBgColor(fraudRate))}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {/* Passengers section - clickable to edit */}
            <div
              className={cn(
                'flex items-center gap-3 rounded-lg p-2 -m-2 transition-colors',
                onPassengersChange && 'cursor-pointer hover:bg-background/50'
              )}
              onClick={() => onPassengersChange && setIsEditingPassengers(true)}
              title={onPassengersChange ? 'Cliquer pour modifier' : undefined}
            >
              <div className="p-2 rounded-full bg-background">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Voyageurs</p>
                {isEditingPassengers ? (
                  <Input
                    ref={inputRef}
                    type="number"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onBlur={handlePassengerSubmit}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    className="h-8 w-24 text-lg font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min={0}
                  />
                ) : (
                  <p className="text-lg font-semibold">{passengers}</p>
                )}
              </div>
            </div>

            {/* Fraud rate section - clickable to show details */}
            <div
              className={cn(
                'flex items-center gap-3 rounded-lg p-2 -m-2 transition-colors',
                hasDetails && 'cursor-pointer hover:bg-background/50'
              )}
              onClick={() => hasDetails && setShowDetails(true)}
              title={hasDetails ? 'Cliquer pour voir le détail' : undefined}
            >
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
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">Voyageurs</p>
                <p className="text-xl font-bold">{passengers}</p>
              </div>
              <div className={cn('p-3 rounded-lg', getRateBgColor(fraudRate))}>
                <p className="text-xs text-muted-foreground">Taux de fraude</p>
                <p className={cn('text-xl font-bold', getRateColor(fraudRate))}>
                  {fraudRate.toFixed(2)}%
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
                      <span className="text-sm">STT 50%</span>
                      <Badge variant="secondary">{stt50Count} × 50€ = {stt50Count * 50}€</Badge>
                    </div>
                  )}
                  {stt100Count > 0 && (
                    <div className="flex items-center justify-between p-2 rounded bg-muted">
                      <span className="text-sm">STT 100%</span>
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

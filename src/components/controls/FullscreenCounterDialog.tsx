import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Minus, 
  Plus, 
  Train, 
  ChevronLeft, 
  ChevronRight,
  Users,
  UserX
} from 'lucide-react';
import type { EmbarkmentTrain } from './EmbarkmentControl';
import { getFraudThresholds } from '@/lib/stats';

interface FullscreenCounterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trains: EmbarkmentTrain[];
  onUpdateTrain: (id: string, updates: Partial<EmbarkmentTrain>) => void;
  globalStats: {
    totalControlled: number;
    totalRefused: number;
    globalFraudRate: number;
  };
  readOnly?: boolean;
}

function getThresholdColor(rate: number): 'green' | 'yellow' | 'red' {
  const thresholds = getFraudThresholds();
  if (rate < thresholds.low) return 'green';
  if (rate < thresholds.medium) return 'yellow';
  return 'red';
}

export function FullscreenCounterDialog({
  open,
  onOpenChange,
  trains,
  onUpdateTrain,
  globalStats,
  readOnly = false,
}: FullscreenCounterDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Reset to first train when dialog opens
  useEffect(() => {
    if (open && trains.length > 0) {
      setCurrentIndex(0);
    }
  }, [open, trains.length]);

  if (trains.length === 0) return null;

  const currentTrain = trains[currentIndex];
  const trainFraudRate = currentTrain.controlled > 0 
    ? (currentTrain.refused / currentTrain.controlled) * 100 
    : 0;
  const trainColor = getThresholdColor(trainFraudRate);
  const globalColor = getThresholdColor(globalStats.globalFraudRate);

  const goToPrev = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : trains.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex(prev => (prev < trains.length - 1 ? prev + 1 : 0));
  };

  const handleIncrement = (field: 'controlled' | 'refused', amount: number) => {
    if (readOnly) return;
    const newValue = Math.max(0, currentTrain[field] + amount);
    onUpdateTrain(currentTrain.id, { [field]: newValue });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-none w-screen h-screen m-0 p-0 rounded-none border-0 flex flex-col"
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
            <DialogTitle className="flex items-center gap-2">
              <Train className="h-5 w-5 text-primary" />
              {currentTrain.trainNumber}
              {currentTrain.departureTime && (
                <span className="text-muted-foreground font-normal">
                  {currentTrain.departureTime}
                </span>
              )}
              {currentTrain.platform && (
                <Badge variant="outline">Q{currentTrain.platform}</Badge>
              )}
            </DialogTitle>
            <Badge variant="secondary">{currentIndex + 1}/{trains.length}</Badge>
          </div>
        </DialogHeader>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Train navigation */}
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={goToPrev}
              disabled={trains.length <= 1}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {currentTrain.origin} → {currentTrain.destination}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={goToNext}
              disabled={trains.length <= 1}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>

          {/* Counters */}
          <div className="flex-1 flex flex-col justify-center gap-6 p-4">
            {/* Controlled counter */}
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Users className="h-5 w-5" />
                <span className="text-sm font-medium">Personnes contrôlées</span>
              </div>
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-16 w-16 text-xl"
                  onClick={() => handleIncrement('controlled', -10)}
                  disabled={readOnly}
                >
                  -10
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-16 w-16"
                  onClick={() => handleIncrement('controlled', -1)}
                  disabled={readOnly}
                >
                  <Minus className="h-6 w-6" />
                </Button>
                <motion.div 
                  key={`controlled-${currentTrain.controlled}`}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="w-24 text-center"
                >
                  <span className="text-5xl font-bold">{currentTrain.controlled}</span>
                </motion.div>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-16 w-16"
                  onClick={() => handleIncrement('controlled', 1)}
                  disabled={readOnly}
                >
                  <Plus className="h-6 w-6" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-16 w-16 text-xl"
                  onClick={() => handleIncrement('controlled', 10)}
                  disabled={readOnly}
                >
                  +10
                </Button>
              </div>
            </div>

            {/* Refused counter */}
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-destructive">
                <UserX className="h-5 w-5" />
                <span className="text-sm font-medium">Personnes refoulées</span>
              </div>
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-16 w-16 text-xl border-destructive/50 text-destructive hover:bg-destructive/10"
                  onClick={() => handleIncrement('refused', -10)}
                  disabled={readOnly}
                >
                  -10
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-16 w-16 border-destructive/50 text-destructive hover:bg-destructive/10"
                  onClick={() => handleIncrement('refused', -1)}
                  disabled={readOnly}
                >
                  <Minus className="h-6 w-6" />
                </Button>
                <motion.div 
                  key={`refused-${currentTrain.refused}`}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="w-24 text-center"
                >
                  <span className="text-5xl font-bold text-destructive">{currentTrain.refused}</span>
                </motion.div>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-16 w-16 border-destructive/50 text-destructive hover:bg-destructive/10"
                  onClick={() => handleIncrement('refused', 1)}
                  disabled={readOnly}
                >
                  <Plus className="h-6 w-6" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-16 w-16 text-xl border-destructive/50 text-destructive hover:bg-destructive/10"
                  onClick={() => handleIncrement('refused', 10)}
                  disabled={readOnly}
                >
                  +10
                </Button>
              </div>
            </div>

            {/* Train fraud rate */}
            <div className={cn(
              "text-center py-4 rounded-lg mx-4",
              trainColor === 'green' && "bg-success/10",
              trainColor === 'yellow' && "bg-warning/10",
              trainColor === 'red' && "bg-destructive/10"
            )}>
              <p className="text-sm text-muted-foreground mb-1">Taux de fraude train</p>
              <p className={cn(
                "text-4xl font-bold",
                trainColor === 'green' && "text-success",
                trainColor === 'yellow' && "text-warning",
                trainColor === 'red' && "text-destructive"
              )}>
                {trainFraudRate.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Global stats footer */}
          <div className="flex-shrink-0 border-t bg-muted/50 p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{globalStats.totalControlled}</p>
                <p className="text-xs text-muted-foreground">Total contrôlés</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">{globalStats.totalRefused}</p>
                <p className="text-xs text-muted-foreground">Total refoulés</p>
              </div>
              <div>
                <p className={cn(
                  "text-2xl font-bold",
                  globalColor === 'green' && "text-success",
                  globalColor === 'yellow' && "text-warning",
                  globalColor === 'red' && "text-destructive"
                )}>
                  {globalStats.globalFraudRate.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">Taux OP</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

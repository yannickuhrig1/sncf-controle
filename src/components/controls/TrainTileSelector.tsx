import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Train, Clock, MapPin, ArrowRight, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PreparedTrain } from './MissionPreparation';

interface TrainTileSelectorProps {
  trains: PreparedTrain[];
  selectedId?: string;
  onSelect: (train: PreparedTrain) => void;
  onRemove?: (id: string) => void;
  readOnly?: boolean;
  emptyMessage?: string;
}

export function TrainTileSelector({ 
  trains, 
  selectedId, 
  onSelect, 
  onRemove,
  readOnly = false,
  emptyMessage = "Aucun train préparé"
}: TrainTileSelectorProps) {
  if (trains.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {trains.map((train, index) => {
        const isSelected = train.id === selectedId;
        
        return (
          <motion.div
            key={train.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="relative group"
          >
            <button
              onClick={() => !readOnly && onSelect(train)}
              disabled={readOnly}
              className={cn(
                "w-full p-3 rounded-xl border-2 transition-all duration-200",
                "flex flex-col items-center gap-2 text-left",
                "hover:shadow-md hover:border-primary/50",
                isSelected 
                  ? "border-primary bg-primary/10 shadow-md ring-2 ring-primary/30" 
                  : "border-border/50 bg-card hover:bg-muted/50",
                readOnly && "opacity-60 cursor-not-allowed hover:shadow-none hover:border-border/50"
              )}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground rounded-full p-0.5">
                  <Check className="h-3 w-3" />
                </div>
              )}
              
              {/* Train icon & number */}
              <div className="flex items-center gap-2 w-full">
                <div className={cn(
                  "p-2 rounded-lg",
                  isSelected ? "bg-primary/20" : "bg-muted"
                )}>
                  <Train className={cn(
                    "h-4 w-4",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <span className="font-bold text-lg truncate flex-1">
                  {train.trainNumber}
                </span>
              </div>
              
              {/* Time */}
              {train.time && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground w-full">
                  <Clock className="h-3 w-3" />
                  <span className="font-medium">{train.time}</span>
                </div>
              )}
              
              {/* Route */}
              {(train.origin || train.destination) && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground w-full truncate">
                  {train.origin && (
                    <>
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{train.origin}</span>
                    </>
                  )}
                  {train.origin && train.destination && (
                    <ArrowRight className="h-3 w-3 shrink-0 mx-0.5" />
                  )}
                  {train.destination && (
                    <span className="truncate">{train.destination}</span>
                  )}
                </div>
              )}
            </button>
            
            {/* Remove button */}
            {onRemove && !readOnly && (
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -left-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(train.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

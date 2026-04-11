import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus, X, Users, Ticket } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  stt50Count?: number;
  stt100Count?: number;
  onStt50Change?: (value: number) => void;
  onStt100Change?: (value: number) => void;
}

export function BigPassengerCounterDialog({ open, onOpenChange, value, onChange, min = 0, max = 9999, stt50Count = 0, stt100Count = 0, onStt50Change, onStt100Change }: Props) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onOpenChange(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  const change = (delta: number) => onChange(Math.max(min, Math.min(max, value + delta)));

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-background/95 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
    >
      {/* Close */}
      <button
        onClick={() => onOpenChange(false)}
        className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Fermer"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Spacer top */}
      <div className="flex-1" />

      {/* Counter section */}
      <div className="flex flex-col items-center">
        {/* Label */}
        <div className="flex items-center gap-2 text-muted-foreground mb-6">
          <Users className="h-5 w-5" />
          <span className="text-base font-medium tracking-wide uppercase">Voyageurs</span>
        </div>

        {/* Big number */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={value}
            initial={{ scale: 0.85, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="text-[140px] font-black leading-none tabular-nums select-none text-foreground"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {value}
          </motion.div>
        </AnimatePresence>

        {/* Buttons */}
        <div className="flex items-center gap-4 mt-10">
          <Button
            variant="outline"
            size="lg"
            className="h-16 w-20 text-xl font-bold"
            onClick={() => change(-10)}
            disabled={value <= min}
          >
            −10
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-20 w-20"
            onClick={() => change(-1)}
            disabled={value <= min}
          >
            <Minus className="h-8 w-8" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-20 w-20"
            onClick={() => change(1)}
            disabled={value >= max}
          >
            <Plus className="h-8 w-8" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-16 w-20 text-xl font-bold"
            onClick={() => change(10)}
            disabled={value >= max}
          >
            +10
          </Button>
        </div>
      </div>

      {/* Spacer middle */}
      <div className="flex-1" />

      {/* STT counters at bottom */}
      <div className="w-full max-w-md px-6 pb-8">
        <div className="flex items-center gap-2 text-muted-foreground mb-3 justify-center">
          <Ticket className="h-4 w-4" />
          <span className="text-sm font-medium uppercase tracking-wider">Compteurs STT</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {/* STT 50€ — jaune/ambre */}
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">STT 50€</span>
            <span className="text-3xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{stt50Count}</span>
            <Badge className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-300 dark:border-amber-700">{stt50Count * 50}€</Badge>
            {onStt50Change && (
              <div className="flex items-center gap-2 mt-1">
                <button type="button" onClick={() => onStt50Change(Math.max(0, stt50Count - 1))}
                  className="h-9 w-9 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/60 active:scale-95 transition-all disabled:opacity-30"
                  disabled={stt50Count <= 0}>
                  <Minus className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => onStt50Change(stt50Count + 1)}
                  className="h-9 w-9 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/60 active:scale-95 transition-all">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          {/* PV 100€ — rouge */}
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
            <span className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide">PV 100€</span>
            <span className="text-3xl font-bold tabular-nums text-red-600 dark:text-red-400">{stt100Count}</span>
            <Badge className="text-xs bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-300 dark:border-red-700">{stt100Count * 100}€</Badge>
            {onStt100Change && (
              <div className="flex items-center gap-2 mt-1">
                <button type="button" onClick={() => onStt100Change(Math.max(0, stt100Count - 1))}
                  className="h-9 w-9 rounded-lg border border-red-300 dark:border-red-700 bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/60 active:scale-95 transition-all disabled:opacity-30"
                  disabled={stt100Count <= 0}>
                  <Minus className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => onStt100Change(stt100Count + 1)}
                  className="h-9 w-9 rounded-lg border border-red-300 dark:border-red-700 bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/60 active:scale-95 transition-all">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <p className="pb-6 text-xs text-muted-foreground">Appuyez sur Échap ou touchez l'extérieur pour fermer</p>
    </div>
  );
}

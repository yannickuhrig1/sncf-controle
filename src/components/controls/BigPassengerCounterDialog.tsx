import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Minus, Plus, X, Users } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function BigPassengerCounterDialog({ open, onOpenChange, value, onChange, min = 0, max = 9999 }: Props) {
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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm"
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

      <p className="mt-6 text-xs text-muted-foreground">Appuyez sur Échap ou touchez l'extérieur pour fermer</p>
    </div>
  );
}

import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CounterInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  sublabel?: string;
  variant?: 'default' | 'success' | 'danger';
  showTotal?: { unitPrice: number; label: string };
}

export function CounterInput({
  value,
  onChange,
  min = 0,
  max = 999,
  label,
  sublabel,
  variant = 'default',
  showTotal,
}: CounterInputProps) {
  const colorClasses = {
    default: 'text-foreground',
    success: 'text-green-600 dark:text-green-400',
    danger: 'text-red-600 dark:text-red-400',
  };

  const bgClasses = {
    default: 'bg-muted',
    success: 'bg-green-100 dark:bg-green-900/30',
    danger: 'bg-red-100 dark:bg-red-900/30',
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <div>
          <span className={cn('text-sm font-medium', colorClasses[variant])}>
            {label}
          </span>
          {sublabel && (
            <p className="text-xs text-muted-foreground">{sublabel}</p>
          )}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <div
          className={cn(
            'flex-1 h-9 flex items-center justify-center rounded-md font-semibold text-lg min-w-[60px]',
            bgClasses[variant],
            colorClasses[variant]
          )}
        >
          {value}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {showTotal && value > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {showTotal.label}: {value} × {showTotal.unitPrice}€ ={' '}
          <span className="font-medium">{value * showTotal.unitPrice}€</span>
        </p>
      )}
    </div>
  );
}

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type Period = 'day' | 'week' | 'month' | 'year';

interface PeriodSelectorProps {
  selectedPeriod: Period;
  onPeriodChange: (period: Period) => void;
}

const periods: { value: Period; label: string }[] = [
  { value: 'day', label: 'Jour' },
  { value: 'week', label: 'Semaine' },
  { value: 'month', label: 'Mois' },
  { value: 'year', label: 'Année' },
];

export function PeriodSelector({ selectedPeriod, onPeriodChange }: PeriodSelectorProps) {
  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
      {periods.map((period) => (
        <Button
          key={period.value}
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-3 text-xs font-medium transition-colors",
            selectedPeriod === period.value
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => onPeriodChange(period.value)}
        >
          {period.label}
        </Button>
      ))}
    </div>
  );
}

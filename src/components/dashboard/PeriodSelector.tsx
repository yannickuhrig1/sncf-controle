import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type Period = 'day' | 'week' | 'month' | 'year' | 'custom';

interface PeriodSelectorProps {
  selectedPeriod: Period;
  onPeriodChange: (period: Period) => void;
  customStart?: string;
  customEnd?: string;
  onCustomStartChange?: (v: string) => void;
  onCustomEndChange?: (v: string) => void;
}

const periods: { value: Period; label: string }[] = [
  { value: 'day',    label: 'Jour' },
  { value: 'week',   label: 'Semaine' },
  { value: 'month',  label: 'Mois' },
  { value: 'year',   label: 'Année' },
  { value: 'custom', label: 'Perso.' },
];

export function PeriodSelector({
  selectedPeriod,
  onPeriodChange,
  customStart = '',
  customEnd = '',
  onCustomStartChange,
  onCustomEndChange,
}: PeriodSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
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

      {selectedPeriod === 'custom' && (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={customStart}
            onChange={(e) => onCustomStartChange?.(e.target.value)}
            className="h-8 px-2 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <span className="text-xs text-muted-foreground">→</span>
          <input
            type="date"
            value={customEnd}
            min={customStart}
            onChange={(e) => onCustomEndChange?.(e.target.value)}
            className="h-8 px-2 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      )}
    </div>
  );
}

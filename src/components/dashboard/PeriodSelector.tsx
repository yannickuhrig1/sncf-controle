import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type Period = 'day' | 'week' | 'month' | 'year' | 'custom';

interface PeriodSelectorProps {
  selectedPeriod: Period | 'all';
  onPeriodChange: (period: Period | 'all') => void;
  showAll?: boolean;
  customStart?: string;
  customEnd?: string;
  onCustomStartChange?: (v: string) => void;
  onCustomEndChange?: (v: string) => void;
  // Sub-selectors for day / month / year
  selectedDay?: string;
  onDayChange?: (v: string) => void;
  selectedMonth?: number;
  onMonthChange?: (v: number) => void;
  selectedYear?: number;
  onYearChange?: (v: number) => void;
}

const PERIODS: { value: Period; label: string }[] = [
  { value: 'day',    label: 'Jour' },
  { value: 'week',   label: 'Semaine' },
  { value: 'month',  label: 'Mois' },
  { value: 'year',   label: 'Année' },
  { value: 'custom', label: 'Perso.' },
];

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

export function PeriodSelector({
  selectedPeriod,
  onPeriodChange,
  showAll = false,
  customStart = '',
  customEnd = '',
  onCustomStartChange,
  onCustomEndChange,
  selectedDay = '',
  onDayChange,
  selectedMonth,
  onMonthChange,
  selectedYear,
  onYearChange,
}: PeriodSelectorProps) {
  const allPeriods = showAll
    ? [{ value: 'all' as const, label: 'Tous' }, ...PERIODS]
    : PERIODS;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1 bg-muted rounded-lg p-1 flex-wrap">
        {allPeriods.map((period) => (
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

      {selectedPeriod === 'day' && onDayChange && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDay}
            onChange={(e) => onDayChange(e.target.value)}
            className="h-8 px-2 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      )}

      {selectedPeriod === 'month' && onMonthChange && onYearChange && (
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedMonth}
            onChange={(e) => onMonthChange(Number(e.target.value))}
            className="h-8 px-2 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="h-8 px-2 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {Array.from({ length: new Date().getFullYear() - 2022 }, (_, i) => 2023 + i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      )}

      {selectedPeriod === 'year' && onYearChange && (
        <div className="flex items-center gap-2">
          <select
            value={selectedYear}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="h-8 px-2 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {Array.from({ length: new Date().getFullYear() - 2022 }, (_, i) => 2023 + i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      )}

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

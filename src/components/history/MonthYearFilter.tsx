import { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarDays, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface MonthYearFilterProps {
  selectedMonth: number | undefined;
  selectedYear: number | undefined;
  onMonthChange: (month: number | undefined) => void;
  onYearChange: (year: number | undefined) => void;
  onClear: () => void;
}

const MONTHS = [
  { value: 0, label: 'Janvier' },
  { value: 1, label: 'Février' },
  { value: 2, label: 'Mars' },
  { value: 3, label: 'Avril' },
  { value: 4, label: 'Mai' },
  { value: 5, label: 'Juin' },
  { value: 6, label: 'Juillet' },
  { value: 7, label: 'Août' },
  { value: 8, label: 'Septembre' },
  { value: 9, label: 'Octobre' },
  { value: 10, label: 'Novembre' },
  { value: 11, label: 'Décembre' },
];

// Generate years from 2020 to current year + 1
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2019 }, (_, i) => 2020 + i).reverse();

export function MonthYearFilter({
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  onClear,
}: MonthYearFilterProps) {
  const hasFilter = selectedMonth !== undefined || selectedYear !== undefined;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
      
      {/* Month selector */}
      <Select
        value={selectedMonth !== undefined ? String(selectedMonth) : 'all'}
        onValueChange={(v) => onMonthChange(v === 'all' ? undefined : parseInt(v, 10))}
      >
        <SelectTrigger className="w-[130px] h-8">
          <SelectValue placeholder="Mois" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les mois</SelectItem>
          {MONTHS.map((month) => (
            <SelectItem key={month.value} value={String(month.value)}>
              {month.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Year selector */}
      <Select
        value={selectedYear !== undefined ? String(selectedYear) : 'all'}
        onValueChange={(v) => onYearChange(v === 'all' ? undefined : parseInt(v, 10))}
      >
        <SelectTrigger className="w-[100px] h-8">
          <SelectValue placeholder="Année" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes</SelectItem>
          {YEARS.map((year) => (
            <SelectItem key={year} value={String(year)}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilter && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-8 px-2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}

      {hasFilter && (
        <Badge variant="secondary" className="text-xs">
          Filtré
        </Badge>
      )}
    </div>
  );
}

// Helper to get date range from month/year selection
export function getDateRangeFromMonthYear(
  month: number | undefined,
  year: number | undefined
): { startDate: Date | undefined; endDate: Date | undefined } {
  if (year === undefined && month === undefined) {
    return { startDate: undefined, endDate: undefined };
  }

  const targetYear = year ?? new Date().getFullYear();
  
  if (month !== undefined) {
    // Specific month
    const date = new Date(targetYear, month, 1);
    return {
      startDate: startOfMonth(date),
      endDate: endOfMonth(date),
    };
  } else {
    // Full year
    const date = new Date(targetYear, 0, 1);
    return {
      startDate: startOfYear(date),
      endDate: endOfYear(date),
    };
  }
}

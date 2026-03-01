import { useState } from 'react';
import {
  format, addDays, addMonths, addYears,
  startOfWeek, endOfWeek, getWeek,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { Period } from '@/components/dashboard/PeriodSelector';

interface DashboardDatePickerProps {
  date: Date;
  onDateChange: (date: Date) => void;
  period?: Period;
}

export function DashboardDatePicker({ date, onDateChange, period = 'day' }: DashboardDatePickerProps) {
  const [open, setOpen] = useState(false);
  const now = new Date();

  if (period === 'custom') return null;

  const goPrev = () => {
    switch (period) {
      case 'week':  onDateChange(addDays(date, -7)); break;
      case 'month': onDateChange(addMonths(date, -1)); break;
      case 'year':  onDateChange(addYears(date, -1)); break;
      default:      onDateChange(addDays(date, -1)); break;
    }
  };

  const goNext = () => {
    switch (period) {
      case 'week':  onDateChange(addDays(date, 7)); break;
      case 'month': onDateChange(addMonths(date, 1)); break;
      case 'year':  onDateChange(addYears(date, 1)); break;
      default:      onDateChange(addDays(date, 1)); break;
    }
  };

  const goToCurrent = () => onDateChange(new Date());

  const isCurrentPeriod = () => {
    switch (period) {
      case 'week':
        return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
            === format(startOfWeek(now,  { weekStartsOn: 1 }), 'yyyy-MM-dd');
      case 'month': return format(date, 'yyyy-MM') === format(now, 'yyyy-MM');
      case 'year':  return format(date, 'yyyy')    === format(now, 'yyyy');
      default:      return format(date, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
    }
  };

  const isNextDisabled = () => {
    switch (period) {
      case 'week':
        return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
            >= format(startOfWeek(now,  { weekStartsOn: 1 }), 'yyyy-MM-dd');
      case 'month': return format(date, 'yyyy-MM') >= format(now, 'yyyy-MM');
      case 'year':  return format(date, 'yyyy')    >= format(now, 'yyyy');
      default:      return format(date, 'yyyy-MM-dd') >= format(now, 'yyyy-MM-dd');
    }
  };

  const getLabel = () => {
    switch (period) {
      case 'week': {
        const start = startOfWeek(date, { weekStartsOn: 1 });
        const end   = endOfWeek(date,   { weekStartsOn: 1 });
        const weekNum = getWeek(date, { weekStartsOn: 1, firstWeekContainsDate: 4 });
        return `Sem. ${weekNum}  ·  ${format(start, 'd MMM', { locale: fr })} – ${format(end, 'd MMM', { locale: fr })}`;
      }
      case 'month': return format(date, 'MMMM yyyy', { locale: fr });
      case 'year':  return format(date, 'yyyy');
      default:      return format(date, 'EEEE d MMMM', { locale: fr });
    }
  };

  const currentPeriodLabel = () => {
    switch (period) {
      case 'week':  return 'Semaine actuelle';
      case 'month': return 'Mois actuel';
      case 'year':  return 'Année actuelle';
      default:      return "Aujourd'hui";
    }
  };

  const minWidth = period === 'week' ? 'min-w-[230px]' : period === 'month' ? 'min-w-[150px]' : period === 'year' ? 'min-w-[90px]' : 'min-w-[160px]';
  const current = isCurrentPeriod();

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goPrev}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {period === 'year' ? (
        <Button
          variant="outline"
          size="sm"
          className={cn("justify-center font-normal", minWidth)}
          onClick={() => { if (!current) goToCurrent(); }}
          title={current ? '' : currentPeriodLabel()}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {getLabel()}
        </Button>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn("justify-start text-left font-normal", minWidth)}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {getLabel()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(newDate) => {
                if (newDate) {
                  onDateChange(newDate);
                  setOpen(false);
                }
              }}
              disabled={(d) => d > now}
              initialFocus
              locale={fr}
              className="p-3 pointer-events-auto"
            />
            {!current && (
              <div className="p-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => { goToCurrent(); setOpen(false); }}
                >
                  {currentPeriodLabel()}
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={goNext}
        disabled={isNextDisabled()}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

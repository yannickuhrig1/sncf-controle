import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type Control = Database['public']['Tables']['controls']['Row'];

interface HourlyHeatmapProps {
  controls: Control[];
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 5); // 5h to 22h
const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function HourlyHeatmap({ controls }: HourlyHeatmapProps) {
  const heatmapData = useMemo(() => {
    // Build a 7x18 grid (days x hours)
    const grid: number[][] = Array.from({ length: 7 }, () =>
      Array(HOURS.length).fill(0)
    );

    controls.forEach(c => {
      const date = new Date(c.control_date + 'T00:00:00');
      let dayIndex = date.getDay() - 1; // 0=Mon
      if (dayIndex < 0) dayIndex = 6; // Sunday

      const hour = parseInt(c.control_time.slice(0, 2), 10);
      const hourIndex = HOURS.indexOf(hour);
      if (hourIndex >= 0 && dayIndex >= 0 && dayIndex < 7) {
        grid[dayIndex][hourIndex] += 1;
      }
    });

    const maxVal = Math.max(1, ...grid.flat());
    return { grid, maxVal };
  }, [controls]);

  const getIntensity = (value: number): string => {
    if (value === 0) return 'bg-muted/30';
    const ratio = value / heatmapData.maxVal;
    if (ratio < 0.25) return 'bg-primary/20';
    if (ratio < 0.5) return 'bg-primary/40';
    if (ratio < 0.75) return 'bg-primary/65';
    return 'bg-primary/90';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Heatmap horaire
        </CardTitle>
        <CardDescription>Répartition des contrôles par jour et heure (semaine en cours)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[500px]">
            {/* Hour labels */}
            <div className="flex mb-1">
              <div className="w-10 flex-shrink-0" />
              {HOURS.map(h => (
                <div key={h} className="flex-1 text-center text-[10px] text-muted-foreground font-mono">
                  {h}h
                </div>
              ))}
            </div>

            {/* Grid rows */}
            {DAY_LABELS.map((day, dayIdx) => (
              <div key={day} className="flex items-center gap-0.5 mb-0.5">
                <div className="w-10 flex-shrink-0 text-xs text-muted-foreground font-medium">
                  {day}
                </div>
                {HOURS.map((hour, hourIdx) => {
                  const value = heatmapData.grid[dayIdx][hourIdx];
                  return (
                    <Tooltip key={`${dayIdx}-${hourIdx}`}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            'flex-1 aspect-square rounded-sm transition-colors cursor-default min-h-[20px]',
                            getIntensity(value)
                          )}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <p className="font-medium">{day} {hour}h-{hour + 1}h</p>
                        <p>{value} contrôle{value !== 1 ? 's' : ''}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}

            {/* Legend */}
            <div className="flex items-center gap-2 mt-3 justify-end">
              <span className="text-[10px] text-muted-foreground">Moins</span>
              {['bg-muted/30', 'bg-primary/20', 'bg-primary/40', 'bg-primary/65', 'bg-primary/90'].map((cls, i) => (
                <div key={i} className={cn('h-3 w-3 rounded-sm', cls)} />
              ))}
              <span className="text-[10px] text-muted-foreground">Plus</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

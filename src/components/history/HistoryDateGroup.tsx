import { Calendar, Users, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ControlCard } from './ControlCard';
import { TrainGroupCard } from './TrainGroupCard';
import { EmbarkmentHistoryView } from './EmbarkmentHistoryView';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';
import type { HistoryViewMode } from '@/hooks/useUserPreferences';

type Control = Database['public']['Tables']['controls']['Row'];

interface HistoryDateGroupProps {
  date: string;
  groups: { type: 'train' | 'gare'; controls: Control[] }[];
  solo: Control[];
  embarkments: any[];
  totals: { passengers: number; fraud: number; rate: number };

  profileMap: Record<string, { first_name: string; last_name: string }>;
  currentUserId: string | undefined;
  isUserAdmin: boolean;
  isUserManager: boolean;

  viewMode: HistoryViewMode;

  onControlClick: (control: Control) => void;
  onGroupClick: (controls: Control[]) => void;
  onMissionClick: (mission: any) => void;
  onMissionDelete: (id: string) => Promise<boolean>;
  onMissionRemoveTrain: (missionId: string, trainId: string) => Promise<boolean>;
}

function getRateColorClass(rate: number, hasPax: boolean): string {
  if (!hasPax)   return 'text-muted-foreground';
  if (rate === 0) return 'text-emerald-600 dark:text-emerald-400';
  if (rate < 3)   return 'text-yellow-600 dark:text-yellow-400';
  if (rate < 7)   return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

export function HistoryDateGroup({
  date, groups, solo, embarkments, totals,
  profileMap, currentUserId, isUserAdmin, isUserManager,
  viewMode,
  onControlClick, onGroupClick, onMissionClick, onMissionDelete, onMissionRemoveTrain,
}: HistoryDateGroupProps) {
  const totalCount = groups.reduce((n, g) => n + g.controls.length, 0) + solo.length + embarkments.length;
  const dayDate = new Date(date);
  const isToday = dayDate.toDateString() === new Date().toDateString();
  const dayLabel = format(dayDate, 'EEEE d MMMM yyyy', { locale: fr });
  const hasPax = totals.passengers > 0;

  return (
    <section className="space-y-2">
      {/* En-tête sticky avec résumé du jour */}
      <header
        className={cn(
          'sticky top-0 z-10 -mx-1 px-1 py-2 backdrop-blur',
          'bg-background/85 supports-[backdrop-filter]:bg-background/70',
          'border-b border-border/40 flex items-center gap-3 flex-wrap'
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className="h-4 w-4 text-primary shrink-0" />
          <h2 className="text-sm font-semibold capitalize truncate">
            {dayLabel}
          </h2>
          {isToday && (
            <span className="text-[10px] font-medium uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">
              Aujourd'hui
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 ml-auto text-xs text-muted-foreground tabular-nums">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {totals.passengers}
          </span>
          {totals.fraud > 0 && (
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              {totals.fraud}
            </span>
          )}
          <span className={cn('font-semibold', getRateColorClass(totals.rate, hasPax))}>
            {hasPax ? `${totals.rate.toFixed(1)}%` : '—'}
          </span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">
            {totalCount} {totalCount > 1 ? 'éléments' : 'élément'}
          </span>
        </div>
      </header>

      <div className="space-y-2">
        {groups.map((g, i) => (
          <TrainGroupCard
            key={`g-${i}`}
            groupType={g.type}
            controls={g.controls}
            profileMap={profileMap}
            currentUserId={currentUserId}
            isUserAdmin={isUserAdmin}
            isUserManager={isUserManager}
            onControlClick={onControlClick}
            onGroupClick={onGroupClick}
          />
        ))}

        {solo.map(control => (
          <ControlCard
            key={control.id}
            control={control}
            onClick={() => onControlClick(control)}
          />
        ))}

        {embarkments.length > 0 && (
          <EmbarkmentHistoryView
            missions={embarkments}
            viewMode={viewMode}
            profileMap={profileMap}
            onMissionClick={onMissionClick}
            onDelete={onMissionDelete}
            onRemoveTrain={onMissionRemoveTrain}
            embedded
          />
        )}
      </div>
    </section>
  );
}

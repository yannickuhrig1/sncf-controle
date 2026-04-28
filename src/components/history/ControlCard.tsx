import { Train, Building2, TrainTrack, Clock, Users, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type Control = Database['public']['Tables']['controls']['Row'];
type LocationType = Database['public']['Enums']['location_type'];

const locationIcons: Record<LocationType, React.ComponentType<{ className?: string }>> = {
  train: Train,
  gare: Building2,
  quai: TrainTrack,
};

interface ControlCardProps {
  control: Control;
  onClick: () => void;
  showDate?: boolean;
}

/**
 * Bandeau de gauche avec couleur selon le taux de fraude.
 * Vert : 0%, jaune : <3%, orange : 3-7%, rouge : >7%.
 */
function getFraudBandClasses(rate: number, hasPassengers: boolean): string {
  if (!hasPassengers) return 'bg-slate-300 dark:bg-slate-700';
  if (rate === 0)     return 'bg-emerald-500';
  if (rate < 3)       return 'bg-yellow-400';
  if (rate < 7)       return 'bg-orange-500';
  return 'bg-red-500';
}

function getFraudTextClasses(rate: number, hasPassengers: boolean): string {
  if (!hasPassengers) return 'text-slate-500 dark:text-slate-400';
  if (rate === 0)     return 'text-emerald-700 dark:text-emerald-400';
  if (rate < 3)       return 'text-yellow-700 dark:text-yellow-400';
  if (rate < 7)       return 'text-orange-700 dark:text-orange-400';
  return 'text-red-700 dark:text-red-400';
}

export function ControlCard({ control, onClick, showDate = false }: ControlCardProps) {
  const Icon = locationIcons[control.location_type];
  const fraudCount = control.tarifs_controle + control.pv + control.ri_negative;
  const fraudRate = control.nb_passagers > 0
    ? (fraudCount / control.nb_passagers) * 100
    : 0;

  const isCivile     = !!(control as any).is_civile;
  const isCancelled  = !!(control as any).is_cancelled;
  const isOvercrowd  = !!(control as any).is_overcrowded;
  const isPolice     = !!(control as any).is_police_on_board;
  const isSuge       = !!(control as any).is_suge_on_board;

  const bordTotal =
    (control.tarif_bord_stt_50 || 0) +
    (control.tarif_bord_stt_100 || 0) +
    (control.tarif_bord_rnv || 0) +
    (control.tarif_bord_titre_tiers || 0) +
    (control.tarif_bord_doc_naissance || 0) +
    (control.tarif_bord_autre || 0);
  const riTotal = (control.ri_positive || 0) + (control.ri_negative || 0);

  const stateBadges: { label: string; cls: string }[] = [
    isCivile    && { label: 'Civile',    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    isCancelled && { label: 'Supprimé',  cls: 'bg-slate-700 text-white' },
    isOvercrowd && { label: 'Sur-occ.',  cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    isPolice    && { label: 'Police',    cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    isSuge      && { label: 'SUGE',      cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  ].filter(Boolean) as { label: string; cls: string }[];

  const countBadges: { label: string; cls: string }[] = [
    bordTotal > 0              && { label: `Bord ${bordTotal}`,                 cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    control.tarifs_controle > 0 && { label: `TC ${control.tarifs_controle}`,    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    control.pv > 0              && { label: `PV ${control.pv}`,                 cls: 'bg-red-500 text-white' },
    riTotal > 0                 && { label: `RI ${riTotal}`,                    cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  ].filter(Boolean) as { label: string; cls: string }[];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group w-full text-left rounded-lg border bg-card overflow-hidden',
        'hover:bg-muted/40 hover:border-border/80 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isCivile && 'border-emerald-300/60 dark:border-emerald-800/60'
      )}
    >
      <div className="flex items-stretch">
        {/* Bandeau coloré gauche */}
        <div
          className={cn('w-1.5 shrink-0', getFraudBandClasses(fraudRate, control.nb_passagers > 0))}
          aria-hidden
        />

        {/* Contenu */}
        <div className="flex-1 min-w-0 p-3 sm:p-3.5">
          <div className="flex items-start gap-3">
            {/* Icône type */}
            <div className="p-1.5 rounded-md bg-muted shrink-0 mt-0.5">
              <Icon className="h-4 w-4 text-foreground/70" />
            </div>

            {/* Bloc central */}
            <div className="flex-1 min-w-0">
              {/* Titre + n° */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm truncate">
                  {control.origin && control.destination
                    ? `${control.origin} → ${control.destination}`
                    : control.location}
                </span>
                {control.train_number && (
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 shrink-0">
                    N° {control.train_number}
                  </Badge>
                )}
              </div>

              {/* Métadonnées */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                {showDate && (
                  <span>
                    {format(new Date(control.control_date), 'dd/MM/yy', { locale: fr })}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {control.control_time.slice(0, 5)}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {control.nb_passagers}
                </span>
              </div>

              {/* Badges (état + comptes) */}
              {(stateBadges.length > 0 || countBadges.length > 0) && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {stateBadges.map((b, i) => (
                    <span
                      key={`s-${i}`}
                      className={cn('inline-flex items-center text-[10px] px-1.5 py-0.5 rounded font-medium', b.cls)}
                    >
                      {b.label}
                    </span>
                  ))}
                  {countBadges.map((b, i) => (
                    <span
                      key={`c-${i}`}
                      className={cn('inline-flex items-center text-[10px] px-1.5 py-0.5 rounded font-medium', b.cls)}
                    >
                      {b.label}
                    </span>
                  ))}
                </div>
              )}

              {/* Note */}
              {control.notes && (
                <p className="text-xs text-muted-foreground mt-1.5 italic line-clamp-2">
                  {control.notes}
                </p>
              )}
            </div>

            {/* Bloc fraude à droite */}
            <div className="flex flex-col items-end shrink-0 gap-0.5">
              <div className={cn('text-base font-bold leading-none tabular-nums', getFraudTextClasses(fraudRate, control.nb_passagers > 0))}>
                {fraudRate.toFixed(1)}%
              </div>
              {fraudCount > 0 && (
                <div className="text-[10px] text-muted-foreground">
                  {fraudCount} fraude{fraudCount > 1 ? 's' : ''}
                </div>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 mt-0.5 group-hover:text-muted-foreground transition-colors" />
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

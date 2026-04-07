import { Train, Building2, Users, Clock, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type Control = Database['public']['Tables']['controls']['Row'];

interface TrainGroupCardProps {
  groupType: 'train' | 'gare';
  controls: Control[];
  profileMap: Record<string, { first_name: string; last_name: string }>;
  currentUserId: string | undefined;
  isUserAdmin: boolean;
  isUserManager: boolean;
  onControlClick: (control: Control) => void;
  onGroupClick?: (controls: Control[]) => void;
}

function getFraudRateColor(rate: number) {
  if (rate === 0) return 'text-green-600 dark:text-green-400';
  if (rate < 3)   return 'text-yellow-600 dark:text-yellow-400';
  if (rate < 7)   return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? '?'}${lastName[0] ?? ''}`.toUpperCase();
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-rose-500',
  'bg-amber-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
];

function avatarColor(agentId: string) {
  let hash = 0;
  for (let i = 0; i < agentId.length; i++) hash = (hash * 31 + agentId.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function TrainGroupCard({
  groupType,
  controls,
  profileMap,
  onControlClick,
  onGroupClick,
}: TrainGroupCardProps) {
  const sorted = [...controls].sort((a, b) => a.control_time.localeCompare(b.control_time));

  // Agrégats
  const totalPax    = sorted.reduce((s, c) => s + c.nb_passagers, 0);
  const totalFraud  = sorted.reduce((s, c) => s + c.tarifs_controle + c.pv + c.ri_negative, 0);
  const fraudRate   = totalPax > 0 ? (totalFraud / totalPax) * 100 : 0;

  // En-tête : train_number ou location
  const first = sorted[0];
  const title = groupType === 'train'
    ? `N° ${first.train_number ?? first.location}`
    : first.location;
  const subtitle = first.origin && first.destination
    ? `${first.origin} → ${first.destination}`
    : null;

  // Retard : max des retards enregistrés sur le groupe
  const maxDelay = sorted.reduce((m, c) => {
    const d = c.train_delay_minutes ?? 0;
    return d > m ? d : m;
  }, 0);

  const Icon = groupType === 'train' ? Train : Building2;

  return (
    <Card className="overflow-hidden border-primary/20">
      {/* En-tête agrégé — cliquable pour vue fusionnée */}
      <div
        className={cn('flex items-start gap-3 p-3 bg-primary/5 border-b border-primary/10', onGroupClick && 'cursor-pointer hover:bg-primary/10 transition-colors')}
        onClick={onGroupClick ? () => onGroupClick(controls) : undefined}
      >
        <div className="p-1.5 rounded-md bg-primary/15 shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{title}</span>
            {subtitle && (
              <span className="text-xs text-muted-foreground">{subtitle}</span>
            )}
            <Badge variant="secondary" className="ml-auto text-[10px] shrink-0">
              {sorted.length} agent{sorted.length > 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {totalPax} voy.
            </span>
            {totalFraud > 0 && (
              <span>{totalFraud} fraude{totalFraud > 1 ? 's' : ''}</span>
            )}
            <span className={cn('font-semibold', getFraudRateColor(fraudRate))}>
              {fraudRate.toFixed(1)} %
            </span>
            {maxDelay > 0 && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300 h-4">
                +{maxDelay} min
              </Badge>
            )}
          </div>
          {/* Badges agrégés de tous les contrôles */}
          {(() => {
            const totalBord = sorted.reduce((s, c) =>
              s + (c.tarif_bord_stt_50 || 0) + (c.tarif_bord_stt_100 || 0)
                + (c.tarif_bord_rnv || 0) + (c.tarif_bord_titre_tiers || 0)
                + (c.tarif_bord_doc_naissance || 0) + (c.tarif_bord_autre || 0), 0);
            const totalTC  = sorted.reduce((s, c) => s + c.tarifs_controle, 0);
            const totalPV  = sorted.reduce((s, c) => s + c.pv, 0);
            const totalRI  = sorted.reduce((s, c) => s + c.ri_positive + c.ri_negative, 0);
            if (totalBord === 0 && totalTC === 0 && totalPV === 0 && totalRI === 0) return null;
            return (
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {totalBord > 0 && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0 h-4">
                    Bord: {totalBord}
                  </Badge>
                )}
                {totalTC > 0 && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 h-4">
                    TC: {totalTC}
                  </Badge>
                )}
                {totalPV > 0 && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-red-500 text-white border-0 h-4">
                    PV: {totalPV}
                  </Badge>
                )}
                {totalRI > 0 && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-0 h-4">
                    RI: {totalRI}
                  </Badge>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Sous-lignes par agent */}
      <CardContent className="p-0">
        {sorted.map((control, i) => {
          const agent = profileMap[control.agent_id];
          const initials = agent
            ? getInitials(agent.first_name, agent.last_name)
            : '?';
          const agentName = agent
            ? `${agent.first_name} ${agent.last_name}`
            : 'Agent inconnu';
          const fraud = control.tarifs_controle + control.pv + control.ri_negative;
          const rate  = control.nb_passagers > 0 ? (fraud / control.nb_passagers) * 100 : 0;
          const color = avatarColor(control.agent_id);

          return (
            <button
              key={control.id}
              onClick={() => onControlClick(control)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50',
                i < sorted.length - 1 && 'border-b border-border/50'
              )}
            >
              {/* Avatar */}
              <div className={cn(
                'h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] font-bold',
                color
              )}>
                {initials}
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium truncate">{agentName}</span>
                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0">
                    <Clock className="h-2.5 w-2.5" />
                    {control.control_time.slice(0, 5)}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {control.nb_passagers} voy.
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                  {(() => {
                    const bord = (control.tarif_bord_stt_50 || 0) + (control.tarif_bord_stt_100 || 0)
                      + (control.tarif_bord_rnv || 0) + (control.tarif_bord_titre_tiers || 0)
                      + (control.tarif_bord_doc_naissance || 0) + (control.tarif_bord_autre || 0);
                    return bord > 0 ? (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0 h-4">
                        Bord:{bord}
                      </Badge>
                    ) : null;
                  })()}
                  {control.tarifs_controle > 0 && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 h-4">
                      TC:{control.tarifs_controle}
                    </Badge>
                  )}
                  {control.pv > 0 && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 bg-red-500 text-white border-0 h-4">
                      PV:{control.pv}
                    </Badge>
                  )}
                  {control.ri_positive > 0 && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-0 h-4">
                      RI+:{control.ri_positive}
                    </Badge>
                  )}
                  {control.ri_negative > 0 && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-0 h-4">
                      RI-:{control.ri_negative}
                    </Badge>
                  )}
                  {(control as any).is_cancelled && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 bg-slate-700 text-white border-0 h-4">
                      Supprimé
                    </Badge>
                  )}
                  {(control as any).is_overcrowded && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0 h-4">
                      Sur-occ.
                    </Badge>
                  )}
                  {(control as any).is_police_on_board && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0 h-4">
                      Police
                    </Badge>
                  )}
                  {(control as any).is_suge_on_board && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-0 h-4">
                      SUGE
                    </Badge>
                  )}
                  {(control.train_delay_minutes ?? 0) > 0 && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300 h-4">
                      +{control.train_delay_minutes} min
                    </Badge>
                  )}
                </div>
              </div>

              {/* Taux individuel */}
              <div className={cn('text-xs font-bold shrink-0', getFraudRateColor(rate))}>
                {rate.toFixed(1)}%
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

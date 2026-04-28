import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { normalizeStationName } from '@/components/controls/StationAutocomplete';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getFraudRateColor, getFraudRateBgColor } from '@/lib/stats';
import { downloadEmbarkmentPDF, downloadEmbarkmentHTML, openEmbarkmentHTMLPreview, downloadGroupedEmbarkmentPDF } from '@/lib/embarkmentExportUtils';
import type { EmbarkmentMissionData, EmbarkmentTrain } from '@/components/controls/EmbarkmentControl';
import { DateRangeFilter } from '@/components/history/DateRangeFilter';
import { cn } from '@/lib/utils';
import {
  Train,
  Building2,
  Calendar,
  Users,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Eye,
  Download,
  FileText,
  Globe,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  TrendingDown,
  Search,
  X,
  LayoutGrid,
  List,
  TableIcon,
  Filter,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface EmbarkmentMissionRow {
  id: string;
  agent_id: string;
  team_id: string | null;
  mission_date: string;
  station_name: string;
  global_comment: string | null;
  trains: EmbarkmentTrain[];
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export type EmbarkmentViewMode = 'list' | 'table' | 'grid';

interface EmbarkmentHistoryViewProps {
  missions: EmbarkmentMissionRow[];
  viewMode: 'list' | 'table';
  profileMap?: Record<string, { first_name: string; last_name: string }>;
  onMissionClick?: (mission: EmbarkmentMissionRow) => void;
  onDelete?: (id: string) => Promise<boolean>;
  onRemoveTrain?: (missionId: string, trainId: string) => Promise<boolean>;
  isLoading?: boolean;
  /** Quand true, n'affiche que les cartes — pas de filtres, ni stats, ni en-tête de date.
   *  Utilisé quand le composant est rendu à l'intérieur d'un HistoryDateGroup
   *  qui fournit déjà la recherche globale et l'en-tête. */
  embedded?: boolean;
}

// Avatar helpers (same as TrainGroupCard)
const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-rose-500',
  'bg-amber-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
];

function avatarColor(agentId: string) {
  let hash = 0;
  for (let i = 0; i < agentId.length; i++) hash = (hash * 31 + agentId.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? '?'}${lastName[0] ?? ''}`.toUpperCase();
}

// Grouped mission: multiple agents at the same station on the same date
interface GroupedMission {
  key: string;
  station_name: string;
  mission_date: string;
  missions: EmbarkmentMissionRow[];
  allTrains: Array<EmbarkmentTrain & { agent_id: string; mission_id: string }>;
  totalControlled: number;
  totalRefused: number;
  fraudRate: number;
  trainCount: number;
  agentIds: string[];
  is_completed: boolean;
}

function groupMissions(missions: EmbarkmentMissionRow[]): GroupedMission[] {
  const groups = new Map<string, EmbarkmentMissionRow[]>();
  for (const m of missions) {
    const normalizedStation = normalizeStationName(m.station_name);
    const key = `${normalizedStation}::${m.mission_date}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }
  return Array.from(groups.entries()).map(([key, missions]) => {
    const allTrains = missions.flatMap(m =>
      m.trains.map(t => ({ ...t, agent_id: m.agent_id, mission_id: m.id }))
    );
    const totalControlled = allTrains.reduce((s, t) => s + t.controlled, 0);
    const totalRefused = allTrains.reduce((s, t) => s + t.refused, 0);
    const agentIds = [...new Set(missions.map(m => m.agent_id))];
    return {
      key,
      station_name: normalizeStationName(missions[0].station_name),
      mission_date: missions[0].mission_date,
      missions,
      allTrains,
      totalControlled,
      totalRefused,
      fraudRate: totalControlled > 0 ? (totalRefused / totalControlled) * 100 : 0,
      trainCount: allTrains.length,
      agentIds,
      is_completed: missions.every(m => m.is_completed),
    };
  });
}

function getMissionStats(trains: EmbarkmentTrain[]) {
  const totalControlled = trains.reduce((sum, t) => sum + t.controlled, 0);
  const totalRefused = trains.reduce((sum, t) => sum + t.refused, 0);
  const fraudRate = totalControlled > 0 ? (totalRefused / totalControlled) * 100 : 0;
  return { totalControlled, totalRefused, fraudRate, trainCount: trains.length };
}

// Global stats summary component
function GlobalStatsSummary({ missions }: { missions: EmbarkmentMissionRow[] }) {
  const globalStats = useMemo(() => {
    let totalTrains = 0;
    let totalControlled = 0;
    let totalRefused = 0;
    let completedMissions = 0;
    let activeMissions = 0;

    missions.forEach(mission => {
      const stats = getMissionStats(mission.trains);
      totalTrains += stats.trainCount;
      totalControlled += stats.totalControlled;
      totalRefused += stats.totalRefused;
      if (mission.is_completed) {
        completedMissions++;
      } else {
        activeMissions++;
      }
    });

    const avgFraudRate = totalControlled > 0 ? (totalRefused / totalControlled) * 100 : 0;

    return {
      totalMissions: missions.length,
      completedMissions,
      activeMissions,
      totalTrains,
      totalControlled,
      totalRefused,
      avgFraudRate,
    };
  }, [missions]);

  if (missions.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {/* Total Missions */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Building2 className="h-3.5 w-3.5" />
            Missions
          </div>
          <div className="text-2xl font-bold">{globalStats.totalMissions}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {globalStats.completedMissions} terminée{globalStats.completedMissions > 1 ? 's' : ''} · {globalStats.activeMissions} en cours
          </div>
        </CardContent>
      </Card>

      {/* Total Trains */}
      <Card className="bg-gradient-to-br from-secondary/20 to-secondary/5 border-secondary/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Train className="h-3.5 w-3.5" />
            Trains
          </div>
          <div className="text-2xl font-bold">{globalStats.totalTrains}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {(globalStats.totalTrains / Math.max(globalStats.totalMissions, 1)).toFixed(1)} par mission
          </div>
        </CardContent>
      </Card>

      {/* Total Controlled */}
      <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Users className="h-3.5 w-3.5" />
            Contrôlés
          </div>
          <div className="text-2xl font-bold">{globalStats.totalControlled.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">
            <span className="text-destructive font-medium">{globalStats.totalRefused}</span> refoulé{globalStats.totalRefused > 1 ? 's' : ''}
          </div>
        </CardContent>
      </Card>

      {/* Average Fraud Rate */}
      <Card className={`${getFraudRateBgColor(globalStats.avgFraudRate)}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <TrendingDown className="h-3.5 w-3.5" />
            Taux moyen
          </div>
          <div className={`text-2xl font-bold ${getFraudRateColor(globalStats.avgFraudRate)}`}>
            {globalStats.avgFraudRate.toFixed(1)}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            de refoulement
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GroupedMissionCard({
  group,
  profileMap,
  onMissionClick,
  onDelete,
  onRemoveTrain,
}: {
  group: GroupedMission;
  profileMap: Record<string, { first_name: string; last_name: string }>;
  onMissionClick?: (mission: EmbarkmentMissionRow) => void;
  onDelete?: (id: string) => void;
  onRemoveTrain?: (missionId: string, trainId: string) => Promise<boolean>;
}) {
  const [expanded, setExpanded] = useState(false);
  const isMultiAgent = group.agentIds.length > 1;

  const handleExport = (type: 'pdf' | 'html' | 'preview', e: React.MouseEvent) => {
    e.stopPropagation();
    // Export first mission's data (or grouped)
    const mission = group.missions[0];
    const missionData: EmbarkmentMissionData = {
      date: mission.mission_date,
      stationName: mission.station_name,
      globalComment: mission.global_comment || '',
      trains: group.allTrains,
    };
    if (type === 'pdf') {
      downloadEmbarkmentPDF(missionData, group.is_completed);
      toast.success('PDF exporté');
    } else if (type === 'html') {
      downloadEmbarkmentHTML(missionData, group.is_completed);
      toast.success('HTML exporté');
    } else {
      openEmbarkmentHTMLPreview(missionData, group.is_completed);
    }
  };

  return (
    <Card className="overflow-hidden border-primary/20">
      {/* Header — aggregated stats */}
      <div
        className="flex items-start gap-3 p-3 bg-primary/5 border-b border-primary/10 cursor-pointer hover:bg-primary/10 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="p-1.5 rounded-md bg-primary/15 shrink-0">
          <Building2 className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{group.station_name}</span>
            <Badge variant={group.is_completed ? 'default' : 'secondary'} className="text-[10px] shrink-0">
              {group.is_completed ? (
                <><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Terminée</>
              ) : (
                <><Clock className="h-2.5 w-2.5 mr-0.5" /> En cours</>
              )}
            </Badge>
            {isMultiAgent && (
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {group.agentIds.length} agents
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(group.mission_date), 'dd/MM/yyyy', { locale: fr })}
            </span>
            <span className="flex items-center gap-1">
              <Train className="h-3 w-3" />
              {group.trainCount} train{group.trainCount > 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {group.totalControlled} voy.
            </span>
            {group.totalRefused > 0 && (
              <span className="text-destructive font-medium">
                {group.totalRefused} refoulé{group.totalRefused > 1 ? 's' : ''}
              </span>
            )}
            <span className={cn('font-semibold', getFraudRateColor(group.fraudRate))}>
              {group.fraudRate.toFixed(1)}%
            </span>
          </div>
          {/* Agent names preview (collapsed) */}
          {!expanded && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {group.agentIds.map(agentId => {
                const agent = profileMap[agentId];
                const initials = agent ? getInitials(agent.first_name, agent.last_name) : '?';
                return (
                  <div
                    key={agentId}
                    className={cn('h-5 w-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold', avatarColor(agentId))}
                    title={agent ? `${agent.first_name} ${agent.last_name}` : 'Agent inconnu'}
                  >
                    {initials}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Export menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => handleExport('preview', e)}>
                <Eye className="h-4 w-4 mr-2" />
                Aperçu
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => handleExport('html', e)}>
                <Globe className="h-4 w-4 mr-2" />
                Export HTML
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => handleExport('pdf', e)}>
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </DropdownMenuItem>
              {onDelete && group.missions.length === 1 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={(e) => { e.stopPropagation(); onDelete(group.missions[0].id); }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expandable: trains grouped by train number */}
      {expanded && (
        <CardContent className="p-0">
          {(() => {
            // Group trains by trainNumber
            const trainGroups = new Map<string, typeof group.allTrains>();
            for (const t of group.allTrains) {
              const key = t.trainNumber || '—';
              if (!trainGroups.has(key)) trainGroups.set(key, []);
              trainGroups.get(key)!.push(t);
            }
            return Array.from(trainGroups.entries()).map(([trainNum, entries], gi) => {
              const totalCtrl = entries.reduce((s, t) => s + t.controlled, 0);
              const totalRef = entries.reduce((s, t) => s + t.refused, 0);
              const trainRate = totalCtrl > 0 ? (totalRef / totalCtrl) * 100 : 0;
              const firstEntry = entries[0];

              return (
                <div key={trainNum} className={cn(gi < trainGroups.size - 1 && 'border-b border-border/50')}>
                  {/* Train header with totals */}
                  <div className="flex items-center gap-3 px-3 py-2 bg-muted/30">
                    <div className="p-1 rounded bg-primary/10 shrink-0">
                      <Train className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold">N° {trainNum}</span>
                        {firstEntry.origin && firstEntry.destination && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            {firstEntry.origin} <ArrowRight className="h-2.5 w-2.5" /> {firstEntry.destination}
                          </span>
                        )}
                        {firstEntry.departureTime && (
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0">
                            <Clock className="h-2.5 w-2.5" />
                            {firstEntry.departureTime}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                        <span>{totalCtrl} voy.</span>
                        {totalRef > 0 && (
                          <span className="text-destructive font-medium">{totalRef} refoulé{totalRef > 1 ? 's' : ''}</span>
                        )}
                        {entries.some(t => t.policePresence) && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0 h-4">Police</Badge>
                        )}
                      </div>
                    </div>
                    <div className={cn('text-xs font-bold shrink-0', getFraudRateColor(trainRate))}>
                      {trainRate.toFixed(1)}%
                    </div>
                  </div>

                  {/* Agent sub-rows */}
                  {entries.map((train) => {
                    const agent = profileMap[train.agent_id];
                    const initials = agent ? getInitials(agent.first_name, agent.last_name) : '?';
                    const agentName = agent ? `${agent.first_name} ${agent.last_name}` : 'Agent inconnu';
                    const rate = train.controlled > 0 ? (train.refused / train.controlled) * 100 : 0;
                    const color = avatarColor(train.agent_id);

                    return (
                      <div
                        key={`${train.mission_id}-${train.id}`}
                        className="flex items-center gap-2 pl-10 pr-3 py-1.5 border-t border-border/30 hover:bg-muted/50 transition-colors"
                      >
                        <button
                          onClick={() => {
                            const mission = group.missions.find(m => m.id === train.mission_id);
                            if (mission && onMissionClick) onMissionClick(mission);
                          }}
                          className="flex items-center gap-3 flex-1 min-w-0 text-left"
                        >
                          <div className={cn(
                            'h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-white text-[8px] font-bold',
                            color
                          )}>
                            {initials}
                          </div>
                          <span className="text-[11px] text-muted-foreground truncate flex-1">{agentName}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">{train.controlled} voy.</span>
                          {train.refused > 0 && (
                            <span className="text-[10px] text-destructive font-medium shrink-0">{train.refused} ref.</span>
                          )}
                          {train.trackCrossing && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0 h-4">Trav. voie</Badge>
                          )}
                          {train.controlLineCrossing && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-0 h-4">Fraude ligne</Badge>
                          )}
                          <span className={cn('text-[10px] font-semibold shrink-0', getFraudRateColor(rate))}>
                            {rate.toFixed(1)}%
                          </span>
                          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        </button>
                        {onRemoveTrain && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Supprimer le train ${trainNum} de ${agentName} ?`)) {
                                onRemoveTrain(train.mission_id, train.id);
                              }
                            }}
                            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                            title="Supprimer ce train"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            });
          })()}
        </CardContent>
      )}
    </Card>
  );
}

// Grid card component for grid view
function MissionCard({ mission, onClick, onDelete }: { mission: EmbarkmentMissionRow; onClick?: () => void; onDelete?: (id: string) => void }) {
  const stats = getMissionStats(mission.trains);
  
  const handleExportPDF = (e: React.MouseEvent) => {
    e.stopPropagation();
    const missionData: EmbarkmentMissionData = {
      date: mission.mission_date,
      stationName: mission.station_name,
      globalComment: mission.global_comment || '',
      trains: mission.trains,
    };
    downloadEmbarkmentPDF(missionData, mission.is_completed);
    toast.success('PDF exporté');
  };
  
  const handleExportHTML = (e: React.MouseEvent) => {
    e.stopPropagation();
    const missionData: EmbarkmentMissionData = {
      date: mission.mission_date,
      stationName: mission.station_name,
      globalComment: mission.global_comment || '',
      trains: mission.trains,
    };
    downloadEmbarkmentHTML(missionData, mission.is_completed);
    toast.success('HTML exporté');
  };
  
  const handlePreviewHTML = (e: React.MouseEvent) => {
    e.stopPropagation();
    const missionData: EmbarkmentMissionData = {
      date: mission.mission_date,
      stationName: mission.station_name,
      globalComment: mission.global_comment || '',
      trains: mission.trains,
    };
    openEmbarkmentHTMLPreview(missionData, mission.is_completed);
  };

  return (
    <Card 
      className="cursor-pointer hover:bg-muted/50 hover:shadow-md transition-all group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-medium line-clamp-1">{mission.station_name}</h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {format(new Date(mission.mission_date), 'dd/MM/yyyy', { locale: fr })}
              </div>
            </div>
          </div>
          <Badge variant={mission.is_completed ? 'default' : 'secondary'} className="text-xs shrink-0">
            {mission.is_completed ? (
              <><CheckCircle2 className="h-3 w-3 mr-1" /> Terminée</>
            ) : (
              <><Clock className="h-3 w-3 mr-1" /> En cours</>
            )}
          </Badge>
        </div>
        
        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
              <Train className="h-3 w-3" />
              Trains
            </div>
            <div className="font-semibold">{stats.trainCount}</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
              <Users className="h-3 w-3" />
              Contrôlés
            </div>
            <div className="font-semibold">{stats.totalControlled}</div>
          </div>
          <div className={`text-center p-2 rounded-lg ${getFraudRateBgColor(stats.fraudRate)}`}>
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
              <AlertTriangle className="h-3 w-3" />
              Fraude
            </div>
            <div className={`font-semibold ${getFraudRateColor(stats.fraudRate)}`}>
              {stats.fraudRate.toFixed(1)}%
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePreviewHTML}>
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleExportHTML}>
              <Globe className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleExportPDF}>
              <FileText className="h-3.5 w-3.5" />
            </Button>
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(mission.id); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </div>
      </CardContent>
    </Card>
  );
}

export function EmbarkmentHistoryView({ missions, viewMode, profileMap = {}, onMissionClick, onDelete, onRemoveTrain, isLoading, embedded = false }: EmbarkmentHistoryViewProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  // Internal state for embarkment-specific filtering
  const [internalViewMode, setInternalViewMode] = useState<EmbarkmentViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [stationFilter, setStationFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'active'>('all');

  // Get unique stations for filter (normalized)
  const uniqueStations = useMemo(() => {
    const stations = new Set(missions.map(m => normalizeStationName(m.station_name)));
    return Array.from(stations).sort();
  }, [missions]);

  // Filter missions
  const filteredMissions = useMemo(() => {
    return missions.filter(mission => {
      // Station filter (compare normalized names)
      if (stationFilter !== 'all' && normalizeStationName(mission.station_name) !== stationFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === 'completed' && !mission.is_completed) {
        return false;
      }
      if (statusFilter === 'active' && mission.is_completed) {
        return false;
      }

      // Date range filter
      if (startDate || endDate) {
        const missionDate = new Date(mission.mission_date);
        if (startDate && missionDate < startDate) {
          return false;
        }
        if (endDate) {
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (missionDate > endOfDay) {
            return false;
          }
        }
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesStation = mission.station_name.toLowerCase().includes(query);
        const matchesTrains = mission.trains.some(t => 
          t.trainNumber.toLowerCase().includes(query) ||
          t.destination?.toLowerCase().includes(query)
        );
        if (!matchesStation && !matchesTrains) {
          return false;
        }
      }

      return true;
    });
  }, [missions, stationFilter, statusFilter, startDate, endDate, searchQuery]);

  // Group missions by date (for date headers)
  const groupedMissions = useMemo(() => {
    return filteredMissions.reduce((groups, mission) => {
      const date = mission.mission_date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(mission);
      return groups;
    }, {} as Record<string, EmbarkmentMissionRow[]>);
  }, [filteredMissions]);

  const sortedDates = Object.keys(groupedMissions).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  );

  // Group missions by station+date for multi-agent display (list view)
  const groupedByStationDate = useMemo(() => {
    const byDate: Record<string, GroupedMission[]> = {};
    for (const date of sortedDates) {
      byDate[date] = groupMissions(groupedMissions[date]);
    }
    return byDate;
  }, [groupedMissions, sortedDates]);

  const hasActiveFilters = searchQuery.trim() !== '' || stationFilter !== 'all' || statusFilter !== 'all' || startDate !== undefined || endDate !== undefined;

  const clearFilters = () => {
    setSearchQuery('');
    setStationFilter('all');
    setStatusFilter('all');
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const handleDeleteRequest = (id: string) => setConfirmDeleteId(id);

  const handleDeleteConfirm = async () => {
    if (confirmDeleteId && onDelete) {
      await onDelete(confirmDeleteId);
    }
    setConfirmDeleteId(null);
  };

  const handleExportGroupedPDF = () => {
    if (filteredMissions.length === 0) {
      toast.error('Aucune mission à exporter');
      return;
    }
    const groupedData = filteredMissions.map(mission => ({
      mission: {
        date: mission.mission_date,
        stationName: mission.station_name,
        globalComment: mission.global_comment || '',
        trains: mission.trains,
      },
      isCompleted: mission.is_completed,
    }));
    downloadGroupedEmbarkmentPDF(groupedData);
    toast.success(`PDF groupé exporté (${filteredMissions.length} missions)`);
  };

  // Determine effective view mode (use internal for grid, parent for list/table)
  const effectiveViewMode = internalViewMode === 'grid' ? 'grid' : viewMode;

  // Embedded mode: rendered inline inside HistoryDateGroup which already provides
  // the date header and the global search. Skip filters, stats and date header.
  if (embedded) {
    const allGroups = sortedDates.flatMap(date => groupedByStationDate[date] ?? []);
    if (allGroups.length === 0) return null;
    return (
      <>
        <div className="space-y-2">
          {allGroups.map((group) => (
            <GroupedMissionCard
              key={group.key}
              group={group}
              profileMap={profileMap}
              onMissionClick={onMissionClick}
              onDelete={onDelete ? handleDeleteRequest : undefined}
              onRemoveTrain={onRemoveTrain}
            />
          ))}
        </div>
        <AlertDialog open={confirmDeleteId !== null} onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette mission ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. La mission sera définitivement supprimée.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Render table view
  if (effectiveViewMode === 'table') {
    return (
      <div className="space-y-4">
        <GlobalStatsSummary missions={filteredMissions} />
        
        {/* Filters */}
        <EmbarkmentFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          stationFilter={stationFilter}
          onStationFilterChange={setStationFilter}
          stations={uniqueStations}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          internalViewMode={internalViewMode}
          onViewModeChange={setInternalViewMode}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
          filteredCount={filteredMissions.length}
          totalCount={missions.length}
          onExportGroupedPDF={handleExportGroupedPDF}
        />

        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead>Gare</TableHead>
                  <TableHead className="w-[80px] text-center">Trains</TableHead>
                  <TableHead className="w-[100px] text-center">Contrôlés</TableHead>
                  <TableHead className="w-[100px] text-center">Refoulés</TableHead>
                  <TableHead className="w-[80px] text-center">Fraude</TableHead>
                  <TableHead className="w-[100px] text-center">Statut</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMissions.map((mission, index) => {
                  const stats = getMissionStats(mission.trains);
                  const isEven = index % 2 === 0;
                  
                  const handleExport = (type: 'pdf' | 'html' | 'preview') => {
                    const missionData: EmbarkmentMissionData = {
                      date: mission.mission_date,
                      stationName: mission.station_name,
                      globalComment: mission.global_comment || '',
                      trains: mission.trains,
                    };
                    if (type === 'pdf') {
                      downloadEmbarkmentPDF(missionData, mission.is_completed);
                      toast.success('PDF exporté');
                    } else if (type === 'html') {
                      downloadEmbarkmentHTML(missionData, mission.is_completed);
                      toast.success('HTML exporté');
                    } else {
                      openEmbarkmentHTMLPreview(missionData, mission.is_completed);
                    }
                  };
                  
                  return (
                    <TableRow 
                      key={mission.id}
                      className={`cursor-pointer hover:bg-muted/70 transition-colors ${
                        isEven ? 'bg-muted/30' : 'bg-background'
                      }`}
                      onClick={() => onMissionClick?.(mission)}
                    >
                      <TableCell className="font-medium text-sm">
                        {format(new Date(mission.mission_date), 'dd/MM/yy', { locale: fr })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {mission.station_name}
                      </TableCell>
                      <TableCell className="text-center">
                        {stats.trainCount}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {stats.totalControlled}
                      </TableCell>
                      <TableCell className="text-center text-destructive font-medium">
                        {stats.totalRefused}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-semibold ${getFraudRateColor(stats.fraudRate)}`}>
                          {stats.fraudRate.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={mission.is_completed ? 'default' : 'secondary'} className="text-xs">
                          {mission.is_completed ? 'Terminée' : 'En cours'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Download className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleExport('preview'); }}>
                              <Eye className="h-4 w-4 mr-2" />
                              Aperçu
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleExport('html'); }}>
                              <Globe className="h-4 w-4 mr-2" />
                              HTML
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleExport('pdf'); }}>
                              <FileText className="h-4 w-4 mr-2" />
                              PDF
                            </DropdownMenuItem>
                            {onDelete && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteRequest(mission.id); }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    );
  }

  // Grid view
  if (effectiveViewMode === 'grid') {
    return (
      <div className="space-y-4">
        <GlobalStatsSummary missions={filteredMissions} />
        
        {/* Filters */}
        <EmbarkmentFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          stationFilter={stationFilter}
          onStationFilterChange={setStationFilter}
          stations={uniqueStations}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          internalViewMode={internalViewMode}
          onViewModeChange={setInternalViewMode}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
          filteredCount={filteredMissions.length}
          totalCount={missions.length}
          onExportGroupedPDF={handleExportGroupedPDF}
        />

        {filteredMissions.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Aucun résultat</h2>
            <p className="text-muted-foreground mb-4">
              Aucune mission ne correspond à vos critères.
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Effacer les filtres
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMissions.map((mission) => (
              <MissionCard
                key={mission.id}
                mission={mission}
                onClick={() => onMissionClick?.(mission)}
                onDelete={onDelete ? handleDeleteRequest : undefined}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // List view (default)
  return (
    <>
      <div className="space-y-4">
        <GlobalStatsSummary missions={filteredMissions} />

        {/* Filters */}
        <EmbarkmentFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          stationFilter={stationFilter}
          onStationFilterChange={setStationFilter}
          stations={uniqueStations}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          internalViewMode={internalViewMode}
          onViewModeChange={setInternalViewMode}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
          filteredCount={filteredMissions.length}
          totalCount={missions.length}
          onExportGroupedPDF={handleExportGroupedPDF}
        />

        {filteredMissions.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Aucun résultat</h2>
            <p className="text-muted-foreground mb-4">
              Aucune mission ne correspond à vos critères.
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Effacer les filtres
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((date) => (
              <div key={date} className="space-y-2">
                <h2 className="text-sm font-medium text-muted-foreground sticky top-0 bg-background py-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(date), 'EEEE d MMMM yyyy', { locale: fr })}
                  <Badge variant="secondary" className="ml-auto">
                    {groupedMissions[date].length} mission{groupedMissions[date].length > 1 ? 's' : ''}
                  </Badge>
                </h2>
                <div className="space-y-2">
                  {(groupedByStationDate[date] ?? []).map((group) => (
                    <GroupedMissionCard
                      key={group.key}
                      group={group}
                      profileMap={profileMap}
                      onMissionClick={onMissionClick}
                      onDelete={onDelete ? handleDeleteRequest : undefined}
                      onRemoveTrain={onRemoveTrain}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation dialog */}
      <AlertDialog open={confirmDeleteId !== null} onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette mission ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La mission sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Filters component for embarkment history
interface EmbarkmentFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  stationFilter: string;
  onStationFilterChange: (station: string) => void;
  stations: string[];
  statusFilter: 'all' | 'completed' | 'active';
  onStatusFilterChange: (status: 'all' | 'completed' | 'active') => void;
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  internalViewMode: EmbarkmentViewMode;
  onViewModeChange: (mode: EmbarkmentViewMode) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  filteredCount: number;
  totalCount: number;
  onExportGroupedPDF?: () => void;
}

function EmbarkmentFilters({
  searchQuery,
  onSearchChange,
  stationFilter,
  onStationFilterChange,
  stations,
  statusFilter,
  onStatusFilterChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  internalViewMode,
  onViewModeChange,
  hasActiveFilters,
  onClearFilters,
  filteredCount,
  totalCount,
  onExportGroupedPDF,
}: EmbarkmentFiltersProps) {
  return (
    <div className="space-y-3">
      {/* Search and view mode toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher gare, train, destination..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => onSearchChange('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {/* View mode toggle */}
        <ToggleGroup 
          type="single" 
          value={internalViewMode} 
          onValueChange={(v) => v && onViewModeChange(v as EmbarkmentViewMode)}
          className="border rounded-md"
        >
          <ToggleGroupItem value="list" aria-label="Vue liste" size="sm" className="px-2">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="grid" aria-label="Vue grille" size="sm" className="px-2">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="table" aria-label="Vue tableau" size="sm" className="px-2">
            <TableIcon className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Station and status filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        
        {/* Station filter */}
        <Select value={stationFilter} onValueChange={onStationFilterChange}>
          <SelectTrigger className="w-[160px] h-8">
            <SelectValue placeholder="Toutes les gares" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les gares</SelectItem>
            {stations.map((station) => (
              <SelectItem key={station} value={station}>
                {station}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Status filter */}
        <ToggleGroup 
          type="single" 
          value={statusFilter} 
          onValueChange={(v) => v && onStatusFilterChange(v as 'all' | 'completed' | 'active')}
          className="justify-start"
        >
          <ToggleGroupItem value="all" aria-label="Toutes" size="sm">
            Toutes
          </ToggleGroupItem>
          <ToggleGroupItem value="completed" aria-label="Terminées" size="sm" className="gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Terminées
          </ToggleGroupItem>
          <ToggleGroupItem value="active" aria-label="En cours" size="sm" className="gap-1">
            <Clock className="h-3.5 w-3.5" />
            En cours
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Date range filter */}
      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
        onClear={() => { onStartDateChange(undefined); onEndDateChange(undefined); }}
      />

      {/* Actions and filter indicator */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {hasActiveFilters 
            ? `${filteredCount} résultat${filteredCount !== 1 ? 's' : ''} sur ${totalCount} mission${totalCount !== 1 ? 's' : ''}`
            : `${totalCount} mission${totalCount !== 1 ? 's' : ''}`
          }
        </p>
        <div className="flex items-center gap-2">
          {filteredCount > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onExportGroupedPDF?.()}
              className="text-xs"
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              PDF groupé ({filteredCount})
            </Button>
          )}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClearFilters} className="text-muted-foreground">
              <X className="h-3.5 w-3.5 mr-1" />
              Effacer filtres
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

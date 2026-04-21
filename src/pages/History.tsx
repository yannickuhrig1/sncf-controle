import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useControls } from '@/hooks/useControls';
import { useEmbarkmentMissions } from '@/hooks/useEmbarkmentMissions';
import { useLastSync } from '@/hooks/useLastSync';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useUserPreferences, type HistoryViewMode } from '@/hooks/useUserPreferences';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { TrainGroupCard } from '@/components/history/TrainGroupCard';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ControlDetailDialog } from '@/components/controls/ControlDetailDialog';
import { ExportDialog } from '@/components/controls/ExportDialog';
import { PdfPreviewDialog } from '@/components/controls/PdfPreviewDialog';
import { LastSyncIndicator } from '@/components/controls/LastSyncIndicator';
import { OfflineIndicator } from '@/components/controls/OfflineIndicator';
import { HistoryTableView } from '@/components/history/HistoryTableView';
import { EmbarkmentHistoryView } from '@/components/history/EmbarkmentHistoryView';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import type { Period } from '@/components/dashboard/PeriodSelector';
import { DashboardDatePicker } from '@/components/dashboard/DashboardDatePicker';
import { ViewModeToggle } from '@/components/dashboard/ViewModeToggle';
import { getFraudRateColor } from '@/lib/stats';
import { exportTableToPDF, exportTableToHTML, exportToPDF, downloadPDF } from '@/lib/exportUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ViewMode } from '@/hooks/useControlsWithFilter';
import {
  Loader2,
  History,
  Train,
  Building2,
  TrainTrack,
  Calendar,
  Clock,
  Users,
  Download,
  Search,
  X,
  Filter,
  ArrowUpDown,
  List,
  TableIcon,
  FileText,
  ArrowUpFromLine,
  Eye,
  ChevronDown,
  LayoutList,
  FileDown,
  Shield,
  Ban,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Control = Database['public']['Tables']['controls']['Row'];
type LocationType = Database['public']['Enums']['location_type'];
type SortOption = 'date' | 'fraud_desc' | 'fraud_asc' | 'passengers_desc' | 'passengers_asc';
/** Fusionne les contrôles du même train (ou gare) le même jour en un seul. */
function mergeControlsByTrain(controls: Control[]): Control[] {
  const groups = new Map<string, Control[]>();
  for (const c of controls) {
    const key = c.location_type === 'train' && c.train_number
      ? `train::${c.control_date}::${c.train_number}`
      : c.location_type === 'gare'
      ? `gare::${c.control_date}::${c.location}`
      : `solo::${c.id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }
  return Array.from(groups.values()).map(group => {
    if (group.length === 1) return group[0];
    const first = group[0];
    const s = (fn: (c: Control) => number) => group.reduce((acc, c) => acc + fn(c), 0);
    return {
      ...first,
      control_time: group.reduce((m, c) => c.control_time < m ? c.control_time : m, first.control_time),
      nb_passagers:           s(c => c.nb_passagers),
      nb_en_regle:            s(c => c.nb_en_regle),
      tarifs_controle:        s(c => c.tarifs_controle),
      pv:                     s(c => c.pv),
      ri_positive:            s(c => c.ri_positive),
      ri_negative:            s(c => c.ri_negative),
      stt_50:                 s(c => c.stt_50),
      stt_50_amount:          s(c => c.stt_50_amount || 0),
      stt_100:                s(c => c.stt_100),
      stt_100_amount:         s(c => c.stt_100_amount || 0),
      rnv:                    s(c => c.rnv),
      rnv_amount:             s(c => c.rnv_amount || 0),
      titre_tiers:            s(c => c.titre_tiers || 0),
      titre_tiers_amount:     s(c => c.titre_tiers_amount || 0),
      doc_naissance:          s(c => c.doc_naissance || 0),
      doc_naissance_amount:   s(c => c.doc_naissance_amount || 0),
      pv_rnv:                 s(c => c.pv_rnv || 0),
      pv_titre_tiers:         s(c => c.pv_titre_tiers || 0),
      pv_doc_naissance:       s(c => c.pv_doc_naissance || 0),
      pv_autre:               s(c => c.pv_autre || 0),
      tarif_bord_stt_50:      s(c => c.tarif_bord_stt_50 || 0),
      tarif_bord_stt_100:     s(c => c.tarif_bord_stt_100 || 0),
      tarif_bord_rnv:         s(c => c.tarif_bord_rnv || 0),
      tarif_bord_titre_tiers: s(c => c.tarif_bord_titre_tiers || 0),
      tarif_bord_doc_naissance: s(c => c.tarif_bord_doc_naissance || 0),
      tarif_bord_autre:       s(c => c.tarif_bord_autre || 0),
      notes: group.map(c => c.notes).filter(Boolean).join(' | ') || null,
    };
  });
}

const locationIcons: Record<LocationType, React.ComponentType<{ className?: string }>> = {
  train: Train,
  gare: Building2,
  quai: TrainTrack,
};

interface ControlRowProps {
  control: Control;
  onClick: () => void;
}

function ControlRow({ control, onClick }: ControlRowProps) {
  const Icon = locationIcons[control.location_type];
  const fraudCount = control.tarifs_controle + control.pv + control.ri_negative;
  const fraudRate = control.nb_passagers > 0
    ? ((fraudCount / control.nb_passagers) * 100)
    : 0;

  return (
    <Card 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="p-2 rounded-lg bg-primary/10 shrink-0 mt-0.5">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          
          {/* Main info */}
          <div className="flex-1 min-w-0">
            {/* Line 1: location + train number */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium truncate text-sm">
                {control.origin && control.destination
                  ? `${control.origin} → ${control.destination}`
                  : control.location}
              </span>
              {control.train_number && (
                <Badge variant="outline" className="text-xs shrink-0">
                  N° {control.train_number}
                </Badge>
              )}
            </div>

            {/* Line 2: date + time */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(control.control_date), 'dd/MM/yy', { locale: fr })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {control.control_time.slice(0, 5)}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {control.nb_passagers}
              </span>
            </div>

            {/* Comment on PC: between voyageurs and badges — vertically centered */}
            {control.notes && (
              <p className="hidden sm:block text-sm text-center text-muted-foreground mt-2 italic font-medium">
                {control.notes}
              </p>
            )}

            {/* Line 3: badges Bord / TC / PV / RI */}
            {(() => {
              const bordTotal = (control.tarif_bord_stt_50 || 0) + (control.tarif_bord_stt_100 || 0)
                + (control.tarif_bord_rnv || 0) + (control.tarif_bord_titre_tiers || 0)
                + (control.tarif_bord_doc_naissance || 0) + (control.tarif_bord_autre || 0);
              const riTotal = (control.ri_positive || 0) + (control.ri_negative || 0);
              const badges = [
                (control as any).is_cancelled        && { label: 'Supprimé',   cls: 'bg-slate-700 text-white border-0' },
                (control as any).is_overcrowded      && { label: 'Sur-occ.',   cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0' },
                (control as any).is_police_on_board  && { label: 'Police',     cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0' },
                (control as any).is_suge_on_board    && { label: 'SUGE',       cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-0' },
                bordTotal > 0            && { label: `Bord: ${bordTotal}`,                cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0' },
                control.tarifs_controle > 0 && { label: `TC: ${control.tarifs_controle}`, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0' },
                control.pv > 0           && { label: `PV: ${control.pv}`,                cls: 'bg-red-500 text-white border-0' },
                riTotal > 0              && { label: `RI: ${riTotal}`,                    cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-0' },
              ].filter(Boolean) as { label: string; cls: string }[];

              if (badges.length === 0) return null;
              return (
                <div className="flex flex-wrap gap-1 mt-2">
                  {badges.map((b, i) => (
                    <Badge key={i} variant="outline" className={`text-[10px] px-1.5 py-0 ${b.cls}`}>
                      {b.label}
                    </Badge>
                  ))}
                </div>
              );
            })()}
            {/* Comment on mobile: compact, after badges */}
            {control.notes && (
              <p className="sm:hidden text-[10px] text-muted-foreground mt-1.5 truncate italic">
                {control.notes}
              </p>
            )}
          </div>

          {/* Fraud rate — always visible */}
          <div className={`text-right shrink-0 ${getFraudRateColor(fraudRate)}`}>
            <div className="text-sm font-bold">{fraudRate.toFixed(1)}%</div>
            {fraudCount > 0 && (
              <div className="text-xs opacity-80">{fraudCount} fraude{fraudCount > 1 ? 's' : ''}</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HistoryPage() {
  const { user, profile, loading: authLoading, isAdmin, isManager } = useAuth();
  const isMobile = useIsMobile();
  const { 
    controls, 
    isLoading, 
    isFetching,
    deleteControl, 
    refetch,
    infiniteControls,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoadingInfinite,
    totalCount,
  } = useControls();
  const {
    missions: embarkmentMissions,
    isLoading: isLoadingEmbarkment,
    refreshMissions: refetchEmbarkment,
    deleteMission: deleteEmbarkmentMission,
  } = useEmbarkmentMissions();
  const navigate = useNavigate();
  const { formattedLastSync, updateLastSync } = useLastSync();
  const { isOnline, pendingCount, isSyncing } = useOfflineSync();
  const { preferences, updatePreferences } = useUserPreferences();
  const isUserAdmin   = isAdmin();
  const isUserManager = isManager();

  const [selectedControl, setSelectedControl] = useState<Control | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<LocationType | 'all'>('all');
  const [sortOption, setSortOption] = useState<SortOption>('date');
  const [policeFilter, setPoliceFilter] = useState(false);
  const [sugeFilter, setSugeFilter] = useState(false);
  const [overcrowdedFilter, setOvercrowdedFilter] = useState(false);
  const [cancelledFilter, setCancelledFilter] = useState(false);
  const [historyPeriod, setHistoryPeriod] = useState<Period | 'all'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dataViewMode, setDataViewMode] = useState<ViewMode>('all-data');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfDocRef, setPdfDocRef] = useState<ReturnType<typeof exportToPDF> | null>(null);
  const [mergedGroupControls, setMergedGroupControls] = useState<Control[] | null>(null);
  const [mergedDialogOpen, setMergedDialogOpen] = useState(false);
  
  // Get view mode from preferences, default to 'list'
  // On mobile, always force list view regardless of preference
  const savedViewMode: HistoryViewMode = preferences?.history_view_mode ?? 'list';
  const viewMode: HistoryViewMode = isMobile ? 'list' : savedViewMode;
  
  const handleViewModeChange = (newMode: string | undefined) => {
    if (newMode && (newMode === 'list' || newMode === 'table')) {
      updatePreferences({ history_view_mode: newMode });
    }
  };
  
  // Infinite scroll observer
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Handle sync
  const handleSync = useCallback(async () => {
    await refetch();
    updateLastSync();
    toast.success('Données synchronisées');
  }, [refetch, updateLastSync]);

  // Infinite scroll effect
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Helper to calculate fraud rate
  const getFraudRate = useCallback((control: Control) => {
    const fraudCount = control.tarifs_controle + control.pv + control.ri_negative;
    return control.nb_passagers > 0 ? (fraudCount / control.nb_passagers) * 100 : 0;
  }, []);

  // Use infinite controls for display, fall back to regular controls for filtering
  const displayControls = useMemo(() => {
    const sourceControls = infiniteControls.length > 0 ? infiniteControls : controls;

    if (dataViewMode === 'my-data' && profile) {
      return sourceControls.filter(c => c.agent_id === profile.id);
    }
    if (dataViewMode === 'by-team' && selectedTeamId) {
      return sourceControls.filter(c => (c as any).team_id === selectedTeamId);
    }
    if (dataViewMode === 'by-agent' && selectedAgentId) {
      return sourceControls.filter(c => c.agent_id === selectedAgentId);
    }

    return sourceControls;
  }, [infiniteControls, controls, dataViewMode, profile, selectedTeamId, selectedAgentId]);

  // Fetch agent profiles for multi-agent grouping display (controls + embarkment missions)
  const allControls = infiniteControls.length > 0 ? infiniteControls : controls;
  const agentIds = useMemo(() => {
    const ids = new Set(allControls.map(c => c.agent_id));
    embarkmentMissions.forEach(m => ids.add(m.agent_id));
    return [...ids];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allControls.length, embarkmentMissions.length]);
  const { data: agentProfiles = [] } = useQuery({
    queryKey: ['profiles-by-ids', agentIds],
    queryFn: async () => {
      if (!agentIds.length) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', agentIds);
      return data ?? [];
    },
    enabled: agentIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
  const profileMap = useMemo(() =>
    Object.fromEntries(agentProfiles.map(p => [p.id, { first_name: p.first_name ?? '', last_name: p.last_name ?? '' }])),
    [agentProfiles]
  );

  // Fetch teams list for "by-team" selector
  const { data: teamsList = [] } = useQuery({
    queryKey: ['teams-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('id, name').order('name');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch all agents for "by-agent" selector
  const { data: allAgentsList = [] } = useQuery({
    queryKey: ['all-agents-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .order('last_name');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Permission helper: can current user edit/delete this control?
  const canEditControl = useCallback((control: Control) =>
    control.agent_id === profile?.id || isUserAdmin || isUserManager,
    [profile?.id, isUserAdmin, isUserManager]
  );

  // Open merged view for a group of controls (same train/gare same day)
  const handleGroupClick = useCallback((groupControls: Control[]) => {
    setMergedGroupControls(groupControls);
    setMergedDialogOpen(true);
  }, []);

  // Compute effective date range from period selection
  const periodDateRange = useMemo(() => {
    switch (historyPeriod) {
      case 'day': {
        const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        return { start: d, end: d };
      }
      case 'week':
        return { start: startOfWeek(selectedDate, { weekStartsOn: 1 }), end: endOfWeek(selectedDate, { weekStartsOn: 1 }) };
      case 'month':
        return { start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) };
      case 'year':
        return { start: startOfYear(selectedDate), end: endOfYear(selectedDate) };
      case 'custom':
        return {
          start: customStart ? new Date(customStart) : null,
          end: customEnd ? new Date(customEnd) : null,
        };
      default: // 'all'
        return { start: null, end: null };
    }
  }, [historyPeriod, customStart, customEnd, selectedDate]);

  // Filter and sort controls
  const filteredControls = useMemo(() => {
    const { start: effectiveStartDate, end: effectiveEndDate } = periodDateRange;

    let result = displayControls.filter(control => {
      // Location type filter
      if (locationFilter !== 'all' && control.location_type !== locationFilter) {
        return false;
      }

      // Date range filter from period selection
      if (effectiveStartDate || effectiveEndDate) {
        const controlDate = new Date(control.control_date);
        if (effectiveStartDate && controlDate < effectiveStartDate) {
          return false;
        }
        if (effectiveEndDate) {
          const endOfDay = new Date(effectiveEndDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (controlDate > endOfDay) {
            return false;
          }
        }
      }
      
      // Badge filters
      if (policeFilter && !(control as any).is_police_on_board) return false;
      if (sugeFilter && !(control as any).is_suge_on_board) return false;
      if (overcrowdedFilter && !(control as any).is_overcrowded) return false;
      if (cancelledFilter && !(control as any).is_cancelled) return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesLocation = control.location.toLowerCase().includes(query);
        const matchesTrainNumber = control.train_number?.toLowerCase().includes(query);
        const matchesOrigin = control.origin?.toLowerCase().includes(query);
        const matchesDestination = control.destination?.toLowerCase().includes(query);
        
        if (!matchesLocation && !matchesTrainNumber && !matchesOrigin && !matchesDestination) {
          return false;
        }
      }
      
      return true;
    });

    // Sort based on selected option
    switch (sortOption) {
      case 'fraud_desc':
        result = [...result].sort((a, b) => getFraudRate(b) - getFraudRate(a));
        break;
      case 'fraud_asc':
        result = [...result].sort((a, b) => getFraudRate(a) - getFraudRate(b));
        break;
      case 'passengers_desc':
        result = [...result].sort((a, b) => b.nb_passagers - a.nb_passagers);
        break;
      case 'passengers_asc':
        result = [...result].sort((a, b) => a.nb_passagers - b.nb_passagers);
        break;
      case 'date':
      default:
        // Keep original order (by date desc)
        break;
    }

    return result;
  }, [displayControls, searchQuery, locationFilter, sortOption, periodDateRange, getFraudRate, policeFilter, sugeFilter, overcrowdedFilter, cancelledFilter]);

  // Group filtered controls by date, then sub-group multi-agent trains/gares
  const groupedByDate = useMemo(() => {
    const byDate: Record<string, Control[]> = {};
    filteredControls.forEach(c => {
      if (!byDate[c.control_date]) byDate[c.control_date] = [];
      byDate[c.control_date].push(c);
    });

    return Object.entries(byDate)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
      .map(([date, dayControls]) => {
        const buckets: Record<string, Control[]> = {};
        const solo: Control[] = [];

        dayControls.forEach(c => {
          const key = c.location_type === 'train' && c.train_number
            ? `train::${c.train_number}`
            : c.location_type === 'gare'
            ? `gare::${c.location}`
            : null;
          if (key) {
            if (!buckets[key]) buckets[key] = [];
            buckets[key].push(c);
          } else {
            solo.push(c);
          }
        });

        const groups: { type: 'train' | 'gare'; controls: Control[] }[] = [];
        Object.entries(buckets).forEach(([key, cs]) => {
          if (cs.length > 1) {
            groups.push({ type: key.startsWith('train') ? 'train' : 'gare', controls: cs });
          } else {
            solo.push(...cs);
          }
        });

        solo.sort((a, b) => b.control_time.localeCompare(a.control_time));
        return { date, groups, solo };
      });
  }, [filteredControls]);

  const hasActiveFilters = searchQuery.trim() !== '' || locationFilter !== 'all' || sortOption !== 'date' || historyPeriod !== 'all' || policeFilter || sugeFilter || overcrowdedFilter || cancelledFilter;

  const clearFilters = () => {
    setSearchQuery('');
    setLocationFilter('all');
    setSortOption('date');
    setHistoryPeriod('all');
    setCustomStart('');
    setCustomEnd('');
    setPoliceFilter(false);
    setSugeFilter(false);
    setOvercrowdedFilter(false);
    setCancelledFilter(false);
  };

  const handleExportTableExtended = () => {
    if (filteredControls.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }
    const { start: sd, end: ed } = periodDateRange;
    const dateRange = sd && ed
      ? `${format(sd, 'dd/MM/yyyy', { locale: fr })} - ${format(ed, 'dd/MM/yyyy', { locale: fr })}`
      : sd
        ? `Depuis ${format(sd, 'dd/MM/yyyy', { locale: fr })}`
        : 'Toutes les dates';
    try {
      exportTableToPDF({
        controls: mergeControlsByTrain(filteredControls),
        title: 'Export Tableau Historique — Étendu',
        dateRange,
        mode: 'extended',
      });
      toast.success('PDF étendu exporté');
    } catch (error) {
      toast.error("Erreur lors de l'export");
    }
  };

  const handleExportTableExtendedHTML = () => {
    if (filteredControls.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }
    const { start: sd, end: ed } = periodDateRange;
    const dateRange = sd && ed
      ? `${format(sd, 'dd/MM/yyyy', { locale: fr })} - ${format(ed, 'dd/MM/yyyy', { locale: fr })}`
      : sd
        ? `Depuis ${format(sd, 'dd/MM/yyyy', { locale: fr })}`
        : 'Toutes les dates';
    try {
      exportTableToHTML({
        controls: mergeControlsByTrain(filteredControls),
        title: 'Export Tableau Historique — Étendu',
        dateRange,
      });
      toast.success('HTML exporté');
    } catch (error) {
      toast.error("Erreur lors de l'export");
    }
  };

  const getDateRangeString = () => {
    const { start: sd, end: ed } = periodDateRange;
    if (sd && ed) return `${format(sd, 'dd/MM/yyyy', { locale: fr })} - ${format(ed, 'dd/MM/yyyy', { locale: fr })}`;
    if (sd) return `Depuis ${format(sd, 'dd/MM/yyyy', { locale: fr })}`;
    return 'Toutes les dates';
  };

  const handlePreviewPDF = () => {
    if (filteredControls.length === 0) {
      toast.error('Aucun contrôle à prévisualiser');
      return;
    }
    try {
      const merged = mergeControlsByTrain(filteredControls);
      const doc = exportToPDF({
        controls: merged,
        title: `Historique des contrôles (${merged.length})`,
        dateRange: getDateRangeString(),
        includeStats: true,
        orientation: 'auto',
      });
      const blob = doc.output('blob');
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
      const url = URL.createObjectURL(blob);
      setPdfDocRef(doc);
      setPdfPreviewUrl(url);
      setPdfPreviewOpen(true);
    } catch (error) {
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  const handleDownloadFromPreview = () => {
    if (pdfDocRef) {
      downloadPDF(pdfDocRef, `controles-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`);
      toast.success('PDF téléchargé');
    }
  };

  const handleClosePreview = (isOpen: boolean) => {
    if (!isOpen && pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
      setPdfDocRef(null);
    }
    setPdfPreviewOpen(isOpen);
  };

  // Early returns AFTER all hooks
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleControlClick = (control: Control) => {
    navigate(`/control/${control.id}`);
  };

  const handleEdit = (control: Control) => {
    // Navigate to edit page based on location type
    if (control.location_type === 'train') {
      navigate(`/onboard?edit=${control.id}`);
    } else {
      navigate(`/station?edit=${control.id}`);
    }
  };

  const handleDelete = async (control: Control) => {
    try {
      await deleteControl(control.id);
      toast.success('Contrôle supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDuplicate = (control: Control) => {
    // Navigate to the appropriate page with duplicate parameter
    if (control.location_type === 'train') {
      navigate(`/onboard?duplicate=${control.id}`);
    } else {
      navigate(`/station?duplicate=${control.id}`);
    }
    toast.success('Contrôle dupliqué - Modifiez les données puis enregistrez');
  };
  return (
    <AppLayout>
      <div className="space-y-5 max-w-screen-2xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Historique
                {totalCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {totalCount}
                  </Badge>
                )}
              </h1>
              <p className="text-sm text-muted-foreground">Consultez et filtrez tous vos contrôles</p>
            </div>
            <div className="flex items-center gap-2">
              {/* View mode toggle — desktop only (mobile always uses list) */}
              {!isMobile && (
              <ToggleGroup 
                type="single" 
                value={viewMode} 
                onValueChange={handleViewModeChange}
                className="border rounded-md"
              >
                <ToggleGroupItem value="list" aria-label="Vue liste" size="sm" className="px-2">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="table" aria-label="Vue tableau" size="sm" className="px-2">
                  <TableIcon className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
              )}
              
              <OfflineIndicator 
                isOnline={isOnline} 
                pendingCount={pendingCount} 
                isSyncing={isSyncing}
              />
              <LastSyncIndicator
                lastSync={formattedLastSync}
                isFetching={isFetching}
                onSync={handleSync}
              />
              {controls.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Exporter
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setExportOpen(true)}>
                      <FileDown className="h-4 w-4 mr-2" />
                      Rapport complet
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleExportTableExtended}>
                      <LayoutList className="h-4 w-4 mr-2" />
                      Tableau (PDF)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportTableExtendedHTML}>
                      <FileDown className="h-4 w-4 mr-2" />
                      Tableau (HTML)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Data view mode toggle + team/agent selector */}
          <div className="flex flex-wrap items-center gap-2">
            <ViewModeToggle
              viewMode={dataViewMode}
              onViewModeChange={(mode) => {
                setDataViewMode(mode);
                if (mode !== 'by-team') setSelectedTeamId('');
                if (mode !== 'by-agent') setSelectedAgentId('');
              }}
              showTeamAgent={isUserAdmin || isUserManager}
            />
            {dataViewMode === 'by-team' && (
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue placeholder="Choisir équipe…" />
                </SelectTrigger>
                <SelectContent>
                  {teamsList.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {dataViewMode === 'by-agent' && (
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger className="w-[200px] h-8 text-xs">
                  <SelectValue placeholder="Choisir agent…" />
                </SelectTrigger>
                <SelectContent>
                  {allAgentsList.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.last_name} {a.first_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Controls content */}
        {true && (
          <>
            {/* Filters */}
            {displayControls.length > 0 && (
              <div className="space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par train, lieu, trajet..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-9"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setSearchQuery('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                {/* Location type filter + badge filters (same row on desktop) */}
                <div className="flex flex-wrap items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                  <ToggleGroup
                    type="single"
                    value={locationFilter}
                    onValueChange={(v) => v && setLocationFilter(v as LocationType | 'all')}
                    className="justify-start"
                  >
                    <ToggleGroupItem value="all" aria-label="Tous" size="sm">
                      Tous
                    </ToggleGroupItem>
                    <ToggleGroupItem value="train" aria-label="Train" size="sm" className="gap-1">
                      <Train className="h-3.5 w-3.5" />
                      Train
                    </ToggleGroupItem>
                    <ToggleGroupItem value="gare" aria-label="Gare" size="sm" className="gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      Gare
                    </ToggleGroupItem>
                  </ToggleGroup>

                  {/* Badge filters — same row on desktop, wraps on mobile */}
                  <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
                    <button type="button" onClick={() => setPoliceFilter(v => !v)}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                        policeFilter ? 'bg-blue-600 text-white border-blue-600' : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50'
                      }`}>
                      <Shield className="h-3.5 w-3.5" />Police
                    </button>
                    <button type="button" onClick={() => setSugeFilter(v => !v)}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                        sugeFilter ? 'bg-indigo-600 text-white border-indigo-600' : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50'
                      }`}>
                      <Shield className="h-3.5 w-3.5" />SUGE
                    </button>
                    <button type="button" onClick={() => setOvercrowdedFilter(v => !v)}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                        overcrowdedFilter ? 'bg-orange-500 text-white border-orange-500' : 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50'
                      }`}>
                      <Users className="h-3.5 w-3.5" />Sur-occ.
                    </button>
                    <button type="button" onClick={() => setCancelledFilter(v => !v)}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                        cancelledFilter ? 'bg-slate-700 text-white border-slate-700' : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:bg-slate-800'
                      }`}>
                      <Ban className="h-3.5 w-3.5" />Supprimé
                    </button>
                  </div>
                </div>

                {/* Period filter + date picker (same row) */}
                <div className="flex flex-wrap items-center gap-2">
                  <PeriodSelector
                    selectedPeriod={historyPeriod}
                    onPeriodChange={(p) => {
                      setHistoryPeriod(p);
                      if (p !== 'custom') { setCustomStart(''); setCustomEnd(''); }
                      if (p !== 'all' && p !== 'custom') setSelectedDate(new Date());
                    }}
                    showAll
                    customStart={customStart}
                    customEnd={customEnd}
                    onCustomStartChange={setCustomStart}
                    onCustomEndChange={setCustomEnd}
                  />
                  {historyPeriod !== 'all' && historyPeriod !== 'custom' && (
                    <DashboardDatePicker
                      date={selectedDate}
                      onDateChange={setSelectedDate}
                      period={historyPeriod}
                    />
                  )}
                </div>

                {/* Sort options */}
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
                    <SelectTrigger className="w-[200px] h-8">
                      <SelectValue placeholder="Trier par..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date (récent)</SelectItem>
                      <SelectItem value="fraud_desc">Fraude ↓ (élevée)</SelectItem>
                      <SelectItem value="fraud_asc">Fraude ↑ (faible)</SelectItem>
                      <SelectItem value="passengers_desc">Voyageurs ↓</SelectItem>
                      <SelectItem value="passengers_asc">Voyageurs ↑</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto text-muted-foreground">
                      <X className="h-3.5 w-3.5 mr-1" />
                      Effacer
                    </Button>
                  )}
                </div>
                
                {hasActiveFilters && (
                  <p className="text-sm text-muted-foreground">
                    {filteredControls.length} résultat{filteredControls.length !== 1 ? 's' : ''} sur {displayControls.length} contrôle{displayControls.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}

            {isLoading || isLoadingInfinite ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : displayControls.length === 0 ? (
              <div className="text-center py-12">
                <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-lg font-semibold mb-2">Aucun contrôle</h2>
                <p className="text-muted-foreground mb-4">
                  Vous n'avez pas encore enregistré de contrôles.
                </p>
                <Link to="/control/new" className={buttonVariants({})}>
                  Nouveau contrôle
                </Link>
              </div>
            ) : filteredControls.length === 0 ? (
              <div className="text-center py-12">
                <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-lg font-semibold mb-2">Aucun résultat</h2>
                <p className="text-muted-foreground mb-4">
                  Aucun contrôle ne correspond à vos critères de recherche.
                </p>
                <Button variant="outline" onClick={clearFilters}>
                  Effacer les filtres
                </Button>
              </div>
            ) : viewMode === 'table' ? (
              <div className="space-y-4">
                <HistoryTableView 
                  controls={filteredControls} 
                  onControlClick={handleControlClick}
                />
                
                <div ref={loadMoreRef} className="py-4 flex justify-center">
                  {isFetchingNextPage ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : hasNextPage ? (
                    <Button variant="ghost" size="sm" onClick={() => fetchNextPage()}>
                      Charger plus
                    </Button>
                  ) : filteredControls.length > 10 ? (
                    <p className="text-xs text-muted-foreground">Tous les contrôles sont chargés</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedByDate.map(({ date, groups, solo }) => (
                  <div key={date} className="space-y-2">
                    <h2 className="text-sm font-medium text-muted-foreground sticky top-0 bg-background py-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(date), 'EEEE d MMMM yyyy', { locale: fr })}
                      <Badge variant="secondary" className="ml-auto">
                        {groups.reduce((n, g) => n + g.controls.length, 0) + solo.length} contrôle{groups.reduce((n, g) => n + g.controls.length, 0) + solo.length > 1 ? 's' : ''}
                      </Badge>
                    </h2>
                    <div className="space-y-2">
                      {groups.map((g, i) => (
                        <TrainGroupCard
                          key={i}
                          groupType={g.type}
                          controls={g.controls}
                          profileMap={profileMap}
                          currentUserId={profile?.id}
                          isUserAdmin={isUserAdmin}
                          isUserManager={isUserManager}
                          onControlClick={handleControlClick}
                          onGroupClick={handleGroupClick}
                        />
                      ))}
                      {solo.map((control) => (
                        <ControlRow
                          key={control.id}
                          control={control}
                          onClick={() => handleControlClick(control)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                
                <div ref={loadMoreRef} className="py-4 flex justify-center">
                  {isFetchingNextPage ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : hasNextPage ? (
                    <Button variant="ghost" size="sm" onClick={() => fetchNextPage()}>
                      Charger plus
                    </Button>
                  ) : filteredControls.length > 10 ? (
                    <p className="text-xs text-muted-foreground">Tous les contrôles sont chargés</p>
                  ) : null}
                </div>
              </div>
            )}
          </>
        )}

        {/* Embarkment section — visible when Tout or Gare filter is active */}
        {(locationFilter === 'all' || locationFilter === 'gare') && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-3 px-1">
              <ArrowUpFromLine className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-semibold text-blue-600">Missions embarquement / débarquement</span>
              {embarkmentMissions.length > 0 && (
                <Badge variant="secondary" className="text-xs">{embarkmentMissions.length}</Badge>
              )}
            </div>
            {isLoadingEmbarkment ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : embarkmentMissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Aucune mission embarquement enregistrée.
              </div>
            ) : (
              <EmbarkmentHistoryView
                missions={embarkmentMissions}
                viewMode={viewMode}
                profileMap={profileMap}
                onMissionClick={(mission) => {
                  navigate(`/station?mission=${mission.id}`);
                }}
                onDelete={deleteEmbarkmentMission}
              />
            )}
          </div>
        )}
      </div>
      
      {/* Detail Dialog */}
      <ControlDetailDialog
        control={selectedControl}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={selectedControl && canEditControl(selectedControl) ? handleEdit : undefined}
        onDelete={selectedControl && canEditControl(selectedControl) ? handleDelete : undefined}
        onDuplicate={handleDuplicate}
      />

      {/* Merged Group Dialog — vue fusionnée multi-agents */}
      <ControlDetailDialog
        control={mergedGroupControls ? mergeControlsByTrain(mergedGroupControls)[0] : null}
        open={mergedDialogOpen}
        onOpenChange={setMergedDialogOpen}
      />
      
      {/* Export Dialog */}
      <ExportDialog
        controls={mergeControlsByTrain(controls)}
        open={exportOpen}
        onOpenChange={setExportOpen}
      />

      {/* PDF Preview Dialog */}
      <PdfPreviewDialog
        open={pdfPreviewOpen}
        onOpenChange={handleClosePreview}
        pdfUrl={pdfPreviewUrl}
        onDownload={handleDownloadFromPreview}
        title={`Aperçu PDF - ${filteredControls.length} contrôle(s)`}
      />
    </AppLayout>
  );
}

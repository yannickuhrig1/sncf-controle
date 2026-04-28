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
import { useHistoryFilters, mergeControlsByTrain } from '@/hooks/useHistoryFilters';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ControlDetailDialog } from '@/components/controls/ControlDetailDialog';
import { ExportDialog } from '@/components/controls/ExportDialog';
import { PdfPreviewDialog } from '@/components/controls/PdfPreviewDialog';
import { LastSyncIndicator } from '@/components/controls/LastSyncIndicator';
import { OfflineIndicator } from '@/components/controls/OfflineIndicator';
import { HistoryTableView } from '@/components/history/HistoryTableView';
import { EmbarkmentHistoryView } from '@/components/history/EmbarkmentHistoryView';
import { HistoryFilters } from '@/components/history/HistoryFilters';
import { HistoryDateGroup } from '@/components/history/HistoryDateGroup';
import { ViewModeToggle } from '@/components/dashboard/ViewModeToggle';
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
  Download,
  Search,
  ChevronDown,
  LayoutList,
  FileDown,
  List,
  TableIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Control = Database['public']['Tables']['controls']['Row'];

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
    deleteMission: deleteEmbarkmentMission,
    removeTrainFromMission: removeEmbarkmentTrain,
  } = useEmbarkmentMissions();
  const navigate = useNavigate();
  const { formattedLastSync, updateLastSync } = useLastSync();
  const { isOnline, pendingCount, isSyncing } = useOfflineSync();
  const { preferences, updatePreferences } = useUserPreferences();
  const isUserAdmin = isAdmin();
  const isUserManager = isManager();

  const [selectedControl, setSelectedControl] = useState<Control | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [dataViewMode, setDataViewMode] = useState<ViewMode>('all-data');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfDocRef, setPdfDocRef] = useState<ReturnType<typeof exportToPDF> | null>(null);
  const [mergedGroupControls, setMergedGroupControls] = useState<Control[] | null>(null);
  const [mergedDialogOpen, setMergedDialogOpen] = useState(false);

  const savedViewMode: HistoryViewMode = preferences?.history_view_mode ?? 'list';
  const viewMode: HistoryViewMode = isMobile ? 'list' : savedViewMode;

  const handleViewModeChange = (newMode: string | undefined) => {
    if (newMode && (newMode === 'list' || newMode === 'table')) {
      updatePreferences({ history_view_mode: newMode });
    }
  };

  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleSync = useCallback(async () => {
    await refetch();
    updateLastSync();
    toast.success('Données synchronisées');
  }, [refetch, updateLastSync]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Source data: infinite first, fall back to regular
  const sourceControls = infiniteControls.length > 0 ? infiniteControls : controls;

  // Apply scope filter (mes/équipe/agent)
  const displayControls = useMemo(() => {
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
  }, [sourceControls, dataViewMode, profile, selectedTeamId, selectedAgentId]);

  // Filters & grouping (extracted to a hook)
  const {
    state: filters,
    setters,
    clearFilters,
    periodDateRange,
    filteredControls,
    groupedByDate,
    hasActiveFilters,
    advancedFilterCount,
  } = useHistoryFilters(displayControls);

  // Embarkment missions grouped by date — show only when no badge filters active
  const embarkmentByDate = useMemo(() => {
    if (filters.locationFilter !== 'all' && filters.locationFilter !== 'gare') return {} as Record<string, typeof embarkmentMissions>;
    if (filters.civileFilter || filters.policeFilter || filters.sugeFilter || filters.overcrowdedFilter || filters.cancelledFilter) {
      return {} as Record<string, typeof embarkmentMissions>;
    }
    const byDate: Record<string, typeof embarkmentMissions> = {};
    embarkmentMissions.forEach(m => {
      if (!byDate[m.mission_date]) byDate[m.mission_date] = [];
      byDate[m.mission_date].push(m);
    });
    return byDate;
  }, [embarkmentMissions, filters.locationFilter, filters.civileFilter, filters.policeFilter, filters.sugeFilter, filters.overcrowdedFilter, filters.cancelledFilter]);

  // Merge embarkment-only dates into the grouped list, and inject embarkment stats into each day's totals
  const allDayGroups = useMemo(() => {
    const embarkStatsByDate: Record<string, { passengers: number; fraud: number }> = {};
    Object.entries(embarkmentByDate).forEach(([date, missions]) => {
      let passengers = 0;
      let fraud = 0;
      missions.forEach(m => {
        m.trains.forEach((t: { controlled?: number; refused?: number }) => {
          passengers += t.controlled ?? 0;
          fraud += t.refused ?? 0;
        });
      });
      embarkStatsByDate[date] = { passengers, fraud };
    });

    const dates = new Set([
      ...groupedByDate.map(g => g.date),
      ...Object.keys(embarkmentByDate),
    ]);
    const map = new Map(groupedByDate.map(g => [g.date, g]));

    return Array.from(dates)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(date => {
        const base = map.get(date) ?? { date, groups: [], solo: [], totals: { passengers: 0, fraud: 0, rate: 0 } };
        const extra = embarkStatsByDate[date];
        if (!extra) return base;
        const passengers = base.totals.passengers + extra.passengers;
        const fraud = base.totals.fraud + extra.fraud;
        const rate = passengers > 0 ? (fraud / passengers) * 100 : 0;
        return { ...base, totals: { passengers, fraud, rate } };
      });
  }, [groupedByDate, embarkmentByDate]);

  // Profiles for agent display in TrainGroupCard / EmbarkmentHistoryView
  const agentIds = useMemo(() => {
    const ids = new Set(sourceControls.map(c => c.agent_id));
    embarkmentMissions.forEach(m => ids.add(m.agent_id));
    return [...ids];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceControls.length, embarkmentMissions.length]);

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

  const { data: teamsList = [] } = useQuery({
    queryKey: ['teams-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('id, name').order('name');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

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

  const canEditControl = useCallback((control: Control) =>
    control.agent_id === profile?.id || isUserAdmin || isUserManager,
    [profile?.id, isUserAdmin, isUserManager]
  );

  const handleGroupClick = useCallback((groupControls: Control[]) => {
    setMergedGroupControls(groupControls);
    setMergedDialogOpen(true);
  }, []);

  const getDateRangeString = () => {
    const { start: sd, end: ed } = periodDateRange;
    if (sd && ed) return `${format(sd, 'dd/MM/yyyy', { locale: fr })} - ${format(ed, 'dd/MM/yyyy', { locale: fr })}`;
    if (sd) return `Depuis ${format(sd, 'dd/MM/yyyy', { locale: fr })}`;
    return 'Toutes les dates';
  };

  const handleExportTableExtended = () => {
    if (filteredControls.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }
    try {
      exportTableToPDF({
        controls: mergeControlsByTrain(filteredControls),
        title: 'Export Tableau Historique — Étendu',
        dateRange: getDateRangeString(),
        mode: 'extended',
      });
      toast.success('PDF étendu exporté');
    } catch {
      toast.error("Erreur lors de l'export");
    }
  };

  const handleExportTableExtendedHTML = () => {
    if (filteredControls.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }
    try {
      exportTableToHTML({
        controls: mergeControlsByTrain(filteredControls),
        title: 'Export Tableau Historique — Étendu',
        dateRange: getDateRangeString(),
      });
      toast.success('HTML exporté');
    } catch {
      toast.error("Erreur lors de l'export");
    }
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
    } catch {
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
    if (control.location_type === 'train') navigate(`/onboard?edit=${control.id}`);
    else navigate(`/station?edit=${control.id}`);
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
    if (control.location_type === 'train') navigate(`/onboard?duplicate=${control.id}`);
    else navigate(`/station?duplicate=${control.id}`);
    toast.success('Contrôle dupliqué - Modifiez les données puis enregistrez');
  };

  const handleMissionClick = (mission: { id: string }) => {
    navigate(`/station?mission=${mission.id}`);
  };

  return (
    <AppLayout>
      <div className="space-y-4 max-w-screen-2xl mx-auto">
        {/* Header */}
        <header className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col gap-1 min-w-0">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <History className="h-5 w-5 text-primary shrink-0" />
                Historique
                {totalCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {totalCount}
                  </Badge>
                )}
              </h1>
              <p className="text-sm text-muted-foreground hidden sm:block">
                Consultez et filtrez tous vos contrôles
              </p>
            </div>

            <div className="flex items-center gap-2">
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
                      <span className="hidden sm:inline">Exporter</span>
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

          {/* Scope: mes/équipe/agent */}
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
        </header>

        {/* Filters */}
        {displayControls.length > 0 && (
          <HistoryFilters
            searchQuery={filters.searchQuery}
            onSearchChange={setters.setSearchQuery}
            locationFilter={filters.locationFilter}
            onLocationChange={setters.setLocationFilter}
            historyPeriod={filters.historyPeriod}
            onPeriodChange={setters.setHistoryPeriod}
            selectedDate={filters.selectedDate}
            onSelectedDateChange={setters.setSelectedDate}
            customStart={filters.customStart}
            customEnd={filters.customEnd}
            onCustomStartChange={setters.setCustomStart}
            onCustomEndChange={setters.setCustomEnd}
            sortOption={filters.sortOption}
            onSortChange={setters.setSortOption}
            civileFilter={filters.civileFilter}
            policeFilter={filters.policeFilter}
            sugeFilter={filters.sugeFilter}
            overcrowdedFilter={filters.overcrowdedFilter}
            cancelledFilter={filters.cancelledFilter}
            onToggleCivile={() => setters.setCivileFilter(v => !v)}
            onTogglePolice={() => setters.setPoliceFilter(v => !v)}
            onToggleSuge={() => setters.setSugeFilter(v => !v)}
            onToggleOvercrowded={() => setters.setOvercrowdedFilter(v => !v)}
            onToggleCancelled={() => setters.setCancelledFilter(v => !v)}
            hasActiveFilters={hasActiveFilters}
            advancedFilterCount={advancedFilterCount}
            onClearAll={clearFilters}
            filteredCount={filteredControls.length}
            totalCount={displayControls.length}
          />
        )}

        {/* Body */}
        {isLoading || isLoadingInfinite ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : displayControls.length === 0 && embarkmentMissions.length === 0 ? (
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
        ) : filteredControls.length === 0 && Object.keys(embarkmentByDate).length === 0 ? (
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
          <div className="space-y-5">
            {allDayGroups.map(({ date, groups, solo, totals }) => (
              <HistoryDateGroup
                key={date}
                date={date}
                groups={groups}
                solo={solo}
                embarkments={embarkmentByDate[date] || []}
                totals={totals}
                profileMap={profileMap}
                currentUserId={profile?.id}
                isUserAdmin={isUserAdmin}
                isUserManager={isUserManager}
                viewMode={viewMode}
                onControlClick={handleControlClick}
                onGroupClick={handleGroupClick}
                onMissionClick={handleMissionClick}
                onMissionDelete={deleteEmbarkmentMission}
                onMissionRemoveTrain={removeEmbarkmentTrain}
              />
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

      {/* Merged Group Dialog */}
      <ControlDetailDialog
        control={mergedGroupControls ? mergeControlsByTrain(mergedGroupControls)[0] : null}
        open={mergedDialogOpen}
        onOpenChange={setMergedDialogOpen}
      />

      {/* Export Dialog */}
      <ExportDialog
        controls={mergeControlsByTrain(controls)}
        embarkments={embarkmentMissions}
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

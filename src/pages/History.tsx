import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useControls } from '@/hooks/useControls';
import { useEmbarkmentMissions } from '@/hooks/useEmbarkmentMissions';
import { useLastSync } from '@/hooks/useLastSync';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useUserPreferences, type HistoryViewMode } from '@/hooks/useUserPreferences';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ControlDetailDialog } from '@/components/controls/ControlDetailDialog';
import { ExportDialog } from '@/components/controls/ExportDialog';
import { PdfPreviewDialog } from '@/components/controls/PdfPreviewDialog';
import { LastSyncIndicator } from '@/components/controls/LastSyncIndicator';
import { OfflineIndicator } from '@/components/controls/OfflineIndicator';
import { HistoryTableView } from '@/components/history/HistoryTableView';
import { EmbarkmentHistoryView } from '@/components/history/EmbarkmentHistoryView';
import type { Period } from '@/components/dashboard/PeriodSelector';
import { ViewModeToggle } from '@/components/dashboard/ViewModeToggle';
import { getFraudRateColor } from '@/lib/stats';
import { exportTableToPDF, exportToPDF, downloadPDF } from '@/lib/exportUtils';
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
  ArrowDownToLine,
  ArrowUpFromLine,
  Eye,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Control = Database['public']['Tables']['controls']['Row'];
type LocationType = Database['public']['Enums']['location_type'];
type SortOption = 'date' | 'fraud_desc' | 'fraud_asc' | 'passengers_desc' | 'passengers_asc';
type HistoryTab = 'controls' | 'embarkment';

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

            {/* Line 3: fraud badges — simplified, max 4 */}
            {fraudCount > 0 && (() => {
              const badges = [
                control.tarifs_controle > 0 && { label: `TC: ${control.tarifs_controle}`, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-100 border-0' },
                control.pv > 0 && { label: `PV: ${control.pv}`, cls: 'bg-red-500 text-white hover:bg-red-500 border-0' },
                control.rnv > 0 && { label: `RNV: ${control.rnv}`, cls: '' },
                ((control.stt_50 || 0) + (control.stt_100 || 0)) > 0 && { label: `STT: ${(control.stt_50 || 0) + (control.stt_100 || 0)}`, cls: 'text-orange-600 border-orange-200' },
                (control.titre_tiers || 0) > 0 && { label: `T.Tiers: ${control.titre_tiers}`, cls: '' },
                (control.doc_naissance || 0) > 0 && { label: `D.Naiss: ${control.doc_naissance}`, cls: '' },
              ].filter(Boolean) as { label: string; cls: string }[];

              const visible = badges.slice(0, 3);
              const extra = badges.length - 3;

              return (
                <div className="flex flex-wrap gap-1 mt-2">
                  {visible.map((b, i) => (
                    <Badge key={i} variant="outline" className={`text-[10px] px-1.5 py-0 ${b.cls}`}>
                      {b.label}
                    </Badge>
                  ))}
                  {extra > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                      +{extra}
                    </Badge>
                  )}
                </div>
              );
            })()}
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
  const { user, profile, loading: authLoading } = useAuth();
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
  } = useEmbarkmentMissions();
  const navigate = useNavigate();
  const { formattedLastSync, updateLastSync } = useLastSync();
  const { isOnline, pendingCount, isSyncing } = useOfflineSync();
  const { preferences, updatePreferences } = useUserPreferences();
  
  const [activeTab, setActiveTab] = useState<HistoryTab>('controls');
  const [selectedControl, setSelectedControl] = useState<Control | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<LocationType | 'all'>('all');
  const [sortOption, setSortOption] = useState<SortOption>('date');
  const [historyPeriod, setHistoryPeriod] = useState<Period | 'all'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [dataViewMode, setDataViewMode] = useState<ViewMode>('all-data');
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfDocRef, setPdfDocRef] = useState<ReturnType<typeof exportToPDF> | null>(null);
  
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
    
    // Filter by agent if viewing "my data" only
    if (dataViewMode === 'my-data' && profile) {
      return sourceControls.filter(c => c.agent_id === profile.id);
    }
    
    return sourceControls;
  }, [infiniteControls, controls, dataViewMode, profile]);

  // Compute effective date range from period selection
  const periodDateRange = useMemo(() => {
    const today = new Date();
    switch (historyPeriod) {
      case 'day':
        return { start: today, end: today };
      case 'week':
        return { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) };
      case 'month':
        return { start: startOfMonth(today), end: endOfMonth(today) };
      case 'year':
        return { start: startOfYear(today), end: endOfYear(today) };
      case 'custom':
        return {
          start: customStart ? new Date(customStart) : null,
          end: customEnd ? new Date(customEnd) : null,
        };
      default: // 'all'
        return { start: null, end: null };
    }
  }, [historyPeriod, customStart, customEnd]);

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
  }, [displayControls, searchQuery, locationFilter, sortOption, periodDateRange, getFraudRate]);

  // Group filtered controls by date
  const groupedControls = useMemo(() => {
    return filteredControls.reduce((groups, control) => {
      const date = control.control_date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(control);
      return groups;
    }, {} as Record<string, Control[]>);
  }, [filteredControls]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedControls).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );
  }, [groupedControls]);

  const hasActiveFilters = searchQuery.trim() !== '' || locationFilter !== 'all' || sortOption !== 'date' || historyPeriod !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setLocationFilter('all');
    setSortOption('date');
    setHistoryPeriod('all');
    setCustomStart('');
    setCustomEnd('');
  };

  const handleExportTablePDF = () => {
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
        controls: filteredControls,
        title: 'Export Tableau Historique',
        dateRange,
      });
      toast.success('PDF exporté');
    } catch (error) {
      toast.error('Erreur lors de l\'export');
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
      const doc = exportToPDF({
        controls: filteredControls,
        title: `Historique des contrôles (${filteredControls.length})`,
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
    setSelectedControl(control);
    setDetailOpen(true);
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
                <>
              <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
                    <Download className="h-4 w-4 mr-2" />
                    Exporter
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Data view mode toggle */}
          <ViewModeToggle 
            viewMode={dataViewMode} 
            onViewModeChange={setDataViewMode}
          />
          
          {/* History tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as HistoryTab)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="controls" className="gap-2">
                <ArrowDownToLine className="h-4 w-4" />
                Contrôles
                {totalCount > 0 && <Badge variant="secondary" className="text-xs ml-1">{totalCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="embarkment" className="gap-2">
                <ArrowUpFromLine className="h-4 w-4" />
                Embarquement
                {embarkmentMissions.length > 0 && <Badge variant="secondary" className="text-xs ml-1">{embarkmentMissions.length}</Badge>}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Controls tab content */}
        {activeTab === 'controls' && (
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
                
                {/* Location type filter and sort */}
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
                </div>

                {/* Period filter */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                    {([
                      { value: 'all',   label: 'Tous' },
                      { value: 'day',   label: 'Jour' },
                      { value: 'week',  label: 'Semaine' },
                      { value: 'month', label: 'Mois' },
                      { value: 'year',  label: 'Année' },
                      { value: 'custom',label: 'Perso.' },
                    ] as const).map((p) => (
                      <Button
                        key={p.value}
                        variant="ghost"
                        size="sm"
                        className={`h-7 px-3 text-xs font-medium transition-colors ${
                          historyPeriod === p.value
                            ? 'bg-background shadow-sm text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        onClick={() => {
                          setHistoryPeriod(p.value);
                          if (p.value !== 'custom') { setCustomStart(''); setCustomEnd(''); }
                        }}
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                  {historyPeriod === 'custom' && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="h-8 px-2 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <span className="text-xs text-muted-foreground">→</span>
                      <input
                        type="date"
                        value={customEnd}
                        min={customStart}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="h-8 px-2 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
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
                {sortedDates.map((date) => (
                  <div key={date} className="space-y-2">
                    <h2 className="text-sm font-medium text-muted-foreground sticky top-0 bg-background py-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(date), 'EEEE d MMMM yyyy', { locale: fr })}
                      <Badge variant="secondary" className="ml-auto">
                        {groupedControls[date].length} contrôle{groupedControls[date].length > 1 ? 's' : ''}
                      </Badge>
                    </h2>
                    <div className="space-y-2">
                      {groupedControls[date].map((control) => (
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

        {/* Embarkment tab content */}
        {activeTab === 'embarkment' && (
          <>
            {isLoadingEmbarkment ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : embarkmentMissions.length === 0 ? (
              <div className="text-center py-12">
                <ArrowUpFromLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-lg font-semibold mb-2">Aucune mission embarquement</h2>
                <p className="text-muted-foreground mb-4">
                  Vous n'avez pas encore enregistré de missions embarquement.
                </p>
                <Link to="/station" className={buttonVariants({})}>
                  Nouvelle mission
                </Link>
              </div>
            ) : (
              <EmbarkmentHistoryView
                missions={embarkmentMissions}
                viewMode={viewMode}
                onMissionClick={(mission) => {
                  navigate(`/station?mission=${mission.id}`);
                }}
              />
            )}
          </>
        )}
      </div>
      
      {/* Detail Dialog */}
      <ControlDetailDialog
        control={selectedControl}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
      />
      
      {/* Export Dialog */}
      <ExportDialog
        controls={controls}
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

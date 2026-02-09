import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
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
import { 
  Train, 
  Building2, 
  Calendar, 
  Users, 
  AlertTriangle,
  ChevronRight,
  Eye,
  Download,
  FileText,
  Globe,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  TrendingDown,
  UserX,
  Search,
  X,
  LayoutGrid,
  List,
  TableIcon,
  Filter,
} from 'lucide-react';
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
  onMissionClick?: (mission: EmbarkmentMissionRow) => void;
  isLoading?: boolean;
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

function MissionRow({ mission, onClick }: { mission: EmbarkmentMissionRow; onClick?: () => void }) {
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
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          
          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{mission.station_name}</span>
              <Badge variant={mission.is_completed ? 'default' : 'secondary'} className="text-xs shrink-0">
                {mission.is_completed ? (
                  <><CheckCircle2 className="h-3 w-3 mr-1" /> Terminée</>
                ) : (
                  <><Clock className="h-3 w-3 mr-1" /> En cours</>
                )}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(mission.mission_date), 'dd/MM/yyyy', { locale: fr })}
              </span>
              <span className="flex items-center gap-1">
                <Train className="h-3 w-3" />
                {stats.trainCount} train{stats.trainCount > 1 ? 's' : ''}
              </span>
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-center hidden sm:block">
              <div className="flex items-center gap-1 text-sm font-medium">
                <Users className="h-3 w-3" />
                {stats.totalControlled}
              </div>
            </div>
            <div className={`text-center ${getFraudRateColor(stats.fraudRate)}`}>
              <div className="flex items-center gap-1 text-sm font-semibold">
                <AlertTriangle className="h-3 w-3" />
                {stats.fraudRate.toFixed(1)}%
              </div>
            </div>
            
            {/* Export menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handlePreviewHTML}>
                  <Eye className="h-4 w-4 mr-2" />
                  Aperçu
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportHTML}>
                  <Globe className="h-4 w-4 mr-2" />
                  Export HTML
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Grid card component for grid view
function MissionCard({ mission, onClick }: { mission: EmbarkmentMissionRow; onClick?: () => void }) {
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
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </div>
      </CardContent>
    </Card>
  );
}

export function EmbarkmentHistoryView({ missions, viewMode, onMissionClick, isLoading }: EmbarkmentHistoryViewProps) {
  // Internal state for embarkment-specific filtering
  const [internalViewMode, setInternalViewMode] = useState<EmbarkmentViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [stationFilter, setStationFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'active'>('all');

  // Get unique stations for filter
  const uniqueStations = useMemo(() => {
    const stations = new Set(missions.map(m => m.station_name));
    return Array.from(stations).sort();
  }, [missions]);

  // Filter missions
  const filteredMissions = useMemo(() => {
    return missions.filter(mission => {
      // Station filter
      if (stationFilter !== 'all' && mission.station_name !== stationFilter) {
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

  // Group missions by date
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

  const hasActiveFilters = searchQuery.trim() !== '' || stationFilter !== 'all' || statusFilter !== 'all' || startDate !== undefined || endDate !== undefined;

  const clearFilters = () => {
    setSearchQuery('');
    setStationFilter('all');
    setStatusFilter('all');
    setStartDate(undefined);
    setEndDate(undefined);
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
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // List view (default)
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
                {groupedMissions[date].map((mission) => (
                  <MissionRow 
                    key={mission.id} 
                    mission={mission} 
                    onClick={() => onMissionClick?.(mission)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
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

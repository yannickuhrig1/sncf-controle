import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { getFraudRateColor, getFraudRateBgColor } from '@/lib/stats';
import { downloadEmbarkmentPDF, downloadEmbarkmentHTML, openEmbarkmentHTMLPreview } from '@/lib/embarkmentExportUtils';
import type { EmbarkmentMissionData, EmbarkmentTrain } from '@/components/controls/EmbarkmentControl';
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
} from 'lucide-react';
import { toast } from 'sonner';

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

export function EmbarkmentHistoryView({ missions, viewMode, onMissionClick, isLoading }: EmbarkmentHistoryViewProps) {
  // Group missions by date
  const groupedMissions = missions.reduce((groups, mission) => {
    const date = mission.mission_date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(mission);
    return groups;
  }, {} as Record<string, EmbarkmentMissionRow[]>);
  
  const sortedDates = Object.keys(groupedMissions).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  if (viewMode === 'table') {
    return (
      <>
        <GlobalStatsSummary missions={missions} />
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
                {missions.map((mission, index) => {
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
      </>
    );
  }

  // List view
  return (
    <>
      <GlobalStatsSummary missions={missions} />
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
    </>
  );
}

import { useState, useMemo, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useControlsWithFilter, ViewMode, Period } from '@/hooks/useControlsWithFilter';
import { useLastSync } from '@/hooks/useLastSync';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { LastSyncIndicator } from '@/components/controls/LastSyncIndicator';
import { OfflineIndicator } from '@/components/controls/OfflineIndicator';
import { PendingControlsPanel } from '@/components/controls/PendingControlsPanel';
import { DashboardDatePicker } from '@/components/dashboard/DashboardDatePicker';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import { ViewModeToggle } from '@/components/dashboard/ViewModeToggle';
import { calculateStats, formatFraudRate } from '@/lib/stats';

import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CreditCard,
  IdCard,
  LayoutDashboard,
  Loader2,
  Share2,
  Train,
  UserCheck,
  Users,
} from 'lucide-react';

type LocationFilter = 'all' | 'train' | 'station';
type EmailFormat = 'text' | 'html' | 'pdf';

// ── Helpers partage résumé ─────────────────────────────────────────────────

interface DashboardShareData {
  stats: ReturnType<typeof calculateStats>;
  detailedStats: {
    tarifsControle: { stt50: number; rnv: number; titreTiers: number; docNaissance: number; autre: number };
    tarifsBord: { stt50: number; stt100: number; rnv: number; titreTiers: number; docNaissance: number; autre: number };
    totalBord: number;
  };
  periodLabel: string;
  dateRangeLabel: string;
  locationLabel: string;
}

function buildDashboardText({ stats, detailedStats, periodLabel, dateRangeLabel, locationLabel }: DashboardShareData): string {
  const line = '─'.repeat(40);
  let t = `📊 SNCF Contrôles — Tableau de bord\n`;
  t += `Période  : ${periodLabel} (${dateRangeLabel})\n`;
  if (locationLabel !== 'Tous') t += `Lieu     : ${locationLabel}\n`;
  t += `${line}\n`;
  t += `Voyageurs      : ${stats.totalPassengers}  (${stats.controlCount} contrôle${stats.controlCount > 1 ? 's' : ''})\n`;
  t += `Taux de fraude : ${formatFraudRate(stats.fraudRate)}  (${stats.fraudCount} fraude${stats.fraudCount !== 1 ? 's' : ''})\n`;
  const pct = stats.totalPassengers > 0 ? ` (${((stats.passengersInRule / stats.totalPassengers) * 100).toFixed(1)}%)` : '';
  t += `En règle       : ${stats.passengersInRule}${pct}\n`;
  t += `Procès-verbaux : ${stats.pv}\n`;

  if (stats.tarifsControle > 0) {
    t += `\nTarifs contrôle : ${stats.tarifsControle}\n`;
    if (detailedStats.tarifsControle.stt50 > 0)       t += `  STT 50€       : ${detailedStats.tarifsControle.stt50}\n`;
    if (detailedStats.tarifsControle.rnv > 0)         t += `  RNV           : ${detailedStats.tarifsControle.rnv}\n`;
    if (detailedStats.tarifsControle.titreTiers > 0)  t += `  Titre tiers   : ${detailedStats.tarifsControle.titreTiers}\n`;
    if (detailedStats.tarifsControle.docNaissance > 0)t += `  D.naissance   : ${detailedStats.tarifsControle.docNaissance}\n`;
    if (detailedStats.tarifsControle.autre > 0)       t += `  Autre         : ${detailedStats.tarifsControle.autre}\n`;
  }

  if (stats.pv > 0) {
    t += `\nProcès-verbaux détail :\n`;
    if (stats.stt100 > 0)       t += `  STT 100€           : ${stats.stt100}\n`;
    if (stats.pvStt100 > 0)     t += `  STT autre montant  : ${stats.pvStt100}\n`;
    if (stats.pvRnv > 0)        t += `  RNV                : ${stats.pvRnv}\n`;
    if (stats.pvTitreTiers > 0) t += `  Titre tiers        : ${stats.pvTitreTiers}\n`;
    if (stats.pvDocNaissance > 0)t += `  D.naissance        : ${stats.pvDocNaissance}\n`;
    if (stats.pvAutre > 0)      t += `  Autre              : ${stats.pvAutre}\n`;
  }

  if (detailedStats.totalBord > 0) {
    t += `\nTarifs à bord / exceptionnel : ${detailedStats.totalBord}\n`;
    if (detailedStats.tarifsBord.stt50 > 0)        t += `  Tarif bord         : ${detailedStats.tarifsBord.stt50}\n`;
    if (detailedStats.tarifsBord.stt100 > 0)       t += `  Tarif exceptionnel : ${detailedStats.tarifsBord.stt100}\n`;
    if (detailedStats.tarifsBord.rnv > 0)          t += `  RNV                : ${detailedStats.tarifsBord.rnv}\n`;
    if (detailedStats.tarifsBord.titreTiers > 0)   t += `  Titre tiers        : ${detailedStats.tarifsBord.titreTiers}\n`;
    if (detailedStats.tarifsBord.docNaissance > 0) t += `  D.naissance        : ${detailedStats.tarifsBord.docNaissance}\n`;
    if (detailedStats.tarifsBord.autre > 0)        t += `  Autre              : ${detailedStats.tarifsBord.autre}\n`;
  }

  if (stats.riPositive > 0 || stats.riNegative > 0) {
    t += `\nRelevés d'identité : RI+ ${stats.riPositive}   RI− ${stats.riNegative}\n`;
  }

  return t;
}

function buildDashboardHTML(data: DashboardShareData): string {
  const text = buildDashboardText(data);
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Tableau de bord SNCF Contrôles</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:600px;margin:2rem auto;padding:1rem;background:#f9fafb;color:#111}
  h1{font-size:1.1rem;font-weight:700;margin-bottom:.5rem}
  pre{background:#fff;border:1px solid #e5e7eb;border-radius:.5rem;padding:1.25rem;white-space:pre-wrap;font-size:.875rem;line-height:1.6}
  p{color:#6b7280;font-size:.75rem;margin-top:1rem}
</style></head><body>
<h1>📊 SNCF Contrôles — Tableau de bord</h1>
<pre>${text.replace(/</g, '&lt;')}</pre>
<p>Généré le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
</body></html>`;
}

function buildDashboardPDF(data: DashboardShareData): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const text = buildDashboardText(data);
  const lines = text.split('\n');
  let y = 20;
  doc.setFontSize(10);
  for (const line of lines) {
    if (y > 270) { doc.addPage(); y = 20; }
    if (line.startsWith('📊')) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(line.replace('📊 ', ''), 15, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
    } else if (line.startsWith('─')) {
      doc.setDrawColor(200, 200, 200);
      doc.line(15, y, 195, y);
    } else {
      doc.text(line.replace(/[📊]/g, ''), 15, y);
    }
    y += 6;
  }
  return doc;
}

// Ligne compacte label / valeur pour les sections détail
function StatRow({ label, value }: { label: string; value: number }) {
  if (value === 0) return null;
  return (
    <div className="flex justify-between items-center px-2 py-1 rounded-md hover:bg-muted/50 transition-colors">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-bold bg-muted px-1.5 py-0.5 rounded-md min-w-[1.5rem] text-center">{value}</span>
    </div>
  );
}

const locationButtons: { value: LocationFilter; label: string; icon: React.ElementType }[] = [
  { value: 'all',     label: 'Tous',     icon: LayoutDashboard },
  { value: 'train',   label: 'À bord',   icon: Train },
  { value: 'station', label: 'En gare',  icon: Building2 },
];

export default function Dashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('my-data');
  const [period, setPeriod] = useState<Period>('day');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [locationFilter, setLocationFilter] = useState<LocationFilter>('all');

  // Email share dialog
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailFormat, setEmailFormat] = useState<EmailFormat>('text');

  const { controls, isLoading: controlsLoading, isFetching, refetch, startDate, endDate } = useControlsWithFilter({
    date: selectedDate,
    viewMode,
    period,
    customStart: period === 'custom' ? customStart : null,
    customEnd:   period === 'custom' ? customEnd   : null,
  });

  const { formattedLastSync, updateLastSync } = useLastSync();
  const { isOnline, pendingCount, isSyncing } = useOfflineSync();

  const handleSync = useCallback(async () => {
    await refetch();
    updateLastSync();
    toast.success('Données synchronisées');
  }, [refetch, updateLastSync]);

  // Filtrage par lieu (client-side)
  const filteredByLocation = useMemo(() => {
    if (locationFilter === 'train')
      return controls.filter(c => c.location_type === 'train');
    if (locationFilter === 'station')
      return controls.filter(c => c.location_type === 'gare' || c.location_type === 'quai');
    return controls;
  }, [controls, locationFilter]);

  const stats = useMemo(() => calculateStats(filteredByLocation), [filteredByLocation]);

  // Calculs détaillés non présents dans calculateStats
  const detailedStats = useMemo(() => {
    const tarifsControle = filteredByLocation.reduce((acc, c) => ({
      stt50:       acc.stt50        + c.stt_50,
      stt100:      acc.stt100       + c.stt_100,
      rnv:         acc.rnv          + c.rnv,
      titreTiers:  acc.titreTiers   + (c.titre_tiers   || 0),
      docNaissance:acc.docNaissance + (c.doc_naissance  || 0),
      autre:       acc.autre        + (c.autre_tarif    || 0),
    }), { stt50: 0, stt100: 0, rnv: 0, titreTiers: 0, docNaissance: 0, autre: 0 });

    const tarifsBord = filteredByLocation.reduce((acc, c) => ({
      stt50:       acc.stt50        + (c.tarif_bord_stt_50        || 0),
      stt100:      acc.stt100       + (c.tarif_bord_stt_100       || 0),
      rnv:         acc.rnv          + (c.tarif_bord_rnv           || 0),
      titreTiers:  acc.titreTiers   + (c.tarif_bord_titre_tiers   || 0),
      docNaissance:acc.docNaissance + (c.tarif_bord_doc_naissance || 0),
      autre:       acc.autre        + (c.tarif_bord_autre         || 0),
    }), { stt50: 0, stt100: 0, rnv: 0, titreTiers: 0, docNaissance: 0, autre: 0 });

    const totalBord = tarifsBord.stt50 + tarifsBord.stt100 + tarifsBord.rnv
      + tarifsBord.titreTiers + tarifsBord.docNaissance + tarifsBord.autre;

    const totalPV = stats.pvStt100 + stats.pvRnv + stats.pvTitreTiers
      + stats.pvDocNaissance + stats.pvAutre;

    return { tarifsControle, tarifsBord, totalBord, totalPV };
  }, [filteredByLocation, stats]);

  // Partager — données résumé visible
  const periodLabels: Record<Period, string> = { day: 'Jour', week: 'Semaine', month: 'Mois', year: 'Année', custom: 'Personnalisée' };
  const locationLabels: Record<LocationFilter, string> = { all: 'Tous', train: 'À bord', station: 'En gare' };

  const shareData: DashboardShareData = useMemo(() => ({
    stats,
    detailedStats,
    periodLabel: periodLabels[period],
    dateRangeLabel: startDate === endDate ? startDate : `${startDate} → ${endDate}`,
    locationLabel: locationLabels[locationFilter],
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [stats, detailedStats, period, startDate, endDate, locationFilter]);

  const filenameSuffix = startDate === endDate ? startDate : `${startDate}-${endDate}`;

  const handleExportHTML = useCallback(() => {
    try {
      const html = buildDashboardHTML(shareData);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      a.download = `tableau-bord-${filenameSuffix}.html`;
      a.click();
      toast.success('Export HTML téléchargé');
    } catch {
      toast.error('Erreur lors de l\'export HTML');
    }
  }, [shareData, filenameSuffix]);

  const handleExportPDF = useCallback(() => {
    try {
      const doc = buildDashboardPDF(shareData);
      doc.save(`tableau-bord-${filenameSuffix}.pdf`);
      toast.success('Export PDF téléchargé');
    } catch {
      toast.error('Erreur lors de l\'export PDF');
    }
  }, [shareData, filenameSuffix]);

  const handleEmailExport = useCallback(() => {
    try {
      if (emailFormat === 'text') {
        const body = buildDashboardText(shareData);
        const subject = `Tableau de bord SNCF — ${shareData.periodLabel} ${shareData.dateRangeLabel}`;
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      } else if (emailFormat === 'html') {
        const html = buildDashboardHTML(shareData);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
        a.download = `tableau-bord-${filenameSuffix}.html`;
        a.click();
        toast.success('Fichier HTML téléchargé — vous pouvez l\'envoyer en pièce jointe');
      } else {
        const doc = buildDashboardPDF(shareData);
        doc.save(`tableau-bord-${filenameSuffix}.pdf`);
        toast.success('Fichier PDF téléchargé — vous pouvez l\'envoyer en pièce jointe');
      }
      setEmailDialogOpen(false);
    } catch {
      toast.error('Erreur lors de l\'export');
    }
  }, [emailFormat, shareData, filenameSuffix]);

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

  const isLoading = controlsLoading;

  return (
    <AppLayout>
      <div className="space-y-5 max-w-5xl">

        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 text-primary" />
                Tableau de bord
              </h1>
              <p className="text-sm text-muted-foreground">
                Bonjour {profile?.first_name} !
              </p>
            </div>
            <div className="flex items-center gap-2">
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

              {/* Bouton Partager */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Share2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Partager</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportHTML}>
                    HTML
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF}>
                    PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEmailDialogOpen(true)}>
                    Email…
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Filtres */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <DashboardDatePicker
                date={selectedDate}
                onDateChange={setSelectedDate}
              />
              <ViewModeToggle
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <PeriodSelector
                selectedPeriod={period}
                onPeriodChange={setPeriod}
                customStart={customStart}
                customEnd={customEnd}
                onCustomStartChange={setCustomStart}
                onCustomEndChange={setCustomEnd}
              />
              {/* Filtre par lieu */}
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                {locationButtons.map(({ value, label, icon: Icon }) => (
                  <Button
                    key={value}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 px-2.5 text-xs font-medium transition-colors gap-1",
                      locationFilter === value
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setLocationFilter(value)}
                  >
                    <Icon className="h-3 w-3" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <PendingControlsPanel />

        {/* Raccourcis */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/onboard"
            className="group relative overflow-hidden rounded-xl bg-primary p-4 shadow-md hover:shadow-lg transition-all hover:scale-[1.01] text-primary-foreground flex flex-col gap-1.5"
          >
            <div className="absolute right-2 top-2 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
              <Train className="h-16 w-16" />
            </div>
            <div className="p-2 rounded-lg bg-white/20 w-fit">
              <Train className="h-4 w-4" />
            </div>
            <span className="font-semibold text-sm mt-1">Contrôle à bord</span>
            <span className="text-xs text-white/60">Nouveau contrôle en train</span>
          </Link>

          <Link
            to="/station"
            className="group relative overflow-hidden rounded-xl border-2 border-primary/15 bg-card p-4 shadow-sm hover:shadow-md transition-all hover:scale-[1.01] flex flex-col gap-1.5"
          >
            <div className="absolute right-2 top-2 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <Building2 className="h-16 w-16 text-primary" />
            </div>
            <div className="p-2 rounded-lg bg-primary/10 w-fit">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold text-sm mt-1">Contrôle en gare</span>
            <span className="text-xs text-muted-foreground">Nouveau contrôle en gare</span>
          </Link>
        </div>

        {/* KPIs principaux */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">
              {viewMode === 'my-data' ? 'Mes contrôles' : 'Tous les contrôles'}
            </h2>
            {locationFilter !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                {locationFilter === 'train' ? 'À bord' : 'En gare'}
              </Badge>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

              {/* Voyageurs */}
              <Card className="border-0 shadow-md overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-xl bg-white/20">
                      <Users className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-medium text-white/60 uppercase tracking-wide">voyageurs</span>
                  </div>
                  <div className="text-3xl font-bold tracking-tight">{stats.totalPassengers}</div>
                  <p className="text-xs text-white/65 mt-1">
                    {stats.controlCount} contrôle{stats.controlCount > 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>

              {/* Taux de fraude */}
              <Card className={cn(
                "border-0 shadow-md overflow-hidden text-white",
                stats.fraudRate >= 10 ? "bg-gradient-to-br from-red-500 to-rose-600" :
                stats.fraudRate >= 5  ? "bg-gradient-to-br from-amber-500 to-orange-500" :
                "bg-gradient-to-br from-emerald-500 to-green-600"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-xl bg-white/20">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-medium text-white/60 uppercase tracking-wide">fraude</span>
                  </div>
                  <div className="text-3xl font-bold tracking-tight">{formatFraudRate(stats.fraudRate)}</div>
                  <p className="text-xs text-white/65 mt-1">
                    {stats.fraudCount} fraude{stats.fraudCount !== 1 ? 's' : ''}
                  </p>
                  <div className="mt-2.5 h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white/50 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(stats.fraudRate * 5, 100)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* En règle */}
              <Card className="border-0 shadow-md overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-xl bg-white/20">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-medium text-white/60 uppercase tracking-wide">en règle</span>
                  </div>
                  <div className="text-3xl font-bold tracking-tight">{stats.passengersInRule}</div>
                  <p className="text-xs text-white/65 mt-1">
                    {stats.totalPassengers > 0
                      ? `${((stats.passengersInRule / stats.totalPassengers) * 100).toFixed(1)}% des voyageurs`
                      : '0%'}
                  </p>
                </CardContent>
              </Card>

              {/* PV */}
              <Card className={cn(
                "border-0 shadow-md overflow-hidden text-white",
                stats.pv > 0 ? "bg-gradient-to-br from-rose-500 to-red-600" : "bg-gradient-to-br from-slate-400 to-slate-500"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-xl bg-white/20">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-medium text-white/60 uppercase tracking-wide">PV</span>
                  </div>
                  <div className="text-3xl font-bold tracking-tight">{stats.pv}</div>
                  <p className="text-xs text-white/65 mt-1">Procès-verbaux</p>
                </CardContent>
              </Card>

            </div>
          )}
        </div>

        {/* Sections détail */}
        {!isLoading && stats.controlCount > 0 && (
          <div className="space-y-2">
            <h2 className="text-base font-semibold">Détails</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">

              {/* Tarifs contrôle */}
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-green-400 to-emerald-500" />
                <CardHeader className="py-3 px-4 pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30">
                      <UserCheck className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    </div>
                    Tarifs contrôle
                    <Badge className="ml-auto bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100 text-xs">
                      {stats.tarifsControle}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-0.5">
                  <StatRow label="STT 50€"     value={detailedStats.tarifsControle.stt50} />
                  <StatRow label="RNV"         value={detailedStats.tarifsControle.rnv} />
                  <StatRow label="Titre tiers" value={detailedStats.tarifsControle.titreTiers} />
                  <StatRow label="D.naissance" value={detailedStats.tarifsControle.docNaissance} />
                  <StatRow label="Autre"       value={detailedStats.tarifsControle.autre} />
                  {stats.tarifsControle === 0 && (
                    <p className="text-xs text-muted-foreground italic px-2">Aucun</p>
                  )}
                </CardContent>
              </Card>

              {/* Procès-verbaux */}
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-red-400 to-rose-500" />
                <CardHeader className="py-3 px-4 pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                    </div>
                    Procès-verbaux
                    <Badge className="ml-auto bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100 text-xs">
                      {stats.pv}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-0.5">
                  <StatRow label="STT 100€"          value={stats.stt100} />
                  <StatRow label="STT autre montant" value={stats.pvStt100} />
                  <StatRow label="RNV"               value={stats.pvRnv} />
                  <StatRow label="Titre tiers"       value={stats.pvTitreTiers} />
                  <StatRow label="D.naissance"       value={stats.pvDocNaissance} />
                  <StatRow label="Autre"             value={stats.pvAutre} />
                  {stats.pv === 0 && (
                    <p className="text-xs text-muted-foreground italic px-2">Aucun</p>
                  )}
                </CardContent>
              </Card>

              {/* Tarifs à bord + RI */}
              <div className="space-y-3">
                <Card className="border-0 shadow-sm overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-blue-400 to-indigo-500" />
                  <CardHeader className="py-3 px-4 pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                        <CreditCard className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      </div>
                      Tarifs à bord
                      <Badge className="ml-auto bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 text-xs">
                        {detailedStats.totalBord}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 space-y-0.5">
                    <StatRow label="Tarif bord"         value={detailedStats.tarifsBord.stt50} />
                    <StatRow label="Tarif exceptionnel" value={detailedStats.tarifsBord.stt100} />
                    <StatRow label="RNV"                value={detailedStats.tarifsBord.rnv} />
                    <StatRow label="Titre tiers"        value={detailedStats.tarifsBord.titreTiers} />
                    <StatRow label="D.naissance"        value={detailedStats.tarifsBord.docNaissance} />
                    <StatRow label="Autre"              value={detailedStats.tarifsBord.autre} />
                    {detailedStats.totalBord === 0 && (
                      <p className="text-xs text-muted-foreground italic px-2">Aucun</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-purple-400 to-violet-500" />
                  <CardHeader className="py-3 px-4 pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                        <IdCard className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                      </div>
                      Relevés d'identité
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 grid grid-cols-2 gap-3">
                    <div className="flex flex-col items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20 py-3">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.riPositive}</div>
                      <div className="text-xs text-green-600/70 dark:text-green-400/70 font-medium mt-0.5">RI+</div>
                    </div>
                    <div className="flex flex-col items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 py-3">
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.riNegative}</div>
                      <div className="text-xs text-red-600/70 dark:text-red-400/70 font-medium mt-0.5">RI−</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

            </div>
          </div>
        )}

        {/* Dialog Email */}
        <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Envoyer par email</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <RadioGroup value={emailFormat} onValueChange={(v) => setEmailFormat(v as EmailFormat)} className="space-y-3">
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="text" id="email-text" />
                  <Label htmlFor="email-text" className="cursor-pointer">
                    <span className="font-medium">Texte brut</span>
                    <span className="block text-xs text-muted-foreground">Ouvre votre client email avec le rapport en texte</span>
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="html" id="email-html" />
                  <Label htmlFor="email-html" className="cursor-pointer">
                    <span className="font-medium">HTML (fichier)</span>
                    <span className="block text-xs text-muted-foreground">Télécharge le rapport HTML à joindre à votre email</span>
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="pdf" id="email-pdf" />
                  <Label htmlFor="email-pdf" className="cursor-pointer">
                    <span className="font-medium">PDF (fichier)</span>
                    <span className="block text-xs text-muted-foreground">Télécharge le rapport PDF à joindre à votre email</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleEmailExport}>
                {emailFormat === 'text' ? 'Ouvrir email' : 'Télécharger'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AppLayout>
  );
}

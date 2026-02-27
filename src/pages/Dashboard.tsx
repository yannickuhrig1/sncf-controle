import { useState, useMemo, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
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
import { calculateStats, formatFraudRate, getFraudRateBgColor, getFraudRateColor } from '@/lib/stats';
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
    <div className="flex justify-between items-center py-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
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
            className={cn(
              buttonVariants({ size: 'lg' }),
              'h-auto py-4 lg:py-3 flex flex-col lg:flex-row gap-2 rounded-xl shadow-md hover:shadow-lg transition-shadow'
            )}
          >
            <Train className="h-6 w-6 lg:h-5 lg:w-5" />
            <span className="font-semibold">Contrôle à bord</span>
          </Link>

          <Link
            to="/station"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'lg' }),
              'h-auto py-4 lg:py-3 flex flex-col lg:flex-row gap-2 rounded-xl border-2 hover:shadow-md transition-shadow'
            )}
          >
            <Building2 className="h-6 w-6 lg:h-5 lg:w-5" />
            <span className="font-semibold">Contrôle en gare</span>
          </Link>
        </div>

        {/* KPIs principaux */}
        <div className="space-y-2">
          <h2 className="text-base font-semibold">
            {viewMode === 'my-data' ? 'Mes contrôles' : 'Tous les contrôles'}
            {locationFilter !== 'all' && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                — {locationFilter === 'train' ? 'À bord' : 'En gare'}
              </span>
            )}
          </h2>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

              {/* Voyageurs */}
              <Card className="border-0 shadow-sm bg-card">
                <CardContent className="p-3 lg:p-4">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                    <div className="p-1 rounded-md bg-blue-100 dark:bg-blue-900/30">
                      <Users className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    </div>
                    Voyageurs
                  </div>
                  <div className="text-2xl font-bold tracking-tight">{stats.totalPassengers}</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {stats.controlCount} contrôle{stats.controlCount > 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>

              {/* Taux de fraude */}
              <Card className={cn("border-0 shadow-sm", getFraudRateBgColor(stats.fraudRate))}>
                <CardContent className="p-3 lg:p-4">
                  <div className={cn("flex items-center gap-1.5 text-xs mb-1.5", getFraudRateColor(stats.fraudRate))}>
                    <div className={cn(
                      "p-1 rounded-md",
                      stats.fraudRate >= 10 ? "bg-red-100 dark:bg-red-900/30" :
                      stats.fraudRate >= 5  ? "bg-yellow-100 dark:bg-yellow-900/30" :
                      "bg-green-100 dark:bg-green-900/30"
                    )}>
                      <AlertTriangle className="h-3 w-3" />
                    </div>
                    Taux de fraude
                  </div>
                  <div className={cn("text-2xl font-bold tracking-tight", getFraudRateColor(stats.fraudRate))}>
                    {formatFraudRate(stats.fraudRate)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {stats.fraudCount} fraude{stats.fraudCount > 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>

              {/* En règle */}
              <Card className="border-0 shadow-sm bg-card">
                <CardContent className="p-3 lg:p-4">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                    <div className="p-1 rounded-md bg-green-100 dark:bg-green-900/30">
                      <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                    </div>
                    En règle
                  </div>
                  <div className="text-2xl font-bold tracking-tight text-green-600 dark:text-green-400">
                    {stats.passengersInRule}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {stats.totalPassengers > 0
                      ? `${((stats.passengersInRule / stats.totalPassengers) * 100).toFixed(1)}%`
                      : '0%'}
                  </p>
                </CardContent>
              </Card>

              {/* PV */}
              <Card className="border-0 shadow-sm bg-card">
                <CardContent className="p-3 lg:p-4">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                    <div className="p-1 rounded-md bg-red-100 dark:bg-red-900/30">
                      <AlertTriangle className="h-3 w-3 text-red-600 dark:text-red-400" />
                    </div>
                    Procès-verbaux
                  </div>
                  <div className="text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">
                    {stats.pv}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">PV</p>
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
              <Card className="border-0 shadow-sm">
                <CardHeader className="py-3 px-4 pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-green-600 dark:text-green-400">
                    <UserCheck className="h-4 w-4" />
                    Tarifs contrôle
                    <span className="ml-auto text-muted-foreground font-normal text-xs">{stats.tarifsControle}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-0.5">
                  <StatRow label="STT 50€"     value={detailedStats.tarifsControle.stt50} />
                  <StatRow label="RNV"         value={detailedStats.tarifsControle.rnv} />
                  <StatRow label="Titre tiers" value={detailedStats.tarifsControle.titreTiers} />
                  <StatRow label="D.naissance" value={detailedStats.tarifsControle.docNaissance} />
                  <StatRow label="Autre"       value={detailedStats.tarifsControle.autre} />
                  {stats.tarifsControle === 0 && (
                    <p className="text-xs text-muted-foreground italic">Aucun</p>
                  )}
                </CardContent>
              </Card>

              {/* Procès-verbaux */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="py-3 px-4 pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                    Procès-verbaux
                    <span className="ml-auto text-muted-foreground font-normal text-xs">{stats.pv}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-0.5">
                  <StatRow label="STT 100€"          value={stats.stt100} />
                  <StatRow label="STT autre montant" value={stats.pvStt100} />
                  <StatRow label="RNV"               value={stats.pvRnv} />
                  <StatRow label="Titre tiers"       value={stats.pvTitreTiers} />
                  <StatRow label="D.naissance"       value={stats.pvDocNaissance} />
                  <StatRow label="Autre"             value={stats.pvAutre} />
                  {stats.pv === 0 && (
                    <p className="text-xs text-muted-foreground italic">Aucun</p>
                  )}
                </CardContent>
              </Card>

              {/* Tarifs à bord + RI */}
              <div className="space-y-3">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="py-3 px-4 pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <CreditCard className="h-4 w-4" />
                      Tarifs à bord / exceptionnel
                      <span className="ml-auto text-muted-foreground font-normal text-xs">{detailedStats.totalBord}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3 space-y-0.5">
                    <StatRow label="Tarif bord"         value={detailedStats.tarifsBord.stt50} />
                    <StatRow label="Tarif exceptionnel" value={detailedStats.tarifsBord.stt100} />
                    <StatRow label="RNV"                value={detailedStats.tarifsBord.rnv} />
                    <StatRow label="Titre tiers"        value={detailedStats.tarifsBord.titreTiers} />
                    <StatRow label="D.naissance"        value={detailedStats.tarifsBord.docNaissance} />
                    <StatRow label="Autre"              value={detailedStats.tarifsBord.autre} />
                    {detailedStats.totalBord === 0 && (
                      <p className="text-xs text-muted-foreground italic">Aucun</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader className="py-3 px-4 pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-purple-600 dark:text-purple-400">
                      <IdCard className="h-4 w-4" />
                      Relevés d'identité
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3 flex gap-6">
                    <div className="text-center flex-1">
                      <div className="text-xl font-bold text-green-600">{stats.riPositive}</div>
                      <div className="text-xs text-muted-foreground">RI+</div>
                    </div>
                    <div className="text-center flex-1">
                      <div className="text-xl font-bold text-red-600">{stats.riNegative}</div>
                      <div className="text-xs text-muted-foreground">RI−</div>
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

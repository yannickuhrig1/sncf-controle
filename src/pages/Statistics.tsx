import { useState, useMemo, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useControlsWithFilter, ViewMode, Period } from '@/hooks/useControlsWithFilter';
import { AppLayout } from '@/components/layout/AppLayout';
import { FraudRateChart } from '@/components/charts/FraudRateChart';
import { FraudTrendChart } from '@/components/charts/FraudTrendChart';
import { PassengersChart } from '@/components/charts/PassengersChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { calculateStats, formatFraudRate, getFraudRateColor } from '@/lib/stats';
import { buildStatsText, buildStatsHTML, buildStatsPDF } from '@/lib/statsExport';
import type { StatsShareData, WeeklyTrendPoint } from '@/lib/statsExport';
import { format, parseISO, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import { ViewModeToggle } from '@/components/dashboard/ViewModeToggle';
import { DashboardDatePicker } from '@/components/dashboard/DashboardDatePicker';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CreditCard,
  IdCard,
  Loader2,
  Share2,
  UserCheck,
  Users,
} from 'lucide-react';

// ── StatRow ───────────────────────────────────────────────────────────────────

function StatRow({ label, value }: { label: string; value: number }) {
  if (value === 0) return null;
  return (
    <div className="flex justify-between items-center px-2 py-1 rounded-md hover:bg-muted/50 transition-colors">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-bold bg-muted px-1.5 py-0.5 rounded-md min-w-[1.5rem] text-center">{value}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const periodLabels: Record<Period, string> = {
  day: 'Jour', week: 'Semaine', month: 'Mois', year: 'Année', custom: 'Personnalisée',
};

export default function StatisticsPage() {
  const { user, loading: authLoading } = useAuth();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode]         = useState<ViewMode>('all-data');
  const [period, setPeriod]             = useState<Period>('week');
  const [customStart, setCustomStart]   = useState('');
  const [customEnd, setCustomEnd]       = useState('');

  const { controls, isLoading, startDate, endDate } = useControlsWithFilter({
    date: selectedDate,
    viewMode,
    period,
    customStart: period === 'custom' ? customStart : null,
    customEnd:   period === 'custom' ? customEnd   : null,
  });

  const stats = useMemo(() => calculateStats(controls), [controls]);

  const detailedStats = useMemo(() => {
    const tarifsControle = controls.reduce((acc, c) => ({
      stt50:        acc.stt50        + c.stt_50,
      rnv:          acc.rnv          + c.rnv,
      titreTiers:   acc.titreTiers   + (c.titre_tiers   || 0),
      docNaissance: acc.docNaissance + (c.doc_naissance  || 0),
      autre:        acc.autre        + (c.autre_tarif    || 0),
    }), { stt50: 0, rnv: 0, titreTiers: 0, docNaissance: 0, autre: 0 });

    const tarifsBord = controls.reduce((acc, c) => ({
      stt50:        acc.stt50        + (c.tarif_bord_stt_50        || 0),
      stt100:       acc.stt100       + (c.tarif_bord_stt_100       || 0),
      rnv:          acc.rnv          + (c.tarif_bord_rnv           || 0),
      titreTiers:   acc.titreTiers   + (c.tarif_bord_titre_tiers   || 0),
      docNaissance: acc.docNaissance + (c.tarif_bord_doc_naissance || 0),
      autre:        acc.autre        + (c.tarif_bord_autre         || 0),
    }), { stt50: 0, stt100: 0, rnv: 0, titreTiers: 0, docNaissance: 0, autre: 0 });

    const totalBord = tarifsBord.stt50 + tarifsBord.stt100 + tarifsBord.rnv
      + tarifsBord.titreTiers + tarifsBord.docNaissance + tarifsBord.autre;

    return { tarifsControle, tarifsBord, totalBord };
  }, [controls]);

  const trendData = useMemo((): WeeklyTrendPoint[] => {
    const map = new Map<string, WeeklyTrendPoint>();
    controls.forEach(c => {
      const date = parseISO(c.control_date);
      const ws = startOfWeek(date, { weekStartsOn: 1 });
      const key = format(ws, 'yyyy-MM-dd');
      const label = `S${format(ws, 'w')} ${format(ws, 'dd/MM', { locale: fr })}`;
      const fraud = c.tarifs_controle + c.pv;
      const ex = map.get(key);
      if (ex) {
        ex.passengers += c.nb_passagers;
        ex.fraudCount += fraud;
      } else {
        map.set(key, { label, fraudRate: 0, passengers: c.nb_passagers, fraudCount: fraud });
      }
    });
    map.forEach(d => { d.fraudRate = d.passengers > 0 ? (d.fraudCount / d.passengers) * 100 : 0; });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label)).slice(-16);
  }, [controls]);

  const shareData: StatsShareData = useMemo(() => ({
    stats,
    detailedStats,
    trendData,
    periodLabel:    periodLabels[period],
    dateRangeLabel: (() => {
      const fmt = (iso: string) => iso ? iso.split('-').reverse().join('-') : iso;
      return startDate === endDate ? fmt(startDate) : `${fmt(startDate)} → ${fmt(endDate)}`;
    })(),
    pageTitle:      'Statistiques Contrôles',
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [stats, detailedStats, trendData, period, startDate, endDate]);

  const filenameSuffix = startDate === endDate ? startDate : `${startDate}-${endDate}`;

  const handleExportHTML = useCallback(() => {
    try {
      const html = buildStatsHTML(shareData);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      a.download = `statistiques-${filenameSuffix}.html`;
      a.click();
      toast.success('Export HTML téléchargé');
    } catch {
      toast.error("Erreur lors de l'export HTML");
    }
  }, [shareData, filenameSuffix]);

  const handleExportPDF = useCallback(() => {
    try {
      const doc = buildStatsPDF(shareData);
      doc.save(`statistiques-${filenameSuffix}.pdf`);
      toast.success('Export PDF téléchargé');
    } catch {
      toast.error("Erreur lors de l'export PDF");
    }
  }, [shareData, filenameSuffix]);

  const handleExportText = useCallback(() => {
    try {
      const body = buildStatsText(shareData);
      const subject = `Statistiques SNCF — ${shareData.periodLabel} ${shareData.dateRangeLabel}`;
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } catch {
      toast.error("Erreur lors de l'export texte");
    }
  }, [shareData]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <AppLayout>
      <div className="space-y-5 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Statistiques
            </h1>
            <p className="text-sm text-muted-foreground">
              Analysez l'évolution de vos contrôles
            </p>
          </div>

          {/* Bouton export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Exporter</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportHTML}>HTML</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}>PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportText}>Email (texte)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Filtres */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <DashboardDatePicker date={selectedDate} onDateChange={setSelectedDate} />
            <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          </div>
          <PeriodSelector
            selectedPeriod={period}
            onPeriodChange={setPeriod}
            customStart={customStart}
            customEnd={customEnd}
            onCustomStartChange={setCustomStart}
            onCustomEndChange={setCustomEnd}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

              <Card className="border-0 shadow-md overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-xl bg-white/20"><Users className="h-4 w-4" /></div>
                    <span className="text-[10px] font-medium text-white/60 uppercase tracking-wide">voyageurs</span>
                  </div>
                  <div className="text-3xl font-bold tracking-tight">{stats.totalPassengers}</div>
                  <p className="text-xs text-white/65 mt-1">
                    {stats.controlCount} contrôle{stats.controlCount > 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>

              <Card className={cn(
                "border-0 shadow-md overflow-hidden text-white",
                stats.fraudRate >= 10 ? "bg-gradient-to-br from-red-500 to-rose-600"
                  : stats.fraudRate >= 5  ? "bg-gradient-to-br from-amber-500 to-orange-500"
                  : "bg-gradient-to-br from-emerald-500 to-green-600"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-xl bg-white/20"><AlertTriangle className="h-4 w-4" /></div>
                    <span className="text-[10px] font-medium text-white/60 uppercase tracking-wide">fraude</span>
                  </div>
                  <div className="text-3xl font-bold tracking-tight">{formatFraudRate(stats.fraudRate)}</div>
                  <p className="text-xs text-white/65 mt-1">
                    {stats.fraudCount} fraude{stats.fraudCount !== 1 ? 's' : ''}
                  </p>
                  <div className="mt-2.5 h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white/50 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(stats.fraudRate * 5, 100)}%` }} />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-xl bg-white/20"><CheckCircle2 className="h-4 w-4" /></div>
                    <span className="text-[10px] font-medium text-white/60 uppercase tracking-wide">en règle</span>
                  </div>
                  <div className="text-3xl font-bold tracking-tight">{stats.passengersInRule}</div>
                  <p className="text-xs text-white/65 mt-1">
                    {stats.totalPassengers > 0
                      ? `${((stats.passengersInRule / stats.totalPassengers) * 100).toFixed(1)}%`
                      : '0%'}
                  </p>
                </CardContent>
              </Card>

              <Card className={cn(
                "border-0 shadow-md overflow-hidden text-white",
                stats.pv > 0
                  ? "bg-gradient-to-br from-rose-500 to-red-600"
                  : "bg-gradient-to-br from-slate-400 to-slate-500"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-xl bg-white/20"><AlertTriangle className="h-4 w-4" /></div>
                    <span className="text-[10px] font-medium text-white/60 uppercase tracking-wide">PV</span>
                  </div>
                  <div className="text-3xl font-bold tracking-tight">{stats.pv}</div>
                  <p className="text-xs text-white/65 mt-1">Procès-verbaux</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <FraudTrendChart controls={controls} />
            <FraudRateChart controls={controls} />
            <PassengersChart controls={controls} />

            {/* Détails (si données présentes) */}
            {stats.controlCount > 0 && (
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

                  {/* Procès-verbaux + répartition */}
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

                  {/* Tarifs bord + RI */}
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

            {/* Répartition PV (camembert) */}
            {stats.pv > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Répartition des PV</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const pvData = [
                      { name: 'STT 100€',    value: stats.stt100,        color: '#dc2626' },
                      { name: 'STT autre',   value: stats.pvStt100,      color: '#ef4444' },
                      { name: 'RNV',         value: stats.pvRnv,         color: '#f97316' },
                      { name: 'T.Tiers',     value: stats.pvTitreTiers,  color: '#eab308' },
                      { name: 'D.Naiss',     value: stats.pvDocNaissance,color: '#8b5cf6' },
                      { name: 'Autre',       value: stats.pvAutre,       color: '#6b7280' },
                    ].filter(d => d.value > 0);
                    return (
                      <div className="space-y-4">
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie data={pvData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                              paddingAngle={3} dataKey="value">
                              {pvData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Pie>
                            <Tooltip
                              formatter={(value: number, name: string) => [
                                `${value} (${((value / stats.pv) * 100).toFixed(1)}%)`, name,
                              ]}
                            />
                            <Legend formatter={(value, entry: unknown) => {
                              const e = entry as { payload: { value: number } };
                              return `${value} — ${e.payload.value}`;
                            }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                          {[
                            { label: 'STT 100 €',    value: stats.stt100,        color: 'bg-red-700' },
                            { label: 'STT autre',    value: stats.pvStt100,      color: 'bg-red-500' },
                            { label: 'RNV',          value: stats.pvRnv,         color: 'bg-orange-500' },
                            { label: 'Titre tiers',  value: stats.pvTitreTiers,  color: 'bg-yellow-500' },
                            { label: 'D. naissance', value: stats.pvDocNaissance,color: 'bg-violet-500' },
                            { label: 'Autre',        value: stats.pvAutre,       color: 'bg-gray-500' },
                          ].map(({ label, value, color }) => (
                            <div key={label} className="flex items-center justify-between text-sm">
                              <span className="flex items-center gap-2 text-muted-foreground">
                                <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
                                {label}
                              </span>
                              <span className="font-semibold tabular-nums">
                                {value}
                                <span className="text-xs text-muted-foreground ml-1">
                                  ({((value / stats.pv) * 100).toFixed(0)}%)
                                </span>
                              </span>
                            </div>
                          ))}
                          <div className="col-span-2 border-t pt-2 flex items-center justify-between text-sm font-semibold">
                            <span>Total PV</span>
                            <span>{stats.pv}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Aucune donnée */}
            {stats.controlCount === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <BarChart3 className="h-10 w-10 opacity-30" />
                <p className="text-sm">Aucun contrôle sur cette période</p>
                <p className="text-xs opacity-60">
                  {getFraudRateColor && 'Changez la période ou le mode de vue pour afficher des données'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

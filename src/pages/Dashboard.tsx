import { useState, useMemo, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
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
  Train,
  UserCheck,
  Users,
} from 'lucide-react';

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

export default function Dashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('my-data');
  const [period, setPeriod] = useState<Period>('day');

  const { controls, isLoading: controlsLoading, isFetching, refetch } = useControlsWithFilter({
    date: selectedDate,
    viewMode,
    period,
  });

  const { formattedLastSync, updateLastSync } = useLastSync();
  const { isOnline, pendingCount, isSyncing } = useOfflineSync();

  const handleSync = useCallback(async () => {
    await refetch();
    updateLastSync();
    toast.success('Données synchronisées');
  }, [refetch, updateLastSync]);

  const stats = useMemo(() => calculateStats(controls), [controls]);

  // Calculs détaillés non présents dans calculateStats
  const detailedStats = useMemo(() => {
    const tarifsControle = controls.reduce((acc, c) => ({
      stt50:       acc.stt50        + c.stt_50,
      stt100:      acc.stt100       + c.stt_100,
      rnv:         acc.rnv          + c.rnv,
      titreTiers:  acc.titreTiers   + (c.titre_tiers   || 0),
      docNaissance:acc.docNaissance + (c.doc_naissance  || 0),
      autre:       acc.autre        + (c.autre_tarif    || 0),
    }), { stt50: 0, stt100: 0, rnv: 0, titreTiers: 0, docNaissance: 0, autre: 0 });

    const tarifsBord = controls.reduce((acc, c) => ({
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
  }, [controls, stats]);

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
            <div className="flex justify-center">
              <PeriodSelector
                selectedPeriod={period}
                onPeriodChange={setPeriod}
              />
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
                  <StatRow label="STT 100€"    value={stats.stt100} />
                  <StatRow label="STT autre montant" value={stats.pvStt100} />
                  <StatRow label="RNV"         value={stats.pvRnv} />
                  <StatRow label="Titre tiers" value={stats.pvTitreTiers} />
                  <StatRow label="D.naissance" value={stats.pvDocNaissance} />
                  <StatRow label="Autre"       value={stats.pvAutre} />
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
                    <StatRow label="Tarif bord"        value={detailedStats.tarifsBord.stt50} />
                    <StatRow label="Tarif exceptionnel" value={detailedStats.tarifsBord.stt100} />
                    <StatRow label="RNV"         value={detailedStats.tarifsBord.rnv} />
                    <StatRow label="Titre tiers" value={detailedStats.tarifsBord.titreTiers} />
                    <StatRow label="D.naissance" value={detailedStats.tarifsBord.docNaissance} />
                    <StatRow label="Autre"       value={detailedStats.tarifsBord.autre} />
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
      </div>
    </AppLayout>
  );
}

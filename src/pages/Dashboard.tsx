import { useState, useMemo, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useControlsWithFilter, ViewMode } from '@/hooks/useControlsWithFilter';
import { useLastSync } from '@/hooks/useLastSync';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { LastSyncIndicator } from '@/components/controls/LastSyncIndicator';
import { OfflineIndicator } from '@/components/controls/OfflineIndicator';
import { PendingControlsPanel } from '@/components/controls/PendingControlsPanel';
import { DashboardDatePicker } from '@/components/dashboard/DashboardDatePicker';
import { ViewModeToggle } from '@/components/dashboard/ViewModeToggle';
import { calculateStats, formatFraudRate, getFraudRateBgColor, getFraudRateColor } from '@/lib/stats';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  LayoutDashboard,
  Loader2,
  Train,
  Users,
} from 'lucide-react';

export default function Dashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('my-data');
  
  const { controls, isLoading: controlsLoading, isFetching, refetch } = useControlsWithFilter({
    date: selectedDate,
    viewMode,
  });
  
  const { formattedLastSync, updateLastSync } = useLastSync();
  const { isOnline, pendingCount, isSyncing } = useOfflineSync();

  // Handle sync
  const handleSync = useCallback(async () => {
    await refetch();
    updateLastSync();
    toast.success('Données synchronisées');
  }, [refetch, updateLastSync]);

  const stats = useMemo(() => calculateStats(controls), [controls]);

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <LayoutDashboard className="h-6 w-6 text-primary" />
                Tableau de bord
              </h1>
              <p className="text-muted-foreground">
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

          {/* Date picker and view mode toggle */}
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
        </div>

        {/* Pending Controls Panel */}
        <PendingControlsPanel />

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            to="/onboard"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'h-auto py-4 flex flex-col gap-2'
            )}
          >
            <Train className="h-6 w-6" />
            <span>Contrôle à bord</span>
          </Link>

          <Link
            to="/station"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'lg' }),
              'h-auto py-4 flex flex-col gap-2'
            )}
          >
            <Building2 className="h-6 w-6" />
            <span>Contrôle en gare</span>
          </Link>
        </div>

        {/* Stats */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">
            {viewMode === 'my-data' ? 'Mes contrôles' : 'Tous les contrôles'}
          </h2>
          
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Voyageurs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalPassengers}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.controlCount} contrôle{stats.controlCount > 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>

              <Card className={getFraudRateBgColor(stats.fraudRate)}>
                <CardHeader className="pb-2">
                  <CardTitle className={`text-sm font-medium flex items-center gap-2 ${getFraudRateColor(stats.fraudRate)}`}>
                    <AlertTriangle className="h-4 w-4" />
                    Taux de fraude
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getFraudRateColor(stats.fraudRate)}`}>
                    {formatFraudRate(stats.fraudRate)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.fraudCount} fraude{stats.fraudCount > 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    En règle
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.passengersInRule}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalPassengers > 0 
                      ? `${((stats.passengersInRule / stats.totalPassengers) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    PV
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{stats.pv}</div>
                  <p className="text-xs text-muted-foreground">
                    Procès verbaux
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Fraud Details */}
        {!isLoading && stats.controlCount > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Détails fraudes</h2>
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold">{stats.tarifsControle}</div>
                    <div className="text-xs text-muted-foreground">Tarifs contrôle</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{stats.stt50}</div>
                    <div className="text-xs text-muted-foreground">STT 50€</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{stats.stt100}</div>
                    <div className="text-xs text-muted-foreground">STT 100€</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{stats.rnv}</div>
                    <div className="text-xs text-muted-foreground">RNV</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{stats.riPositive}</div>
                    <div className="text-xs text-muted-foreground">RI+</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{stats.riNegative}</div>
                    <div className="text-xs text-muted-foreground">RI-</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

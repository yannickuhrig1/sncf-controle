import { Link, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useControls } from '@/hooks/useControls';
import { calculateStats, formatFraudRate, getFraudRateBgColor, getFraudRateColor } from '@/lib/stats';
import { cn } from '@/lib/utils';
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
  const { todayControls, controls, isLoading: controlsLoading } = useControls();

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

  const todayStats = calculateStats(todayControls);
  const allTimeStats = calculateStats(controls);

  const isLoading = controlsLoading;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-primary" />
            Tableau de bord
          </h1>
          <p className="text-muted-foreground">
            Bonjour {profile?.first_name} ! Voici le résumé de vos contrôles.
          </p>
        </div>

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

        {/* Today's Stats */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Aujourd'hui</h2>
          
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
                  <div className="text-2xl font-bold">{todayStats.totalPassengers}</div>
                  <p className="text-xs text-muted-foreground">
                    {todayStats.controlCount} contrôle{todayStats.controlCount > 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>

              <Card className={getFraudRateBgColor(todayStats.fraudRate)}>
                <CardHeader className="pb-2">
                  <CardTitle className={`text-sm font-medium flex items-center gap-2 ${getFraudRateColor(todayStats.fraudRate)}`}>
                    <AlertTriangle className="h-4 w-4" />
                    Taux de fraude
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getFraudRateColor(todayStats.fraudRate)}`}>
                    {formatFraudRate(todayStats.fraudRate)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {todayStats.fraudCount} fraude{todayStats.fraudCount > 1 ? 's' : ''}
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
                  <div className="text-2xl font-bold text-green-600">{todayStats.passengersInRule}</div>
                  <p className="text-xs text-muted-foreground">
                    {todayStats.totalPassengers > 0 
                      ? `${((todayStats.passengersInRule / todayStats.totalPassengers) * 100).toFixed(1)}%`
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
                  <div className="text-2xl font-bold text-red-600">{todayStats.pv}</div>
                  <p className="text-xs text-muted-foreground">
                    Procès verbaux
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Fraud Details */}
        {!isLoading && todayStats.controlCount > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Détails fraudes</h2>
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold">{todayStats.tarifsControle}</div>
                    <div className="text-xs text-muted-foreground">Tarifs contrôle</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{todayStats.stt50}</div>
                    <div className="text-xs text-muted-foreground">STT 50%</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{todayStats.stt100}</div>
                    <div className="text-xs text-muted-foreground">STT 100%</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{todayStats.rnv}</div>
                    <div className="text-xs text-muted-foreground">RNV</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{todayStats.riPositive}</div>
                    <div className="text-xs text-muted-foreground">RI+</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{todayStats.riNegative}</div>
                    <div className="text-xs text-muted-foreground">RI-</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* All Time Stats Summary */}
        {!isLoading && controls.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Statistiques globales</h2>
            <Card>
              <CardContent className="pt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-2xl font-bold">{allTimeStats.totalPassengers}</div>
                    <div className="text-sm text-muted-foreground">Voyageurs contrôlés</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getFraudRateColor(allTimeStats.fraudRate)}`}>
                      {formatFraudRate(allTimeStats.fraudRate)}
                    </div>
                    <div className="text-sm text-muted-foreground">Taux de fraude global</div>
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

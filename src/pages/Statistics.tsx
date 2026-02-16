import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useControls } from '@/hooks/useControls';
import { AppLayout } from '@/components/layout/AppLayout';
import { FraudRateChart } from '@/components/charts/FraudRateChart';
import { FraudTrendChart } from '@/components/charts/FraudTrendChart';
import { PassengersChart } from '@/components/charts/PassengersChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { calculateStats, formatFraudRate, getFraudRateColor } from '@/lib/stats';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  Loader2, 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users,
  AlertTriangle,
} from 'lucide-react';

export default function StatisticsPage() {
  const { user, loading: authLoading } = useAuth();
  const { controls, isLoading } = useControls();

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

  const stats = calculateStats(controls);
  
  // Calculate week over week change
  const now = new Date();
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const thisWeekControls = controls.filter(c => {
    const date = new Date(c.control_date);
    return date >= oneWeekAgo && date <= now;
  });

  const lastWeekControls = controls.filter(c => {
    const date = new Date(c.control_date);
    return date >= twoWeeksAgo && date < oneWeekAgo;
  });

  const thisWeekStats = calculateStats(thisWeekControls);
  const lastWeekStats = calculateStats(lastWeekControls);

  const fraudRateChange = lastWeekStats.fraudRate > 0 
    ? ((thisWeekStats.fraudRate - lastWeekStats.fraudRate) / lastWeekStats.fraudRate) * 100
    : 0;

  const passengersChange = lastWeekStats.totalPassengers > 0
    ? ((thisWeekStats.totalPassengers - lastWeekStats.totalPassengers) / lastWeekStats.totalPassengers) * 100
    : 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Statistiques
          </h1>
          <p className="text-muted-foreground">
            Analysez l'évolution de vos contrôles
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Cette semaine
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{thisWeekStats.totalPassengers}</div>
                  <div className="flex items-center gap-1 text-xs">
                    {passengersChange > 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    ) : passengersChange < 0 ? (
                      <TrendingDown className="h-3 w-3 text-red-600" />
                    ) : null}
                    <span className={passengersChange > 0 ? 'text-green-600' : passengersChange < 0 ? 'text-red-600' : 'text-muted-foreground'}>
                      {passengersChange > 0 ? '+' : ''}{passengersChange.toFixed(1)}%
                    </span>
                    <span className="text-muted-foreground">vs semaine dernière</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Taux fraude
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getFraudRateColor(thisWeekStats.fraudRate)}`}>
                    {formatFraudRate(thisWeekStats.fraudRate)}
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    {fraudRateChange < 0 ? (
                      <TrendingDown className="h-3 w-3 text-green-600" />
                    ) : fraudRateChange > 0 ? (
                      <TrendingUp className="h-3 w-3 text-red-600" />
                    ) : null}
                    <span className={fraudRateChange < 0 ? 'text-green-600' : fraudRateChange > 0 ? 'text-red-600' : 'text-muted-foreground'}>
                      {fraudRateChange > 0 ? '+' : ''}{fraudRateChange.toFixed(1)}%
                    </span>
                    <span className="text-muted-foreground">vs semaine dernière</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Global stats */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Résumé global</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold">{stats.totalPassengers}</div>
                    <div className="text-xs text-muted-foreground">Voyageurs</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-green-600">{stats.passengersInRule}</div>
                    <div className="text-xs text-muted-foreground">En règle</div>
                  </div>
                  <div>
                    <div className={`text-lg font-semibold ${getFraudRateColor(stats.fraudRate)}`}>
                      {formatFraudRate(stats.fraudRate)}
                    </div>
                    <div className="text-xs text-muted-foreground">Fraude</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Charts */}
            <FraudTrendChart controls={controls} />
            <FraudRateChart controls={controls} />
            <PassengersChart controls={controls} />

            {/* Fraud breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Répartition des PV</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.pv === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Aucun PV enregistré</p>
                ) : (() => {
                  const pvData = [
                    { name: 'STT100', value: stats.pvStt100, color: '#ef4444' },
                    { name: 'RNV',    value: stats.pvRnv,    color: '#f97316' },
                    { name: 'T.Tiers',value: stats.pvTitreTiers, color: '#eab308' },
                    { name: 'D.Naiss',value: stats.pvDocNaissance, color: '#8b5cf6' },
                    { name: 'Autre',  value: stats.pvAutre,  color: '#6b7280' },
                  ].filter(d => d.value > 0);

                  return (
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={pvData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {pvData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number, name: string) => [
                              `${value} (${((value / stats.pv) * 100).toFixed(1)}%)`,
                              name,
                            ]}
                          />
                          <Legend
                            formatter={(value, entry: any) =>
                              `${value} — ${entry.payload.value}`
                            }
                          />
                        </PieChart>
                      </ResponsiveContainer>

                      {/* Breakdown list */}
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                        {[
                          { label: 'STT 100 €', value: stats.pvStt100, color: 'bg-red-500' },
                          { label: 'RNV',       value: stats.pvRnv,    color: 'bg-orange-500' },
                          { label: 'Titre tiers', value: stats.pvTitreTiers, color: 'bg-yellow-500' },
                          { label: 'D. naissance', value: stats.pvDocNaissance, color: 'bg-violet-500' },
                          { label: 'Autre',     value: stats.pvAutre,  color: 'bg-gray-500' },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 text-muted-foreground">
                              <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
                              {label}
                            </span>
                            <span className="font-semibold tabular-nums">
                              {value}
                              {stats.pv > 0 && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  ({((value / stats.pv) * 100).toFixed(0)}%)
                                </span>
                              )}
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

            {/* Tarifs & RI breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Détail des infractions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Tarifs contrôle</span>
                      <span className="font-semibold">{stats.tarifsControle}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">STT 50 €</span>
                      <span className="font-semibold">{stats.stt50}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">STT 100 €</span>
                      <span className="font-semibold">{stats.stt100}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">RNV</span>
                      <span className="font-semibold">{stats.rnv}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">RI+</span>
                      <span className="font-semibold text-green-600">{stats.riPositive}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">RI−</span>
                      <span className="font-semibold text-red-600">{stats.riNegative}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}

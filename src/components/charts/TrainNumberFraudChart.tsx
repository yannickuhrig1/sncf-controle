import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Database } from '@/integrations/supabase/types';

type Control = Database['public']['Tables']['controls']['Row'];

interface TrainNumberFraudChartProps {
  controls: Control[];
}

interface TrainStat {
  trainNumber: string;
  fraudRate: number;
  fraudCount: number;
  passengers: number;
  controlCount: number;
}

function getBarColor(fraudRate: number) {
  if (fraudRate >= 10) return '#ef4444'; // red
  if (fraudRate >= 5)  return '#f59e0b'; // amber
  return '#22c55e';                       // green
}

export function TrainNumberFraudChart({ controls }: TrainNumberFraudChartProps) {
  const chartData = useMemo((): TrainStat[] => {
    const map = new Map<string, { passengers: number; fraud: number; count: number }>();

    controls.forEach((c) => {
      if (!c.train_number?.trim()) return;
      const key = c.train_number.trim().toUpperCase();
      const fraud = c.tarifs_controle + c.pv + (c.ri_negative || 0);
      const ex = map.get(key);
      if (ex) {
        ex.passengers += c.nb_passagers;
        ex.fraud      += fraud;
        ex.count      += 1;
      } else {
        map.set(key, { passengers: c.nb_passagers, fraud, count: 1 });
      }
    });

    return Array.from(map.entries())
      .map(([trainNumber, { passengers, fraud, count }]): TrainStat => ({
        trainNumber,
        fraudRate:    passengers > 0 ? (fraud / passengers) * 100 : 0,
        fraudCount:   fraud,
        passengers,
        controlCount: count,
      }))
      .sort((a, b) => b.fraudRate - a.fraudRate)
      .slice(0, 15);
  }, [controls]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fraude par numéro de train</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            Aucun contrôle avec numéro de train
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartHeight = Math.max(200, chartData.length * 36);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Fraude par numéro de train</CardTitle>
        <p className="text-xs text-muted-foreground">Top {chartData.length} trains — taux de fraude (%)</p>
      </CardHeader>
      <CardContent>
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--chart-grid))" />
              <XAxis
                type="number"
                tickFormatter={(v) => `${v.toFixed(0)}%`}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                stroke="hsl(var(--border))"
              />
              <YAxis
                type="category"
                dataKey="trainNumber"
                width={56}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                stroke="hsl(var(--border))"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--chart-tooltip-bg))',
                  border: '1px solid hsl(var(--chart-tooltip-border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px hsl(0 0% 0% / 0.15)',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, marginBottom: 4 }}
                formatter={(_value, _name, props) => {
                  const d = props.payload as TrainStat;
                  return [
                    <>
                      <div>Taux : {d.fraudRate.toFixed(2)}%</div>
                      <div>Fraudes : {d.fraudCount}</div>
                      <div>Voyageurs : {d.passengers}</div>
                      <div>Contrôles : {d.controlCount}</div>
                    </>,
                    '',
                  ];
                }}
              />
              <Bar dataKey="fraudRate" radius={[0, 4, 4, 0]} maxBarSize={28}>
                {chartData.map((entry) => (
                  <Cell key={entry.trainNumber} fill={getBarColor(entry.fraudRate)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 justify-end text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" /> &lt; 5%</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" /> 5–10%</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" /> ≥ 10%</span>
        </div>
      </CardContent>
    </Card>
  );
}

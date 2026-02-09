import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { format, parseISO, startOfWeek, startOfMonth, endOfWeek, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';

type Control = Database['public']['Tables']['controls']['Row'];

type Period = 'week' | 'month';

interface FraudTrendChartProps {
  controls: Control[];
}

interface PeriodStats {
  key: string;
  label: string;
  totalPassengers: number;
  fraudCount: number;
  fraudRate: number;
  controlCount: number;
}

export function FraudTrendChart({ controls }: FraudTrendChartProps) {
  const [period, setPeriod] = useState<Period>('week');

  const chartData = useMemo(() => {
    const periodMap = new Map<string, PeriodStats>();

    controls.forEach((control) => {
      const date = parseISO(control.control_date);
      let key: string;
      let label: string;

      if (period === 'week') {
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        key = format(weekStart, 'yyyy-MM-dd');
        label = `S${format(weekStart, 'w')} ${format(weekStart, 'dd/MM', { locale: fr })}`;
      } else {
        const monthStart = startOfMonth(date);
        key = format(monthStart, 'yyyy-MM');
        label = format(monthStart, 'MMM yyyy', { locale: fr });
      }

      const fraudCount = control.tarifs_controle + control.pv;
      const existing = periodMap.get(key);

      if (existing) {
        existing.totalPassengers += control.nb_passagers;
        existing.fraudCount += fraudCount;
        existing.controlCount += 1;
      } else {
        periodMap.set(key, {
          key,
          label,
          totalPassengers: control.nb_passagers,
          fraudCount,
          fraudRate: 0,
          controlCount: 1,
        });
      }
    });

    periodMap.forEach((stats) => {
      stats.fraudRate = stats.totalPassengers > 0
        ? (stats.fraudCount / stats.totalPassengers) * 100
        : 0;
    });

    return Array.from(periodMap.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-12);
  }, [controls, period]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tendance du taux de fraude</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Aucune donnée disponible
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Tendance du taux de fraude</CardTitle>
          <ToggleGroup
            type="single"
            value={period}
            onValueChange={(v) => v && setPeriod(v as Period)}
            className="border rounded-md"
          >
            <ToggleGroupItem value="week" size="sm" className="text-xs px-3">
              Semaine
            </ToggleGroupItem>
            <ToggleGroupItem value="month" size="sm" className="text-xs px-3">
              Mois
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                angle={-30}
                textAnchor="end"
                height={50}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number, name: string) => {
                  if (name === 'Taux de fraude') return [`${value.toFixed(2)}%`, name];
                  return [value, name];
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="fraudRate"
                name="Taux de fraude"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Volume bar chart below */}
        <div className="h-[150px] mt-4">
          <p className="text-xs text-muted-foreground mb-2">Volume de contrôles</p>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                className="fill-muted-foreground"
                angle={-30}
                textAnchor="end"
                height={40}
              />
              <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="totalPassengers" name="Voyageurs" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.7} />
              <Bar dataKey="fraudCount" name="Fraudes" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

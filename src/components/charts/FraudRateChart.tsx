import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';

type Control = Database['public']['Tables']['controls']['Row'];

interface FraudRateChartProps {
  controls: Control[];
  title?: string;
}

interface DailyStats {
  date: string;
  displayDate: string;
  totalPassengers: number;
  fraudCount: number;
  fraudRate: number;
  controlCount: number;
}

export function FraudRateChart({ controls, title = "Évolution du taux de fraude" }: FraudRateChartProps) {
  const chartData = useMemo(() => {
    // Group controls by date
    const dailyMap = new Map<string, DailyStats>();

    controls.forEach((control) => {
      const date = control.control_date;
      const existing = dailyMap.get(date);

      const fraudCount = control.tarifs_controle + control.pv;

      if (existing) {
        existing.totalPassengers += control.nb_passagers;
        existing.fraudCount += fraudCount;
        existing.controlCount += 1;
      } else {
        dailyMap.set(date, {
          date,
          displayDate: format(parseISO(date), 'dd/MM', { locale: fr }),
          totalPassengers: control.nb_passagers,
          fraudCount: fraudCount,
          fraudRate: 0,
          controlCount: 1,
        });
      }
    });

    // Calculate fraud rate for each day
    dailyMap.forEach((stats) => {
      stats.fraudRate = stats.totalPassengers > 0
        ? (stats.fraudCount / stats.totalPassengers) * 100
        : 0;
    });

    // Sort by date and return array
    return Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14); // Last 14 days
  }, [controls]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
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
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="displayDate" 
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
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
                formatter={(value: number) => [`${value.toFixed(2)}%`, 'Taux de fraude']}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="fraudRate"
                name="Taux de fraude"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

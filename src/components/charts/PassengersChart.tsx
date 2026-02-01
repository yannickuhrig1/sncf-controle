import { useMemo } from 'react';
import {
  BarChart,
  Bar,
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

interface PassengersChartProps {
  controls: Control[];
  title?: string;
}

interface DailyStats {
  date: string;
  displayDate: string;
  totalPassengers: number;
  inRule: number;
  fraud: number;
}

export function PassengersChart({ controls, title = "Voyageurs par jour" }: PassengersChartProps) {
  const chartData = useMemo(() => {
    const dailyMap = new Map<string, DailyStats>();

    controls.forEach((control) => {
      const date = control.control_date;
      const existing = dailyMap.get(date);
      const fraudCount = control.tarifs_controle + control.pv;

      if (existing) {
        existing.totalPassengers += control.nb_passagers;
        existing.inRule += control.nb_en_regle;
        existing.fraud += fraudCount;
      } else {
        dailyMap.set(date, {
          date,
          displayDate: format(parseISO(date), 'dd/MM', { locale: fr }),
          totalPassengers: control.nb_passagers,
          inRule: control.nb_en_regle,
          fraud: fraudCount,
        });
      }
    });

    return Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);
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
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="displayDate" 
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend />
              <Bar 
                dataKey="inRule" 
                name="En règle" 
                stackId="a"
                fill="hsl(142 76% 36%)" 
                radius={[0, 0, 0, 0]}
              />
              <Bar 
                dataKey="fraud" 
                name="Fraude" 
                stackId="a"
                fill="hsl(0 84% 60%)" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

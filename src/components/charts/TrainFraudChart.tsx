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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Train } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Control = Database['public']['Tables']['controls']['Row'];

interface TrainFraudChartProps {
  controls: Control[];
  trainNumber: string;
  title?: string;
}

interface TrainStats {
  date: string;
  displayDate: string;
  totalPassengers: number;
  fraudCount: number;
  fraudRate: number;
  controlCount: number;
}

export function TrainFraudChart({ controls, trainNumber, title }: TrainFraudChartProps) {
  const chartData = useMemo(() => {
    if (!trainNumber.trim()) return [];

    // Normalize train number for comparison (case insensitive, trim spaces)
    const normalizedInput = trainNumber.toLowerCase().trim();

    // Filter controls for this specific train
    const trainControls = controls.filter((control) => {
      const controlTrainNumber = control.train_number?.toLowerCase().trim() || '';
      return controlTrainNumber.includes(normalizedInput) || normalizedInput.includes(controlTrainNumber);
    });

    if (trainControls.length === 0) return [];

    // Group by date
    const dailyMap = new Map<string, TrainStats>();

    trainControls.forEach((control) => {
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

    // Sort by date and return last 14 entries
    return Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);
  }, [controls, trainNumber]);

  // Count total controls for this train
  const totalControls = useMemo(() => {
    if (!trainNumber.trim()) return 0;
    const normalizedInput = trainNumber.toLowerCase().trim();
    return controls.filter((control) => {
      const controlTrainNumber = control.train_number?.toLowerCase().trim() || '';
      return controlTrainNumber.includes(normalizedInput) || normalizedInput.includes(controlTrainNumber);
    }).length;
  }, [controls, trainNumber]);

  // No train number entered
  if (!trainNumber.trim()) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Train className="h-4 w-4" />
            {title || "Évolution du taux de fraude par train"}
          </CardTitle>
          <CardDescription>Saisissez un numéro de train pour voir l'historique</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Entrez un numéro de train pour afficher le graphique
          </div>
        </CardContent>
      </Card>
    );
  }

  // No data for this train
  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Train className="h-4 w-4" />
            Train {trainNumber}
          </CardTitle>
          <CardDescription>Aucun contrôle enregistré pour ce train</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Aucun historique disponible
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate average fraud rate
  const avgFraudRate = chartData.reduce((sum, d) => sum + d.fraudRate, 0) / chartData.length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Train className="h-4 w-4" />
          Train {trainNumber}
        </CardTitle>
        <CardDescription>
          {totalControls} contrôle{totalControls > 1 ? 's' : ''} • Taux moyen: {avgFraudRate.toFixed(1)}%
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="displayDate" 
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
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
                formatter={(value: number, _name: string, props: any) => [
                  `${value.toFixed(2)}% (${props.payload.controlCount} contrôle${props.payload.controlCount > 1 ? 's' : ''})`,
                  'Taux de fraude'
                ]}
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

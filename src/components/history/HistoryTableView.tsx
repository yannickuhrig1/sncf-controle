import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getFraudRateColor } from '@/lib/stats';
import { Train, Building2, TrainTrack, Eye } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Control = Database['public']['Tables']['controls']['Row'];
type LocationType = Database['public']['Enums']['location_type'];

interface HistoryTableViewProps {
  controls: Control[];
  onControlClick: (control: Control) => void;
}

const locationIcons: Record<LocationType, React.ComponentType<{ className?: string }>> = {
  train: Train,
  gare: Building2,
  quai: TrainTrack,
};

const locationLabels: Record<LocationType, string> = {
  train: 'Train',
  gare: 'Gare',
  quai: 'Quai',
};

export function HistoryTableView({ controls, onControlClick }: HistoryTableViewProps) {
  const getFraudRate = (control: Control) => {
    const fraudCount = control.tarifs_controle + control.pv;
    return control.nb_passagers > 0 ? (fraudCount / control.nb_passagers) * 100 : 0;
  };

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[100px]">Date</TableHead>
              <TableHead className="w-[70px]">Heure</TableHead>
              <TableHead className="w-[80px]">Type</TableHead>
              <TableHead>Lieu</TableHead>
              <TableHead className="w-[80px]">Train</TableHead>
              <TableHead>Trajet</TableHead>
              <TableHead className="w-[80px] text-center">Voyageurs</TableHead>
              <TableHead className="w-[80px] text-center">En règle</TableHead>
              <TableHead className="w-[80px] text-center">Tarifs C.</TableHead>
              <TableHead className="w-[60px] text-center">PV</TableHead>
              <TableHead className="w-[70px] text-center">STT 50</TableHead>
              <TableHead className="w-[70px] text-center">STT 100</TableHead>
              <TableHead className="w-[60px] text-center">RNV</TableHead>
              <TableHead className="w-[60px] text-center">RI+</TableHead>
              <TableHead className="w-[60px] text-center">RI-</TableHead>
              <TableHead className="w-[80px] text-center">Fraude</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {controls.map((control, index) => {
              const Icon = locationIcons[control.location_type];
              const fraudRate = getFraudRate(control);
              const isEven = index % 2 === 0;
              
              return (
                <TableRow 
                  key={control.id}
                  className={`cursor-pointer hover:bg-muted/70 transition-colors ${
                    isEven ? 'bg-muted/30' : 'bg-background'
                  }`}
                  onClick={() => onControlClick(control)}
                >
                  <TableCell className="font-medium text-sm">
                    {format(new Date(control.control_date), 'dd/MM/yy', { locale: fr })}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {control.control_time.slice(0, 5)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs">{locationLabels[control.location_type]}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate text-sm">
                    {control.location}
                  </TableCell>
                  <TableCell className="text-sm">
                    {control.train_number || '-'}
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate text-sm text-muted-foreground">
                    {control.origin && control.destination 
                      ? `${control.origin} → ${control.destination}`
                      : '-'
                    }
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {control.nb_passagers}
                  </TableCell>
                  <TableCell className="text-center text-green-600 font-medium">
                    {control.nb_en_regle}
                  </TableCell>
                  <TableCell className="text-center">
                    {control.tarifs_controle > 0 ? (
                      <Badge variant="secondary" className="text-xs">
                        {control.tarifs_controle}
                      </Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {control.pv > 0 ? (
                      <Badge variant="destructive" className="text-xs">
                        {control.pv}
                      </Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {control.stt_50 > 0 ? control.stt_50 : '-'}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {control.stt_100 > 0 ? control.stt_100 : '-'}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {control.rnv > 0 ? control.rnv : '-'}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {control.ri_positive > 0 ? control.ri_positive : '-'}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {control.ri_negative > 0 ? control.ri_negative : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-semibold ${getFraudRateColor(fraudRate)}`}>
                      {fraudRate.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        onControlClick(control);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

import { useState, useMemo } from 'react';
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
import { Train, Building2, TrainTrack, Eye, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Control = Database['public']['Tables']['controls']['Row'];
type LocationType = Database['public']['Enums']['location_type'];

type SortKey = 'date' | 'time' | 'type' | 'location' | 'train' | 'passengers' | 'enRegle' | 'tarifsC' | 'pv' | 'stt50' | 'stt100' | 'rnv' | 'titreTiers' | 'docNaissance' | 'riPlus' | 'riMinus' | 'fraud';
type SortDirection = 'asc' | 'desc' | null;

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

const locationOrder: Record<LocationType, number> = {
  train: 1,
  gare: 2,
  quai: 3,
};

export function HistoryTableView({ controls, onControlClick }: HistoryTableViewProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const getFraudRate = (control: Control) => {
    const fraudCount = control.tarifs_controle + control.pv + control.ri_negative;
    return control.nb_passagers > 0 ? (fraudCount / control.nb_passagers) * 100 : 0;
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortKey(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="h-3 w-3 ml-1" />;
    }
    return <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const sortedControls = useMemo(() => {
    if (!sortKey || !sortDirection) return controls;

    return [...controls].sort((a, b) => {
      let comparison = 0;

      switch (sortKey) {
        case 'date':
          comparison = new Date(a.control_date).getTime() - new Date(b.control_date).getTime();
          break;
        case 'time':
          comparison = a.control_time.localeCompare(b.control_time);
          break;
        case 'type':
          comparison = locationOrder[a.location_type] - locationOrder[b.location_type];
          break;
        case 'location':
          comparison = a.location.localeCompare(b.location);
          break;
        case 'train':
          comparison = (a.train_number || '').localeCompare(b.train_number || '');
          break;
        case 'passengers':
          comparison = a.nb_passagers - b.nb_passagers;
          break;
        case 'enRegle':
          comparison = a.nb_en_regle - b.nb_en_regle;
          break;
        case 'tarifsC':
          comparison = a.tarifs_controle - b.tarifs_controle;
          break;
        case 'pv':
          comparison = a.pv - b.pv;
          break;
        case 'stt50':
          comparison = a.stt_50 - b.stt_50;
          break;
        case 'stt100':
          comparison = a.stt_100 - b.stt_100;
          break;
        case 'rnv':
          comparison = a.rnv - b.rnv;
          break;
        case 'titreTiers':
          comparison = (a.titre_tiers || 0) - (b.titre_tiers || 0);
          break;
        case 'docNaissance':
          comparison = (a.doc_naissance || 0) - (b.doc_naissance || 0);
          break;
        case 'riPlus':
          comparison = a.ri_positive - b.ri_positive;
          break;
        case 'riMinus':
          comparison = a.ri_negative - b.ri_negative;
          break;
        case 'fraud':
          comparison = getFraudRate(a) - getFraudRate(b);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [controls, sortKey, sortDirection]);

  const SortableHeader = ({ columnKey, children, className }: { columnKey: SortKey; children: React.ReactNode; className?: string }) => (
    <TableHead 
      className={`cursor-pointer hover:bg-muted/70 transition-colors select-none ${className || ''}`}
      onClick={() => handleSort(columnKey)}
    >
      <div className="flex items-center">
        {children}
        <SortIcon columnKey={columnKey} />
      </div>
    </TableHead>
  );

  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <SortableHeader columnKey="date" className="w-[100px]">Date</SortableHeader>
              <SortableHeader columnKey="time" className="w-[70px]">Heure</SortableHeader>
              <SortableHeader columnKey="type" className="w-[80px]">Type</SortableHeader>
              <SortableHeader columnKey="train" className="w-[80px]">Train</SortableHeader>
              <TableHead>Trajet</TableHead>
              <SortableHeader columnKey="passengers" className="w-[80px] text-center">Voyageurs</SortableHeader>
              <SortableHeader columnKey="enRegle" className="w-[80px] text-center">En règle</SortableHeader>
              <SortableHeader columnKey="tarifsC" className="w-[80px] text-center text-green-600">Tarifs C.</SortableHeader>
              <SortableHeader columnKey="pv" className="w-[60px] text-center text-red-600">PV</SortableHeader>
              <SortableHeader columnKey="stt50" className="w-[70px] text-center">STT 50</SortableHeader>
              <SortableHeader columnKey="stt100" className="w-[70px] text-center">STT 100</SortableHeader>
              <SortableHeader columnKey="rnv" className="w-[60px] text-center">RNV</SortableHeader>
              <SortableHeader columnKey="titreTiers" className="w-[70px] text-center">T.Tiers</SortableHeader>
              <SortableHeader columnKey="docNaissance" className="w-[70px] text-center">D.Naiss</SortableHeader>
              <SortableHeader columnKey="riPlus" className="w-[60px] text-center">RI+</SortableHeader>
              <SortableHeader columnKey="riMinus" className="w-[60px] text-center">RI-</SortableHeader>
              <SortableHeader columnKey="fraud" className="w-[80px] text-center">Fraude</SortableHeader>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedControls.map((control, index) => {
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
                      <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100">
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
                  <TableCell className="text-center text-sm text-green-600">
                    {control.stt_50 > 0 ? control.stt_50 : '-'}
                  </TableCell>
                  <TableCell className="text-center text-sm text-red-600">
                    {control.stt_100 > 0 ? control.stt_100 : '-'}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {control.rnv > 0 ? control.rnv : '-'}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {(control.titre_tiers || 0) > 0 ? control.titre_tiers : '-'}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {(control.doc_naissance || 0) > 0 ? control.doc_naissance : '-'}
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
  );
}

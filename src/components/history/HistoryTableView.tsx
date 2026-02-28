import { useState, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getFraudRateColor } from '@/lib/stats';
import {
  Train, Building2, TrainTrack,
  ArrowUp, ArrowDown, ArrowUpDown,
  Settings2, GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type Control = Database['public']['Tables']['controls']['Row'];
type LocationType = Database['public']['Enums']['location_type'];
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
const locationLabels: Record<LocationType, string> = { train: 'Train', gare: 'Gare', quai: 'Quai' };
const locationOrder: Record<LocationType, number> = { train: 1, gare: 2, quai: 3 };

const getFraudCount = (c: Control) => c.tarifs_controle + c.pv + c.ri_negative;
const getFraudRate  = (c: Control) => c.nb_passagers > 0 ? (getFraudCount(c) / c.nb_passagers) * 100 : 0;

// ─── Column definition ────────────────────────────────────────────────────────

interface ColumnDef {
  id: string;
  label: string;
  /** Controls header text color / width */
  headerClass?: string;
  /** Controls TableCell className */
  cellClass?: string;
  /** If provided, clicking header sorts by this column */
  sortFn?: (a: Control, b: Control) => number;
  renderCell: (control: Control) => React.ReactNode;
}

const ALL_COLUMNS: ColumnDef[] = [
  {
    id: 'date',
    label: 'Date',
    headerClass: 'w-[100px]',
    cellClass: 'font-medium text-sm',
    sortFn: (a, b) => new Date(a.control_date).getTime() - new Date(b.control_date).getTime(),
    renderCell: (c) => format(new Date(c.control_date), 'dd/MM/yy', { locale: fr }),
  },
  {
    id: 'time',
    label: 'Heure',
    headerClass: 'w-[70px]',
    cellClass: 'text-sm text-muted-foreground',
    sortFn: (a, b) => a.control_time.localeCompare(b.control_time),
    renderCell: (c) => c.control_time.slice(0, 5),
  },
  {
    id: 'type',
    label: 'Type',
    headerClass: 'w-[80px]',
    sortFn: (a, b) => locationOrder[a.location_type] - locationOrder[b.location_type],
    renderCell: (c) => {
      const Icon = locationIcons[c.location_type];
      return (
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs">{locationLabels[c.location_type]}</span>
        </div>
      );
    },
  },
  {
    id: 'train',
    label: 'Train',
    headerClass: 'w-[80px]',
    cellClass: 'text-sm',
    sortFn: (a, b) => (a.train_number || '').localeCompare(b.train_number || ''),
    renderCell: (c) => c.train_number || '-',
  },
  {
    id: 'trajet',
    label: 'Trajet',
    renderCell: (c) => (
      <span className="max-w-[150px] truncate text-sm text-muted-foreground block">
        {c.origin && c.destination ? `${c.origin} → ${c.destination}` : '-'}
      </span>
    ),
  },
  {
    id: 'passengers',
    label: 'Voyageurs',
    headerClass: 'w-[80px] text-center',
    cellClass: 'text-center font-medium',
    sortFn: (a, b) => a.nb_passagers - b.nb_passagers,
    renderCell: (c) => c.nb_passagers,
  },
  {
    id: 'enFraude',
    label: 'En fraude',
    headerClass: 'w-[80px] text-center',
    cellClass: 'text-center font-medium',
    sortFn: (a, b) => getFraudCount(a) - getFraudCount(b),
    renderCell: (c) => {
      const count = getFraudCount(c);
      return <span className={count > 0 ? 'text-amber-600 dark:text-amber-400' : ''}>{count}</span>;
    },
  },
  // ── TC columns ──────────────────────────────────────────────────────────────
  {
    id: 'tarifsC',
    label: 'TC',
    headerClass: 'w-[70px] text-center text-green-700',
    cellClass: 'text-center',
    sortFn: (a, b) => a.tarifs_controle - b.tarifs_controle,
    renderCell: (c) => c.tarifs_controle > 0 ? (
      <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100">
        {c.tarifs_controle}
      </Badge>
    ) : '-',
  },
  {
    id: 'stt50',
    label: 'STT',
    headerClass: 'w-[55px] text-center text-green-600',
    cellClass: 'text-center text-sm text-green-600',
    sortFn: (a, b) => a.stt_50 - b.stt_50,
    renderCell: (c) => c.stt_50 > 0 ? c.stt_50 : '-',
  },
  {
    id: 'rnv',
    label: 'RNV',
    headerClass: 'w-[55px] text-center text-green-600',
    cellClass: 'text-center text-sm text-green-600',
    sortFn: (a, b) => a.rnv - b.rnv,
    renderCell: (c) => c.rnv > 0 ? c.rnv : '-',
  },
  {
    id: 'titreTiers',
    label: 'T.Tiers',
    headerClass: 'w-[65px] text-center text-green-600',
    cellClass: 'text-center text-sm text-green-600',
    sortFn: (a, b) => (a.titre_tiers || 0) - (b.titre_tiers || 0),
    renderCell: (c) => (c.titre_tiers || 0) > 0 ? c.titre_tiers : '-',
  },
  {
    id: 'docNaissance',
    label: 'D.Naiss',
    headerClass: 'w-[65px] text-center text-green-600',
    cellClass: 'text-center text-sm text-green-600',
    sortFn: (a, b) => (a.doc_naissance || 0) - (b.doc_naissance || 0),
    renderCell: (c) => (c.doc_naissance || 0) > 0 ? c.doc_naissance : '-',
  },
  // ── PV columns ──────────────────────────────────────────────────────────────
  {
    id: 'pv',
    label: 'PV',
    headerClass: 'w-[60px] text-center text-red-700',
    cellClass: 'text-center',
    sortFn: (a, b) => a.pv - b.pv,
    renderCell: (c) => c.pv > 0 ? (
      <Badge variant="destructive" className="text-xs">{c.pv}</Badge>
    ) : '-',
  },
  {
    id: 'stt100',
    label: 'STT',
    headerClass: 'w-[55px] text-center text-red-600',
    cellClass: 'text-center text-sm text-red-600',
    sortFn: (a, b) => a.stt_100 - b.stt_100,
    renderCell: (c) => c.stt_100 > 0 ? c.stt_100 : '-',
  },
  {
    id: 'pvRnv',
    label: 'RNV',
    headerClass: 'w-[55px] text-center text-red-600',
    cellClass: 'text-center text-sm text-red-600',
    sortFn: (a, b) => (a.pv_rnv || 0) - (b.pv_rnv || 0),
    renderCell: (c) => (c.pv_rnv || 0) > 0 ? c.pv_rnv : '-',
  },
  {
    id: 'pvTitreTiers',
    label: 'T.Tiers',
    headerClass: 'w-[65px] text-center text-red-600',
    cellClass: 'text-center text-sm text-red-600',
    sortFn: (a, b) => (a.pv_titre_tiers || 0) - (b.pv_titre_tiers || 0),
    renderCell: (c) => (c.pv_titre_tiers || 0) > 0 ? c.pv_titre_tiers : '-',
  },
  {
    id: 'pvDocNaissance',
    label: 'D.Naiss',
    headerClass: 'w-[65px] text-center text-red-600',
    cellClass: 'text-center text-sm text-red-600',
    sortFn: (a, b) => (a.pv_doc_naissance || 0) - (b.pv_doc_naissance || 0),
    renderCell: (c) => (c.pv_doc_naissance || 0) > 0 ? c.pv_doc_naissance : '-',
  },
  // ── RI + taux ────────────────────────────────────────────────────────────────
  {
    id: 'riPlus',
    label: 'RI+',
    headerClass: 'w-[55px] text-center',
    cellClass: 'text-center text-sm',
    sortFn: (a, b) => a.ri_positive - b.ri_positive,
    renderCell: (c) => c.ri_positive > 0 ? c.ri_positive : '-',
  },
  {
    id: 'riMinus',
    label: 'RI-',
    headerClass: 'w-[55px] text-center',
    cellClass: 'text-center text-sm',
    sortFn: (a, b) => a.ri_negative - b.ri_negative,
    renderCell: (c) => c.ri_negative > 0 ? c.ri_negative : '-',
  },
  {
    id: 'fraudRate',
    label: 'Taux %',
    headerClass: 'w-[75px] text-center',
    cellClass: 'text-center',
    sortFn: (a, b) => getFraudRate(a) - getFraudRate(b),
    renderCell: (c) => {
      const rate = getFraudRate(c);
      return <span className={`font-semibold ${getFraudRateColor(rate)}`}>{rate.toFixed(1)}%</span>;
    },
  },
];

const DEFAULT_ORDER = ALL_COLUMNS.map((c) => c.id);

// ─── Component ────────────────────────────────────────────────────────────────

export function HistoryTableView({ controls, onControlClick }: HistoryTableViewProps) {
  // Sort state
  const [sortColId, setSortColId] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);

  // Column config
  const [columnOrder, setColumnOrder] = useState<string[]>(DEFAULT_ORDER);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());

  // Drag state (table headers + popover list)
  const dragId = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // ── Derived ───────────────────────────────────────────────────────────────

  const visibleColumns = useMemo(
    () => columnOrder.map((id) => ALL_COLUMNS.find((c) => c.id === id)!).filter((c) => c && !hiddenCols.has(c.id)),
    [columnOrder, hiddenCols],
  );

  const sortedControls = useMemo(() => {
    if (!sortColId || !sortDir) return controls;
    const col = ALL_COLUMNS.find((c) => c.id === sortColId);
    if (!col?.sortFn) return controls;
    return [...controls].sort((a, b) => {
      const cmp = col.sortFn!(a, b);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [controls, sortColId, sortDir]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSort = (col: ColumnDef) => {
    if (!col.sortFn) return;
    if (sortColId === col.id) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') { setSortColId(null); setSortDir(null); }
      else setSortDir('asc');
    } else {
      setSortColId(col.id);
      setSortDir('asc');
    }
  };

  const reorder = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    setColumnOrder((prev) => {
      const arr = [...prev];
      const fi = arr.indexOf(fromId);
      const ti = arr.indexOf(toId);
      arr.splice(fi, 1);
      arr.splice(ti, 0, fromId);
      return arr;
    });
  };

  const onDragStart = (id: string) => { dragId.current = id; };
  const onDragOver  = (e: React.DragEvent, id: string) => { e.preventDefault(); setDragOverId(id); };
  const onDrop      = (id: string) => { if (dragId.current) reorder(dragId.current, id); dragId.current = null; setDragOverId(null); };
  const onDragEnd   = () => { dragId.current = null; setDragOverId(null); };

  const toggleCol = (id: string) => {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-2">
      {/* Column menu */}
      <div className="flex justify-end">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Colonnes
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-60 p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Afficher / Réorganiser
            </p>
            <div className="space-y-0.5 max-h-80 overflow-y-auto pr-1">
              {columnOrder.map((id) => {
                const col = ALL_COLUMNS.find((c) => c.id === id);
                if (!col) return null;
                const visible = !hiddenCols.has(id);
                return (
                  <div
                    key={id}
                    draggable
                    onDragStart={() => onDragStart(id)}
                    onDragOver={(e) => onDragOver(e, id)}
                    onDrop={() => onDrop(id)}
                    onDragEnd={onDragEnd}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 rounded cursor-grab active:cursor-grabbing select-none',
                      dragOverId === id
                        ? 'bg-primary/10 border border-dashed border-primary/40'
                        : 'hover:bg-muted/60',
                    )}
                  >
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
                    <Checkbox
                      checked={visible}
                      onCheckedChange={() => toggleCol(id)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-shrink-0"
                    />
                    <span className={cn('text-sm flex-1 truncate', !visible && 'text-muted-foreground/50 line-through')}>
                      {col.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => { setColumnOrder(DEFAULT_ORDER); setHiddenCols(new Set()); }}
              >
                Réinitialiser
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {visibleColumns.map((col) => (
                <TableHead
                  key={col.id}
                  draggable
                  onDragStart={() => onDragStart(col.id)}
                  onDragOver={(e) => onDragOver(e, col.id)}
                  onDrop={() => onDrop(col.id)}
                  onDragEnd={onDragEnd}
                  className={cn(
                    col.sortFn ? 'cursor-pointer hover:bg-muted/70 transition-colors select-none' : 'cursor-grab active:cursor-grabbing select-none',
                    col.headerClass || '',
                    dragOverId === col.id && 'bg-primary/10',
                  )}
                  onClick={() => handleSort(col)}
                >
                  <div className="flex items-center">
                    {col.label}
                    {col.sortFn && (
                      sortColId === col.id ? (
                        sortDir === 'asc'
                          ? <ArrowUp className="h-3 w-3 ml-1" />
                          : <ArrowDown className="h-3 w-3 ml-1" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />
                      )
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedControls.map((control, index) => (
              <TableRow
                key={control.id}
                className={cn(
                  'cursor-pointer hover:bg-muted/70 transition-colors',
                  index % 2 === 0 ? 'bg-muted/30' : 'bg-background',
                )}
                onClick={() => onControlClick(control)}
              >
                {visibleColumns.map((col) => (
                  <TableCell key={col.id} className={col.cellClass || ''}>
                    {col.renderCell(control)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

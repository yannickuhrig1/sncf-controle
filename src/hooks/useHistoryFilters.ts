import { useMemo, useState } from 'react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import type { Period } from '@/components/dashboard/PeriodSelector';
import type { Database } from '@/integrations/supabase/types';

type Control = Database['public']['Tables']['controls']['Row'];
type LocationType = Database['public']['Enums']['location_type'];

export type SortOption = 'date' | 'fraud_desc' | 'fraud_asc' | 'passengers_desc' | 'passengers_asc';

export interface HistoryFiltersState {
  searchQuery: string;
  locationFilter: LocationType | 'all';
  sortOption: SortOption;
  historyPeriod: Period | 'all';
  customStart: string;
  customEnd: string;
  selectedDate: Date;
  civileFilter: boolean;
  policeFilter: boolean;
  sugeFilter: boolean;
  overcrowdedFilter: boolean;
  cancelledFilter: boolean;
}

const initialState: HistoryFiltersState = {
  searchQuery: '',
  locationFilter: 'all',
  sortOption: 'date',
  historyPeriod: 'all',
  customStart: '',
  customEnd: '',
  selectedDate: new Date(),
  civileFilter: false,
  policeFilter: false,
  sugeFilter: false,
  overcrowdedFilter: false,
  cancelledFilter: false,
};

function getFraudRate(control: Control): number {
  const fraudCount = control.tarifs_controle + control.pv + control.ri_negative;
  return control.nb_passagers > 0 ? (fraudCount / control.nb_passagers) * 100 : 0;
}

/** Fusionne les contrôles du même train (ou gare) le même jour en un seul. */
export function mergeControlsByTrain(controls: Control[]): Control[] {
  const groups = new Map<string, Control[]>();
  for (const c of controls) {
    const key = c.location_type === 'train' && c.train_number
      ? `train::${c.control_date}::${c.train_number}`
      : c.location_type === 'gare'
      ? `gare::${c.control_date}::${c.location}`
      : `solo::${c.id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }
  return Array.from(groups.values()).map(group => {
    if (group.length === 1) return group[0];
    const first = group[0];
    const s = (fn: (c: Control) => number) => group.reduce((acc, c) => acc + fn(c), 0);
    return {
      ...first,
      control_time: group.reduce((m, c) => c.control_time < m ? c.control_time : m, first.control_time),
      nb_passagers:           s(c => c.nb_passagers),
      nb_en_regle:            s(c => c.nb_en_regle),
      tarifs_controle:        s(c => c.tarifs_controle),
      pv:                     s(c => c.pv),
      ri_positive:            s(c => c.ri_positive),
      ri_negative:            s(c => c.ri_negative),
      stt_50:                 s(c => c.stt_50),
      stt_50_amount:          s(c => c.stt_50_amount || 0),
      stt_100:                s(c => c.stt_100),
      stt_100_amount:         s(c => c.stt_100_amount || 0),
      rnv:                    s(c => c.rnv),
      rnv_amount:             s(c => c.rnv_amount || 0),
      titre_tiers:            s(c => c.titre_tiers || 0),
      titre_tiers_amount:     s(c => c.titre_tiers_amount || 0),
      doc_naissance:          s(c => c.doc_naissance || 0),
      doc_naissance_amount:   s(c => c.doc_naissance_amount || 0),
      pv_rnv:                 s(c => c.pv_rnv || 0),
      pv_titre_tiers:         s(c => c.pv_titre_tiers || 0),
      pv_doc_naissance:       s(c => c.pv_doc_naissance || 0),
      pv_autre:               s(c => c.pv_autre || 0),
      tarif_bord_stt_50:      s(c => c.tarif_bord_stt_50 || 0),
      tarif_bord_stt_100:     s(c => c.tarif_bord_stt_100 || 0),
      tarif_bord_rnv:         s(c => c.tarif_bord_rnv || 0),
      tarif_bord_titre_tiers: s(c => c.tarif_bord_titre_tiers || 0),
      tarif_bord_doc_naissance: s(c => c.tarif_bord_doc_naissance || 0),
      tarif_bord_autre:       s(c => c.tarif_bord_autre || 0),
      notes: group.map(c => c.notes).filter(Boolean).join(' | ') || null,
    };
  });
}

export interface DayGroup {
  date: string;
  groups: { type: 'train' | 'gare'; controls: Control[] }[];
  solo: Control[];
  totals: { passengers: number; fraud: number; rate: number };
}

export function useHistoryFilters(controls: Control[]) {
  const [state, setState] = useState<HistoryFiltersState>(initialState);

  // Setters
  const setSearchQuery       = (v: string)                     => setState(s => ({ ...s, searchQuery: v }));
  const setLocationFilter    = (v: LocationType | 'all')       => setState(s => ({ ...s, locationFilter: v }));
  const setSortOption        = (v: SortOption)                 => setState(s => ({ ...s, sortOption: v }));
  const setHistoryPeriod     = (v: Period | 'all')             => setState(s => ({ ...s, historyPeriod: v }));
  const setCustomStart       = (v: string)                     => setState(s => ({ ...s, customStart: v }));
  const setCustomEnd         = (v: string)                     => setState(s => ({ ...s, customEnd: v }));
  const setSelectedDate      = (v: Date)                       => setState(s => ({ ...s, selectedDate: v }));
  const setCivileFilter      = (v: boolean | ((p: boolean) => boolean)) => setState(s => ({ ...s, civileFilter: typeof v === 'function' ? v(s.civileFilter) : v }));
  const setPoliceFilter      = (v: boolean | ((p: boolean) => boolean)) => setState(s => ({ ...s, policeFilter: typeof v === 'function' ? v(s.policeFilter) : v }));
  const setSugeFilter        = (v: boolean | ((p: boolean) => boolean)) => setState(s => ({ ...s, sugeFilter: typeof v === 'function' ? v(s.sugeFilter) : v }));
  const setOvercrowdedFilter = (v: boolean | ((p: boolean) => boolean)) => setState(s => ({ ...s, overcrowdedFilter: typeof v === 'function' ? v(s.overcrowdedFilter) : v }));
  const setCancelledFilter   = (v: boolean | ((p: boolean) => boolean)) => setState(s => ({ ...s, cancelledFilter: typeof v === 'function' ? v(s.cancelledFilter) : v }));

  const clearFilters = () => setState(initialState);

  // Computed: date range from period selection
  const periodDateRange = useMemo(() => {
    const { historyPeriod, selectedDate, customStart, customEnd } = state;
    switch (historyPeriod) {
      case 'day': {
        const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        return { start: d, end: d };
      }
      case 'week':
        return { start: startOfWeek(selectedDate, { weekStartsOn: 1 }), end: endOfWeek(selectedDate, { weekStartsOn: 1 }) };
      case 'month':
        return { start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) };
      case 'year':
        return { start: startOfYear(selectedDate), end: endOfYear(selectedDate) };
      case 'custom':
        return {
          start: customStart ? new Date(customStart) : null,
          end: customEnd ? new Date(customEnd) : null,
        };
      default:
        return { start: null as Date | null, end: null as Date | null };
    }
  }, [state]);

  // Filter & sort
  const filteredControls = useMemo(() => {
    const { start, end } = periodDateRange;
    const {
      searchQuery, locationFilter, sortOption,
      civileFilter, policeFilter, sugeFilter, overcrowdedFilter, cancelledFilter,
    } = state;

    let result = controls.filter(control => {
      if (locationFilter !== 'all' && control.location_type !== locationFilter) return false;

      if (start || end) {
        const controlDate = new Date(control.control_date);
        if (start && controlDate < start) return false;
        if (end) {
          const endOfDay = new Date(end);
          endOfDay.setHours(23, 59, 59, 999);
          if (controlDate > endOfDay) return false;
        }
      }

      if (civileFilter      && !(control as any).is_civile)          return false;
      if (policeFilter      && !(control as any).is_police_on_board) return false;
      if (sugeFilter        && !(control as any).is_suge_on_board)   return false;
      if (overcrowdedFilter && !(control as any).is_overcrowded)     return false;
      if (cancelledFilter   && !(control as any).is_cancelled)       return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matches =
          control.location.toLowerCase().includes(query) ||
          control.train_number?.toLowerCase().includes(query) ||
          control.origin?.toLowerCase().includes(query) ||
          control.destination?.toLowerCase().includes(query);
        if (!matches) return false;
      }

      return true;
    });

    switch (sortOption) {
      case 'fraud_desc':       result = [...result].sort((a, b) => getFraudRate(b) - getFraudRate(a)); break;
      case 'fraud_asc':        result = [...result].sort((a, b) => getFraudRate(a) - getFraudRate(b)); break;
      case 'passengers_desc':  result = [...result].sort((a, b) => b.nb_passagers - a.nb_passagers);   break;
      case 'passengers_asc':   result = [...result].sort((a, b) => a.nb_passagers - b.nb_passagers);   break;
    }

    return result;
  }, [controls, state, periodDateRange]);

  // Group by date with subgroups by train/gare
  const groupedByDate = useMemo<DayGroup[]>(() => {
    const byDate: Record<string, Control[]> = {};
    filteredControls.forEach(c => {
      if (!byDate[c.control_date]) byDate[c.control_date] = [];
      byDate[c.control_date].push(c);
    });

    return Object.entries(byDate)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
      .map(([date, dayControls]) => {
        const buckets: Record<string, Control[]> = {};
        const solo: Control[] = [];

        dayControls.forEach(c => {
          const key = c.location_type === 'train' && c.train_number
            ? `train::${c.train_number}`
            : c.location_type === 'gare'
            ? `gare::${c.location}`
            : null;
          if (key) {
            if (!buckets[key]) buckets[key] = [];
            buckets[key].push(c);
          } else {
            solo.push(c);
          }
        });

        const groups: { type: 'train' | 'gare'; controls: Control[] }[] = [];
        Object.entries(buckets).forEach(([key, cs]) => {
          if (cs.length > 1) {
            groups.push({ type: key.startsWith('train') ? 'train' : 'gare', controls: cs });
          } else {
            solo.push(...cs);
          }
        });

        solo.sort((a, b) => b.control_time.localeCompare(a.control_time));

        const passengers = dayControls.reduce((s, c) => s + c.nb_passagers, 0);
        const fraud = dayControls.reduce((s, c) => s + c.tarifs_controle + c.pv + c.ri_negative, 0);
        const rate = passengers > 0 ? (fraud / passengers) * 100 : 0;

        return { date, groups, solo, totals: { passengers, fraud, rate } };
      });
  }, [filteredControls]);

  const hasActiveFilters =
    state.searchQuery.trim() !== '' ||
    state.locationFilter !== 'all' ||
    state.sortOption !== 'date' ||
    state.historyPeriod !== 'all' ||
    state.civileFilter ||
    state.policeFilter ||
    state.sugeFilter ||
    state.overcrowdedFilter ||
    state.cancelledFilter;

  const advancedFilterCount =
    Number(state.civileFilter) +
    Number(state.policeFilter) +
    Number(state.sugeFilter) +
    Number(state.overcrowdedFilter) +
    Number(state.cancelledFilter) +
    Number(state.sortOption !== 'date');

  return {
    state,
    setters: {
      setSearchQuery, setLocationFilter, setSortOption,
      setHistoryPeriod, setCustomStart, setCustomEnd, setSelectedDate,
      setCivileFilter, setPoliceFilter, setSugeFilter, setOvercrowdedFilter, setCancelledFilter,
    },
    clearFilters,
    periodDateRange,
    filteredControls,
    groupedByDate,
    hasActiveFilters,
    advancedFilterCount,
    getFraudRate,
  };
}

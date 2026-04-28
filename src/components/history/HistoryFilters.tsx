import { Search, X, SlidersHorizontal, Train, Building2, ArrowUpDown, Shield, EyeOff, Users, Ban } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { PeriodSelector, type Period } from '@/components/dashboard/PeriodSelector';
import { DashboardDatePicker } from '@/components/dashboard/DashboardDatePicker';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';
import type { SortOption } from '@/hooks/useHistoryFilters';

type LocationType = Database['public']['Enums']['location_type'];

interface HistoryFiltersProps {
  // Search
  searchQuery: string;
  onSearchChange: (v: string) => void;

  // Location type
  locationFilter: LocationType | 'all';
  onLocationChange: (v: LocationType | 'all') => void;

  // Period
  historyPeriod: Period | 'all';
  onPeriodChange: (v: Period | 'all') => void;
  selectedDate: Date;
  onSelectedDateChange: (d: Date) => void;
  customStart: string;
  customEnd: string;
  onCustomStartChange: (v: string) => void;
  onCustomEndChange: (v: string) => void;

  // Sort
  sortOption: SortOption;
  onSortChange: (v: SortOption) => void;

  // Badge filters
  civileFilter: boolean;
  policeFilter: boolean;
  sugeFilter: boolean;
  overcrowdedFilter: boolean;
  cancelledFilter: boolean;
  onToggleCivile: () => void;
  onTogglePolice: () => void;
  onToggleSuge: () => void;
  onToggleOvercrowded: () => void;
  onToggleCancelled: () => void;

  // Clear
  hasActiveFilters: boolean;
  advancedFilterCount: number;
  onClearAll: () => void;

  // Result count chip
  filteredCount: number;
  totalCount: number;
}

const SORT_LABELS: Record<SortOption, string> = {
  date: 'Date (récent)',
  fraud_desc: 'Fraude ↓ élevée',
  fraud_asc: 'Fraude ↑ faible',
  passengers_desc: 'Voyageurs ↓',
  passengers_asc: 'Voyageurs ↑',
};

const BADGE_FILTERS = [
  { key: 'civile',      label: 'Civile',    Icon: EyeOff,  activeBg: 'bg-emerald-600 border-emerald-600 text-white', idleBg: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { key: 'police',      label: 'Police',    Icon: Shield,  activeBg: 'bg-blue-600 border-blue-600 text-white',       idleBg: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  { key: 'suge',        label: 'SUGE',      Icon: Shield,  activeBg: 'bg-indigo-600 border-indigo-600 text-white',   idleBg: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400' },
  { key: 'overcrowded', label: 'Sur-occ.',  Icon: Users,   activeBg: 'bg-orange-500 border-orange-500 text-white',   idleBg: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  { key: 'cancelled',   label: 'Supprimé',  Icon: Ban,     activeBg: 'bg-slate-700 border-slate-700 text-white',     idleBg: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400' },
] as const;

export function HistoryFilters(props: HistoryFiltersProps) {
  const {
    searchQuery, onSearchChange,
    locationFilter, onLocationChange,
    historyPeriod, onPeriodChange, selectedDate, onSelectedDateChange,
    customStart, customEnd, onCustomStartChange, onCustomEndChange,
    sortOption, onSortChange,
    civileFilter, policeFilter, sugeFilter, overcrowdedFilter, cancelledFilter,
    onToggleCivile, onTogglePolice, onToggleSuge, onToggleOvercrowded, onToggleCancelled,
    hasActiveFilters, advancedFilterCount, onClearAll,
    filteredCount, totalCount,
  } = props;

  const filterToggles = {
    civile: { value: civileFilter, toggle: onToggleCivile },
    police: { value: policeFilter, toggle: onTogglePolice },
    suge: { value: sugeFilter, toggle: onToggleSuge },
    overcrowded: { value: overcrowdedFilter, toggle: onToggleOvercrowded },
    cancelled: { value: cancelledFilter, toggle: onToggleCancelled },
  } as const;

  // Active chips for "filters applied" row
  const activeChips: { label: string; clear: () => void }[] = [];
  if (locationFilter !== 'all') {
    activeChips.push({
      label: locationFilter === 'train' ? 'Train' : locationFilter === 'gare' ? 'Gare' : locationFilter,
      clear: () => onLocationChange('all'),
    });
  }
  if (historyPeriod !== 'all') {
    const periodLabels: Record<Period, string> = { day: 'Jour', week: 'Semaine', month: 'Mois', year: 'Année', custom: 'Période perso.' };
    activeChips.push({
      label: periodLabels[historyPeriod as Period],
      clear: () => onPeriodChange('all'),
    });
  }
  BADGE_FILTERS.forEach(b => {
    if (filterToggles[b.key].value) {
      activeChips.push({ label: b.label, clear: filterToggles[b.key].toggle });
    }
  });
  if (sortOption !== 'date') {
    activeChips.push({ label: `Tri : ${SORT_LABELS[sortOption]}`, clear: () => onSortChange('date') });
  }

  return (
    <div className="space-y-2.5">
      {/* Ligne 1 : recherche + type + filtres avancés */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher train, lieu, trajet…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-9 h-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => onSearchChange('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Type — segmented (icons only on mobile) */}
        <ToggleGroup
          type="single"
          value={locationFilter}
          onValueChange={(v) => v && onLocationChange(v as LocationType | 'all')}
          className="hidden xs:flex"
        >
          <ToggleGroupItem value="all" aria-label="Tous" size="sm" className="h-9 px-3 text-xs">
            Tous
          </ToggleGroupItem>
          <ToggleGroupItem value="train" aria-label="Train" size="sm" className="h-9 px-2.5 gap-1 text-xs">
            <Train className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Train</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="gare" aria-label="Gare" size="sm" className="h-9 px-2.5 gap-1 text-xs">
            <Building2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Gare</span>
          </ToggleGroupItem>
        </ToggleGroup>

        {/* Filtres avancés */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 shrink-0">
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filtres</span>
              {advancedFilterCount > 0 && (
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                  {advancedFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-4 space-y-4">
            {/* Type — small screens fallback */}
            <div className="flex xs:hidden flex-col gap-2">
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <ToggleGroup
                type="single"
                value={locationFilter}
                onValueChange={(v) => v && onLocationChange(v as LocationType | 'all')}
              >
                <ToggleGroupItem value="all" size="sm">Tous</ToggleGroupItem>
                <ToggleGroupItem value="train" size="sm" className="gap-1"><Train className="h-3.5 w-3.5" />Train</ToggleGroupItem>
                <ToggleGroupItem value="gare" size="sm" className="gap-1"><Building2 className="h-3.5 w-3.5" />Gare</ToggleGroupItem>
              </ToggleGroup>
              <Separator />
            </div>

            {/* Sort */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <ArrowUpDown className="h-3 w-3" /> Trier par
              </label>
              <Select value={sortOption} onValueChange={(v) => onSortChange(v as SortOption)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([k, lbl]) => (
                    <SelectItem key={k} value={k}>{lbl}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Badges */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Caractéristiques</label>
              <div className="flex flex-wrap gap-1.5">
                {BADGE_FILTERS.map(({ key, label, Icon, activeBg, idleBg }) => {
                  const { value, toggle } = filterToggles[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={toggle}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                        value ? activeBg : idleBg
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Ligne 2 : période */}
      <div className="flex flex-wrap items-center gap-2">
        <PeriodSelector
          selectedPeriod={historyPeriod}
          onPeriodChange={(p) => {
            onPeriodChange(p);
            if (p !== 'custom') { onCustomStartChange(''); onCustomEndChange(''); }
            if (p !== 'all' && p !== 'custom') onSelectedDateChange(new Date());
          }}
          showAll
          customStart={customStart}
          customEnd={customEnd}
          onCustomStartChange={onCustomStartChange}
          onCustomEndChange={onCustomEndChange}
        />
        {historyPeriod !== 'all' && historyPeriod !== 'custom' && (
          <DashboardDatePicker
            date={selectedDate}
            onDateChange={onSelectedDateChange}
            period={historyPeriod}
          />
        )}
      </div>

      {/* Ligne 3 : chips de filtres actifs + résultats */}
      {(activeChips.length > 0 || hasActiveFilters) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeChips.map((chip, i) => (
            <button
              key={i}
              type="button"
              onClick={chip.clear}
              className="inline-flex items-center gap-1 rounded-full bg-secondary text-secondary-foreground px-2.5 py-1 text-xs hover:bg-secondary/80 transition-colors"
            >
              {chip.label}
              <X className="h-3 w-3" />
            </button>
          ))}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="h-7 px-2 text-xs text-muted-foreground"
            >
              Tout effacer
            </Button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {filteredCount} sur {totalCount}
          </span>
        </div>
      )}
    </div>
  );
}

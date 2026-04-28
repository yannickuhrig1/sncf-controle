import { useMemo, useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Activity,
  Users,
  Clock,
  TrendingUp,
  ArrowUpDown,
  Loader2,
  Train,
  Building2,
  Pencil,
  PlusCircle,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgentActivity, type ActivityPeriod, type AgentActivity } from '@/hooks/useAgentActivity';
import { useActivityFeed, type ActivityEvent } from '@/hooks/useActivityFeed';
import { getFraudRateColor } from '@/lib/stats';

interface ActivityTabProps {
  /** Set of user_ids currently online (from Supabase Realtime presence) */
  onlineUsers: Set<string>;
  /** Map of profile.id → user_id (presence is keyed by user_id, profiles by id) */
  profileToUserId: Record<string, string | undefined>;
}

type SortKey = 'name' | 'controls' | 'embarkments' | 'passengers' | 'fraud' | 'rate' | 'last';

const PERIOD_LABELS: Record<ActivityPeriod, string> = {
  day: "Aujourd'hui",
  week: 'Cette semaine',
  month: 'Ce mois',
  all: 'Tout',
};

function formatRelativeOrAbsolute(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 7 * 24 * 60 * 60 * 1000) {
    return formatDistanceToNow(d, { addSuffix: true, locale: fr });
  }
  return format(d, 'dd/MM/yyyy HH:mm', { locale: fr });
}

function eventIcon(type: ActivityEvent['type']) {
  switch (type) {
    case 'control_created':    return <PlusCircle className="h-3.5 w-3.5 text-emerald-600" />;
    case 'control_updated':    return <Pencil className="h-3.5 w-3.5 text-blue-600" />;
    case 'embarkment_created': return <Building2 className="h-3.5 w-3.5 text-emerald-600" />;
    case 'embarkment_updated': return <Pencil className="h-3.5 w-3.5 text-blue-600" />;
  }
}

export function ActivityTab({ onlineUsers, profileToUserId }: ActivityTabProps) {
  const [period, setPeriod] = useState<ActivityPeriod>('week');
  const [sortKey, setSortKey] = useState<SortKey>('controls');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [feedAgentFilter, setFeedAgentFilter] = useState<string>('all');
  const [feedSearch, setFeedSearch] = useState('');

  const { activity, isLoading: activityLoading } = useAgentActivity(period);
  const { events, isLoading: feedLoading } = useActivityFeed();

  const sortedActivity = useMemo<AgentActivity[]>(() => {
    const sign = sortDir === 'asc' ? 1 : -1;
    const sorted = [...activity].sort((a, b) => {
      switch (sortKey) {
        case 'name':       return sign * (`${a.lastName} ${a.firstName}`).localeCompare(`${b.lastName} ${b.firstName}`);
        case 'controls':   return sign * (a.controlCount - b.controlCount);
        case 'embarkments':return sign * (a.embarkmentCount - b.embarkmentCount);
        case 'passengers': return sign * (a.passengers - b.passengers);
        case 'fraud':      return sign * (a.fraud - b.fraud);
        case 'rate':       return sign * (a.fraudRate - b.fraudRate);
        case 'last':       {
          const ta = a.lastActionAt ? new Date(a.lastActionAt).getTime() : 0;
          const tb = b.lastActionAt ? new Date(b.lastActionAt).getTime() : 0;
          return sign * (ta - tb);
        }
      }
    });
    return sorted;
  }, [activity, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const SortHeader = ({ label, k, align }: { label: string; k: SortKey; align?: 'right' | 'center' }) => (
    <TableHead className={cn(align === 'right' && 'text-right', align === 'center' && 'text-center')}>
      <button
        type="button"
        onClick={() => handleSort(k)}
        className={cn(
          'inline-flex items-center gap-1 hover:text-foreground transition-colors',
          sortKey === k && 'text-foreground font-semibold'
        )}
      >
        {label}
        <ArrowUpDown className={cn('h-3 w-3', sortKey !== k && 'opacity-30')} />
      </button>
    </TableHead>
  );

  // List of unique agents for the feed filter
  const feedAgents = useMemo(() => {
    const map = new Map<string, string>();
    events.forEach(e => map.set(e.agentId, e.agentName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (feedAgentFilter !== 'all' && e.agentId !== feedAgentFilter) return false;
      if (feedSearch.trim()) {
        const q = feedSearch.toLowerCase().trim();
        if (!e.summary.toLowerCase().includes(q) && !e.agentName.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [events, feedAgentFilter, feedSearch]);

  // Online list — agents with last activity today
  const onlineActivity = useMemo(() => {
    return activity
      .filter(a => {
        const userId = profileToUserId[a.agentId];
        return userId && onlineUsers.has(userId);
      })
      .sort((a, b) => {
        const ta = a.lastActionAt ? new Date(a.lastActionAt).getTime() : 0;
        const tb = b.lastActionAt ? new Date(b.lastActionAt).getTime() : 0;
        return tb - ta;
      });
  }, [activity, onlineUsers, profileToUserId]);

  return (
    <div className="space-y-4">
      {/* Section A — Tableau par agent */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Activité par agent
          </CardTitle>
          <Select value={period} onValueChange={(v) => setPeriod(v as ActivityPeriod)}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(PERIOD_LABELS) as [ActivityPeriod, string][]).map(([k, label]) => (
                <SelectItem key={k} value={k}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHeader label="Agent" k="name" />
                    <SortHeader label="Contrôles" k="controls" align="center" />
                    <SortHeader label="Embarq." k="embarkments" align="center" />
                    <SortHeader label="Voyageurs" k="passengers" align="right" />
                    <SortHeader label="Fraudes" k="fraud" align="right" />
                    <SortHeader label="Taux" k="rate" align="right" />
                    <SortHeader label="Dernière saisie" k="last" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedActivity.map(a => {
                    const totalActions = a.controlCount + a.embarkmentCount;
                    const userId = profileToUserId[a.agentId];
                    const online = userId && onlineUsers.has(userId);
                    return (
                      <TableRow key={a.agentId} className={totalActions === 0 ? 'opacity-60' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-0">
                            {online && <span className="inline-block h-2 w-2 rounded-full bg-green-500 shrink-0" title="En ligne" />}
                            <span className="font-medium truncate">{a.lastName} {a.firstName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center tabular-nums">{a.controlCount}</TableCell>
                        <TableCell className="text-center tabular-nums">{a.embarkmentCount}</TableCell>
                        <TableCell className="text-right tabular-nums">{a.passengers}</TableCell>
                        <TableCell className="text-right tabular-nums">{a.fraud}</TableCell>
                        <TableCell className={cn('text-right tabular-nums font-semibold', getFraudRateColor(a.fraudRate))}>
                          {a.passengers > 0 ? `${a.fraudRate.toFixed(1)}%` : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatRelativeOrAbsolute(a.lastActionAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section C — Présence en direct */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            En ligne maintenant
            <Badge variant="secondary" className="text-xs">{onlineActivity.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {onlineActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Personne n'est connecté actuellement.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {onlineActivity.map(a => (
                <div
                  key={a.agentId}
                  className="flex items-center gap-3 p-3 rounded-md border bg-card hover:bg-muted/40 transition-colors"
                >
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500 shrink-0 animate-pulse" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{a.lastName} {a.firstName}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {a.lastActionAt
                        ? `Dernière saisie ${formatRelativeOrAbsolute(a.lastActionAt)}`
                        : 'Aucune saisie aujourd\'hui'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section B — Journal d'activité */}
      <Card>
        <CardHeader className="flex flex-col gap-3">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Journal d'activité
            <Badge variant="secondary" className="text-xs">{filteredEvents.length}</Badge>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={feedSearch}
                onChange={(e) => setFeedSearch(e.target.value)}
                placeholder="Rechercher dans le journal…"
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Select value={feedAgentFilter} onValueChange={setFeedAgentFilter}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="Tous les agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les agents</SelectItem>
                {feedAgents.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {feedLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Aucun événement pour ces critères.
            </p>
          ) : (
            <ul className="space-y-1">
              {filteredEvents.map(e => (
                <li
                  key={e.id}
                  className="flex items-start gap-3 px-3 py-2 rounded-md hover:bg-muted/40 transition-colors text-sm"
                >
                  <div className="mt-0.5 shrink-0">{eventIcon(e.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      <span className="font-medium">{e.agentName}</span>
                      <span className="text-muted-foreground"> {e.summary}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatRelativeOrAbsolute(e.timestamp)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-[11px] text-muted-foreground italic">
            Limites : seules les créations et modifications sont visibles. Les suppressions et connexions ne sont pas tracées (table d'audit non câblée).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

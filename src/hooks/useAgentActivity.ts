import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { EmbarkmentTrain } from '@/components/controls/EmbarkmentControl';

type Control = Database['public']['Tables']['controls']['Row'];

export type ActivityPeriod = 'day' | 'week' | 'month' | 'all';

export interface AgentActivity {
  agentId: string;
  firstName: string;
  lastName: string;
  controlCount: number;
  embarkmentCount: number;
  passengers: number;
  fraud: number;
  fraudRate: number;
  lastActionAt: string | null;
}

interface RawEmbarkmentMission {
  id: string;
  agent_id: string;
  mission_date: string;
  trains: EmbarkmentTrain[];
  updated_at: string;
}

function periodRange(period: ActivityPeriod, ref = new Date()): { start: Date | null; end: Date | null } {
  switch (period) {
    case 'day':   return { start: startOfDay(ref),   end: endOfDay(ref) };
    case 'week':  return { start: startOfWeek(ref, { weekStartsOn: 1 }), end: endOfWeek(ref, { weekStartsOn: 1 }) };
    case 'month': return { start: startOfMonth(ref), end: endOfMonth(ref) };
    default:      return { start: null, end: null };
  }
}

export function useAgentActivity(period: ActivityPeriod) {
  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['admin-activity-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .order('last_name');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: controls = [], isLoading: controlsLoading } = useQuery({
    queryKey: ['admin-activity-controls'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('controls')
        .select('*')
        .order('control_date', { ascending: false })
        .limit(10000);
      if (error) throw error;
      return data as Control[];
    },
    staleTime: 60 * 1000,
  });

  const { data: missions = [], isLoading: missionsLoading } = useQuery({
    queryKey: ['admin-activity-embarkments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('embarkment_missions')
        .select('id, agent_id, mission_date, trains, updated_at')
        .order('mission_date', { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as unknown as RawEmbarkmentMission[];
    },
    staleTime: 60 * 1000,
  });

  const range = useMemo(() => periodRange(period), [period]);

  const inPeriod = (dateStr: string): boolean => {
    if (!range.start || !range.end) return true;
    const d = new Date(dateStr);
    return d >= range.start && d <= range.end;
  };

  const activity = useMemo<AgentActivity[]>(() => {
    const filteredControls = controls.filter(c => inPeriod(c.control_date));
    const filteredMissions = missions.filter(m => inPeriod(m.mission_date));

    const byAgent = new Map<string, AgentActivity>();

    profiles.forEach(p => {
      byAgent.set(p.id, {
        agentId: p.id,
        firstName: p.first_name ?? '',
        lastName: p.last_name ?? '',
        controlCount: 0,
        embarkmentCount: 0,
        passengers: 0,
        fraud: 0,
        fraudRate: 0,
        lastActionAt: null,
      });
    });

    const touchLastAction = (entry: AgentActivity, ts: string) => {
      if (!entry.lastActionAt || new Date(ts) > new Date(entry.lastActionAt)) {
        entry.lastActionAt = ts;
      }
    };

    filteredControls.forEach(c => {
      const entry = byAgent.get(c.agent_id);
      if (!entry) return;
      entry.controlCount += 1;
      entry.passengers += c.nb_passagers;
      entry.fraud += c.tarifs_controle + c.pv + c.ri_negative;
      const ts = `${c.control_date}T${c.control_time || '00:00:00'}`;
      touchLastAction(entry, ts);
    });

    filteredMissions.forEach(m => {
      const entry = byAgent.get(m.agent_id);
      if (!entry) return;
      entry.embarkmentCount += 1;
      m.trains.forEach(t => {
        entry.passengers += t.controlled ?? 0;
        entry.fraud += t.refused ?? 0;
      });
      touchLastAction(entry, m.updated_at);
    });

    byAgent.forEach(entry => {
      entry.fraudRate = entry.passengers > 0 ? (entry.fraud / entry.passengers) * 100 : 0;
    });

    return Array.from(byAgent.values());
  }, [profiles, controls, missions, range.start, range.end]);

  return {
    activity,
    isLoading: profilesLoading || controlsLoading || missionsLoading,
    range,
  };
}

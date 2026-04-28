import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Control = Database['public']['Tables']['controls']['Row'];

export type ActivityEventType = 'control_created' | 'control_updated' | 'embarkment_created' | 'embarkment_updated';

export interface ActivityEvent {
  id: string;
  agentId: string;
  agentName: string;
  type: ActivityEventType;
  timestamp: string;
  /** Description courte pour l'affichage timeline */
  summary: string;
  /** Pour permettre cliquer et ouvrir le contrôle/mission */
  refId: string;
}

interface RawEmbarkmentMission {
  id: string;
  agent_id: string;
  mission_date: string;
  station_name: string;
  created_at: string;
  updated_at: string;
}

const FEED_LIMIT = 100;

/**
 * Considère un événement comme une "modification" (vs création) si la
 * différence entre updated_at et created_at dépasse cette tolérance.
 * Évite les faux positifs lors d'une création (Supabase écrit les deux
 * timestamps avec quelques ms d'écart). */
const UPDATE_THRESHOLD_MS = 60_000; // 1 minute

export function useActivityFeed() {
  const { data: profiles = [] } = useQuery({
    queryKey: ['admin-feed-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: controls = [], isLoading: controlsLoading } = useQuery({
    queryKey: ['admin-feed-controls'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('controls')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(FEED_LIMIT);
      if (error) throw error;
      return data as Control[];
    },
    staleTime: 30 * 1000,
  });

  const { data: missions = [], isLoading: missionsLoading } = useQuery({
    queryKey: ['admin-feed-embarkments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('embarkment_missions')
        .select('id, agent_id, mission_date, station_name, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(FEED_LIMIT);
      if (error) throw error;
      return (data ?? []) as RawEmbarkmentMission[];
    },
    staleTime: 30 * 1000,
  });

  const profileMap = useMemo(
    () => Object.fromEntries(profiles.map(p => [p.id, `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Agent inconnu'])),
    [profiles]
  );

  const events = useMemo<ActivityEvent[]>(() => {
    const evs: ActivityEvent[] = [];

    controls.forEach(c => {
      const created = new Date(c.created_at).getTime();
      const updated = new Date(c.updated_at).getTime();
      const isUpdate = updated - created > UPDATE_THRESHOLD_MS;
      const where = c.location_type === 'train' && c.train_number
        ? `train ${c.train_number}`
        : c.origin && c.destination
          ? `${c.origin} → ${c.destination}`
          : c.location;
      evs.push({
        id: `c-${c.id}-${isUpdate ? 'u' : 'c'}`,
        agentId: c.agent_id,
        agentName: profileMap[c.agent_id] ?? 'Agent inconnu',
        type: isUpdate ? 'control_updated' : 'control_created',
        timestamp: isUpdate ? c.updated_at : c.created_at,
        summary: `${isUpdate ? 'a modifié' : 'a créé'} un contrôle ${where}`,
        refId: c.id,
      });
    });

    missions.forEach(m => {
      const created = new Date(m.created_at).getTime();
      const updated = new Date(m.updated_at).getTime();
      const isUpdate = updated - created > UPDATE_THRESHOLD_MS;
      evs.push({
        id: `m-${m.id}-${isUpdate ? 'u' : 'c'}`,
        agentId: m.agent_id,
        agentName: profileMap[m.agent_id] ?? 'Agent inconnu',
        type: isUpdate ? 'embarkment_updated' : 'embarkment_created',
        timestamp: isUpdate ? m.updated_at : m.created_at,
        summary: `${isUpdate ? 'a modifié' : 'a créé'} la mission ${m.station_name}`,
        refId: m.id,
      });
    });

    return evs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, FEED_LIMIT);
  }, [controls, missions, profileMap]);

  return {
    events,
    isLoading: controlsLoading || missionsLoading,
  };
}

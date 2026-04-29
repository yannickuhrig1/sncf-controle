import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Control = Database['public']['Tables']['controls']['Row'];

export type ActivityEventType =
  | 'control_created' | 'control_updated' | 'control_deleted'
  | 'embarkment_created' | 'embarkment_updated' | 'embarkment_deleted'
  | 'role_change' | 'approve' | 'team_change'
  | 'login' | 'logout';

export interface ActivityEvent {
  id: string;
  agentId: string;       // profiles.id (résolu côté client)
  userId: string | null; // auth.users.id (depuis audit_log.user_id)
  agentName: string;
  type: ActivityEventType;
  timestamp: string;
  summary: string;
  refId: string | null;
  meta: Record<string, any>;
}

interface AuditLogRow {
  id: string;
  created_at: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  meta: Record<string, any>;
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
const UPDATE_THRESHOLD_MS = 60_000;

function buildSummary(action: string, entityType: string, meta: Record<string, any>): string {
  const verb =
    action === 'create' ? 'a créé' :
    action === 'update' ? 'a modifié' :
    action === 'delete' ? 'a supprimé' :
    action === 'login' ? 's\'est connecté' :
    action === 'logout' ? 's\'est déconnecté' :
    action === 'role_change' ? `a changé le rôle de ${meta.profile_name || 'un utilisateur'} (${meta.old_role} → ${meta.new_role})` :
    action === 'approve' ? `a approuvé ${meta.profile_name || 'un utilisateur'}` :
    action === 'team_change' ? `a changé l'équipe de ${meta.profile_name || 'un utilisateur'}` :
    action;

  if (action === 'login' || action === 'logout' || action === 'role_change' || action === 'approve' || action === 'team_change') {
    return verb;
  }

  if (entityType === 'control') {
    const where = meta.train_number
      ? `train ${meta.train_number}`
      : meta.origin && meta.destination
        ? `${meta.origin} → ${meta.destination}`
        : meta.location ?? '';
    return `${verb} un contrôle ${where}`.trim();
  }

  if (entityType === 'embarkment_mission') {
    return `${verb} la mission ${meta.station_name ?? ''}`.trim();
  }

  return `${verb} ${entityType}`;
}

function mapAction(action: string, entityType: string): ActivityEventType {
  if (entityType === 'control') {
    if (action === 'create') return 'control_created';
    if (action === 'update') return 'control_updated';
    if (action === 'delete') return 'control_deleted';
  }
  if (entityType === 'embarkment_mission') {
    if (action === 'create') return 'embarkment_created';
    if (action === 'update') return 'embarkment_updated';
    if (action === 'delete') return 'embarkment_deleted';
  }
  if (entityType === 'profile') {
    if (action === 'role_change') return 'role_change';
    if (action === 'approve') return 'approve';
    if (action === 'team_change') return 'team_change';
  }
  if (action === 'login') return 'login';
  if (action === 'logout') return 'logout';
  return 'control_updated'; // fallback safe
}

export function useActivityFeed() {
  // Profiles for name resolution (and user_id → profile.id mapping)
  const { data: profiles = [] } = useQuery({
    queryKey: ['admin-feed-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const userIdToProfile = useMemo(() => {
    const m: Record<string, { id: string; name: string }> = {};
    profiles.forEach(p => {
      m[p.user_id] = {
        id: p.id,
        name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Agent inconnu',
      };
    });
    return m;
  }, [profiles]);

  // Try the audit_log table first
  const auditQuery = useQuery({
    queryKey: ['admin-feed-audit-log'],
    queryFn: async (): Promise<AuditLogRow[] | null> => {
      const { data, error } = await (supabase as any)
        .from('audit_log')
        .select('id, created_at, user_id, action, entity_type, entity_id, meta')
        .order('created_at', { ascending: false })
        .limit(FEED_LIMIT);
      if (error) {
        // Table absente / RLS -> on remonte null pour déclencher le fallback
        return null;
      }
      return data as AuditLogRow[];
    },
    staleTime: 30 * 1000,
    retry: false,
  });

  const useFallback = auditQuery.data === null || auditQuery.isError;

  // Fallback: derive from controls + embarkment_missions
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
    enabled: useFallback,
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
    enabled: useFallback,
    staleTime: 30 * 1000,
  });

  const events = useMemo<ActivityEvent[]>(() => {
    // Source 1: audit_log if available
    if (!useFallback && auditQuery.data) {
      return auditQuery.data.map(row => {
        const profile = row.user_id ? userIdToProfile[row.user_id] : null;
        return {
          id: row.id,
          agentId: profile?.id ?? '',
          userId: row.user_id,
          agentName: profile?.name ?? 'Agent inconnu',
          type: mapAction(row.action, row.entity_type),
          timestamp: row.created_at,
          summary: buildSummary(row.action, row.entity_type, row.meta || {}),
          refId: row.entity_id,
          meta: row.meta || {},
        };
      });
    }

    // Source 2: derived events (legacy)
    const evs: ActivityEvent[] = [];
    const profileById = Object.fromEntries(profiles.map(p => [p.id, `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()]));

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
        userId: null,
        agentName: profileById[c.agent_id] || 'Agent inconnu',
        type: isUpdate ? 'control_updated' : 'control_created',
        timestamp: isUpdate ? c.updated_at : c.created_at,
        summary: `${isUpdate ? 'a modifié' : 'a créé'} un contrôle ${where}`,
        refId: c.id,
        meta: {},
      });
    });

    missions.forEach(m => {
      const created = new Date(m.created_at).getTime();
      const updated = new Date(m.updated_at).getTime();
      const isUpdate = updated - created > UPDATE_THRESHOLD_MS;
      evs.push({
        id: `m-${m.id}-${isUpdate ? 'u' : 'c'}`,
        agentId: m.agent_id,
        userId: null,
        agentName: profileById[m.agent_id] || 'Agent inconnu',
        type: isUpdate ? 'embarkment_updated' : 'embarkment_created',
        timestamp: isUpdate ? m.updated_at : m.created_at,
        summary: `${isUpdate ? 'a modifié' : 'a créé'} la mission ${m.station_name}`,
        refId: m.id,
        meta: {},
      });
    });

    return evs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, FEED_LIMIT);
  }, [useFallback, auditQuery.data, userIdToProfile, controls, missions, profiles]);

  return {
    events,
    isLoading: useFallback ? (controlsLoading || missionsLoading) : auditQuery.isLoading,
    /** True quand on lit la table audit_log, false quand on tombe sur le fallback dérivé. */
    hasAuditLog: !useFallback,
  };
}

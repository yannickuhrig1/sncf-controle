import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export interface TrainShareSession {
  code: string;
  isOwner: boolean;
  memberCount: number;
}

export function useTrainShareSession(date: string) {
  const { user } = useAuth();
  const storageKey = `train_share_code_${date}`;

  const [session, setSession] = useState<TrainShareSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    if (!user) return;
    const savedCode = localStorage.getItem(storageKey);
    if (!savedCode) return;

    const { data: sess, error: sessErr } = await supabase
      .from('train_share_sessions')
      .select('code, owner_id')
      .eq('code', savedCode)
      .single();

    if (sessErr || !sess) {
      localStorage.removeItem(storageKey);
      setSession(null);
      return;
    }

    const { count } = await supabase
      .from('train_share_members')
      .select('*', { count: 'exact', head: true })
      .eq('code', savedCode);

    setSession({
      code: sess.code,
      isOwner: sess.owner_id === user.id,
      memberCount: count || 0,
    });
  }, [user, storageKey]);

  useEffect(() => {
    setSession(null);
    loadSession();
  }, [loadSession]);

  const createSession = async (): Promise<string | null> => {
    if (!user) return null;
    setIsLoading(true);
    setError(null);

    const code = generateCode();
    const { error: err } = await supabase
      .from('train_share_sessions')
      .insert({ code, owner_id: user.id, date });

    if (err) {
      setError('Erreur lors de la création de la session');
      setIsLoading(false);
      return null;
    }

    localStorage.setItem(storageKey, code);
    setSession({ code, isOwner: true, memberCount: 0 });
    setIsLoading(false);
    return code;
  };

  // Returns the session date on success, false on failure
  const joinSession = async (code: string): Promise<string | false> => {
    if (!user) return false;
    setIsLoading(true);
    setError(null);

    const cleanCode = code.toUpperCase().trim();

    const { data: sess, error: sessErr } = await supabase
      .from('train_share_sessions')
      .select('code, owner_id, date')
      .eq('code', cleanCode)
      .single();

    if (sessErr || !sess) {
      setError('Code invalide ou session expirée');
      setIsLoading(false);
      return false;
    }

    if (sess.owner_id === user.id) {
      setError('Vous êtes déjà le créateur de cette session');
      setIsLoading(false);
      return false;
    }

    const { error: upsertErr } = await supabase
      .from('train_share_members')
      .upsert({ code: cleanCode, user_id: user.id }, { onConflict: 'code,user_id' });

    if (upsertErr) {
      setError("Erreur lors de l'adhésion à la session");
      setIsLoading(false);
      return false;
    }

    const { count } = await supabase
      .from('train_share_members')
      .select('*', { count: 'exact', head: true })
      .eq('code', cleanCode);

    localStorage.setItem(storageKey, cleanCode);
    setSession({ code: cleanCode, isOwner: false, memberCount: count || 0 });
    setIsLoading(false);
    return sess.date;
  };

  const leaveSession = async () => {
    if (!user || !session) return;

    if (session.isOwner) {
      await supabase
        .from('train_share_sessions')
        .delete()
        .eq('code', session.code);
    } else {
      await supabase
        .from('train_share_members')
        .delete()
        .eq('code', session.code)
        .eq('user_id', user.id);
    }

    localStorage.removeItem(storageKey);
    setSession(null);
  };

  const refreshMemberCount = useCallback(async () => {
    if (!session) return;
    const { count } = await supabase
      .from('train_share_members')
      .select('*', { count: 'exact', head: true })
      .eq('code', session.code);
    setSession(prev => prev ? { ...prev, memberCount: count || 0 } : null);
  }, [session?.code]);

  // Realtime: update member count when someone joins/leaves
  useEffect(() => {
    if (!session?.code) return;
    const channel = supabase
      .channel(`share_members_${session.code}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'train_share_members',
        filter: `code=eq.${session.code}`,
      }, () => { refreshMemberCount(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.code, refreshMemberCount]);

  return { session, isLoading, error, setError, createSession, joinSession, leaveSession, refreshMemberCount };
}

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

    // Verify session still exists
    const { data: sess } = await supabase
      .from('train_share_sessions' as any)
      .select('code, owner_id')
      .eq('code', savedCode)
      .single();

    if (!sess) {
      localStorage.removeItem(storageKey);
      setSession(null);
      return;
    }

    const { count } = await supabase
      .from('train_share_members' as any)
      .select('*', { count: 'exact', head: true })
      .eq('code', savedCode);

    setSession({
      code: (sess as any).code,
      isOwner: (sess as any).owner_id === user.id,
      memberCount: count || 0,
    });
  }, [user, storageKey]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const createSession = async (): Promise<string | null> => {
    if (!user) return null;
    setIsLoading(true);
    setError(null);

    const code = generateCode();

    const { error: err } = await supabase
      .from('train_share_sessions' as any)
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

  const joinSession = async (code: string): Promise<boolean> => {
    if (!user) return false;
    setIsLoading(true);
    setError(null);

    const cleanCode = code.toUpperCase().trim();

    // Verify session exists
    const { data: sess } = await supabase
      .from('train_share_sessions' as any)
      .select('code, owner_id, date')
      .eq('code', cleanCode)
      .single();

    if (!sess) {
      setError('Code invalide ou session expirée');
      setIsLoading(false);
      return false;
    }

    if ((sess as any).owner_id === user.id) {
      setError('Vous êtes déjà le créateur de cette session');
      setIsLoading(false);
      return false;
    }

    // Insert member (ignore duplicate)
    await supabase
      .from('train_share_members' as any)
      .upsert({ code: cleanCode, user_id: user.id }, { onConflict: 'code,user_id' });

    const { count } = await supabase
      .from('train_share_members' as any)
      .select('*', { count: 'exact', head: true })
      .eq('code', cleanCode);

    localStorage.setItem(storageKey, cleanCode);
    setSession({ code: cleanCode, isOwner: false, memberCount: count || 0 });
    setIsLoading(false);
    return true;
  };

  const leaveSession = async () => {
    if (!user || !session) return;

    if (session.isOwner) {
      // Delete session (cascade deletes members + nullifies daily_trains.share_code)
      await supabase
        .from('train_share_sessions' as any)
        .delete()
        .eq('code', session.code);
    } else {
      await supabase
        .from('train_share_members' as any)
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
      .from('train_share_members' as any)
      .select('*', { count: 'exact', head: true })
      .eq('code', session.code);
    setSession(prev => prev ? { ...prev, memberCount: count || 0 } : null);
  }, [session?.code]);

  return { session, isLoading, error, setError, createSession, joinSession, leaveSession, refreshMemberCount };
}

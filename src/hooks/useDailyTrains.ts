import { useState, useEffect, useCallback } from 'react';
import type { TrainInfo } from './useTrainLookup';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface DailyTrain {
  trainNumber: string;
  trainInfo?: TrainInfo;
}

export function useDailyTrains(date: string, shareCode?: string | null) {
  const { user } = useAuth();
  const key = `daily_trains_${date}`;

  const [trains, setTrains] = useState<DailyTrain[]>(() => {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch { return []; }
  });
  const [isSharing, setIsSharing] = useState(false);
  const [teamTrains, setTeamTrains] = useState<DailyTrain[]>([]);

  const fetchFromDb = useCallback(async () => {
    if (!user) return;

    // Own trains
    const { data: own } = await supabase
      .from('daily_trains' as any)
      .select('train_number, train_info, shared')
      .eq('user_id', user.id)
      .eq('date', date)
      .order('created_at');

    if (own) {
      const fetched: DailyTrain[] = (own as any[]).map(r => ({
        trainNumber: r.train_number,
        trainInfo: r.train_info ?? undefined,
      }));
      setTrains(fetched);
      localStorage.setItem(key, JSON.stringify(fetched));
      setIsSharing((own as any[]).some(r => r.shared));
    }

    // Team trains (shared via same code session, deduplicated)
    if (!shareCode) {
      setTeamTrains([]);
      return;
    }

    const { data: team } = await supabase
      .from('daily_trains' as any)
      .select('train_number, train_info')
      .eq('date', date)
      .eq('shared', true)
      .eq('share_code', shareCode)
      .neq('user_id', user.id);

    if (team) {
      const seen = new Set<string>();
      const deduped: DailyTrain[] = [];
      for (const r of team as any[]) {
        if (!seen.has(r.train_number)) {
          seen.add(r.train_number);
          deduped.push({ trainNumber: r.train_number, trainInfo: r.train_info ?? undefined });
        }
      }
      setTeamTrains(deduped);
    }
  }, [user, date, key, shareCode]);

  // On date / user / shareCode change: show localStorage immediately, then sync
  useEffect(() => {
    try { setTrains(JSON.parse(localStorage.getItem(key) || '[]')); }
    catch { setTrains([]); }
    setTeamTrains([]);
    setIsSharing(false);
    fetchFromDb();
  }, [date, user?.id, shareCode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime: refresh on any change
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`daily_trains_${user.id}_${date}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'daily_trains',
      }, () => { fetchFromDb(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, date, fetchFromDb]);

  const addTrain = (trainNumber: string, trainInfo?: TrainInfo) => {
    setTrains(prev => {
      const idx = prev.findIndex(t => t.trainNumber === trainNumber);
      const entry: DailyTrain = { trainNumber, trainInfo };
      const updated = idx >= 0
        ? prev.map((t, i) => i === idx ? entry : t)
        : [...prev, entry];
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    });
    if (user) {
      supabase.from('daily_trains' as any).upsert({
        user_id: user.id,
        date,
        train_number: trainNumber,
        train_info: trainInfo ?? null,
        shared: isSharing,
        share_code: shareCode ?? null,
      }, { onConflict: 'user_id,date,train_number' }).then(() => {});
    }
  };

  const updateTrain = (trainNumber: string, updates: { origin?: string; destination?: string }) => {
    setTrains(prev => {
      const updated = prev.map(t => {
        if (t.trainNumber !== trainNumber) return t;
        const newInfo = { ...(t.trainInfo ?? {}), ...updates } as TrainInfo;
        if (user) {
          supabase.from('daily_trains' as any)
            .update({ train_info: newInfo })
            .eq('user_id', user.id)
            .eq('date', date)
            .eq('train_number', trainNumber)
            .then(() => {});
        }
        return { ...t, trainInfo: newInfo };
      });
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    });
  };

  const removeTrain = (trainNumber: string) => {
    setTrains(prev => {
      const updated = prev.filter(t => t.trainNumber !== trainNumber);
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    });
    if (user) {
      supabase.from('daily_trains' as any)
        .delete()
        .eq('user_id', user.id)
        .eq('date', date)
        .eq('train_number', trainNumber)
        .then(() => {});
    }
  };

  const toggleSharing = () => {
    if (!user) return;
    const next = !isSharing;
    setIsSharing(next);
    // Update all trains for this day
    supabase.from('daily_trains' as any)
      .update({ shared: next, share_code: next ? (shareCode ?? null) : null })
      .eq('user_id', user.id)
      .eq('date', date)
      .then(() => {});
  };

  // Apply shareCode to existing trains when joining/creating a session
  // Always enable sharing when a code is provided
  const applyShareCode = (code: string | null) => {
    if (!user) return;
    const shouldShare = code !== null;
    if (shouldShare) setIsSharing(true);
    supabase.from('daily_trains' as any)
      .update({ share_code: code, shared: shouldShare })
      .eq('user_id', user.id)
      .eq('date', date)
      .then(() => {});
  };

  return { trains, addTrain, updateTrain, removeTrain, isSharing, toggleSharing, teamTrains, applyShareCode };
}

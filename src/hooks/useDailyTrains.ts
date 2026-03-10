import { useState, useEffect, useCallback } from 'react';
import type { TrainInfo } from './useTrainLookup';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface DailyTrain {
  trainNumber: string;
  trainInfo?: TrainInfo;
}

export function useDailyTrains(date: string) {
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

    // Team trains (shared by other users, deduplicated)
    const { data: team } = await supabase
      .from('daily_trains' as any)
      .select('train_number, train_info')
      .eq('date', date)
      .eq('shared', true)
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
  }, [user, date, key]);

  // On date / user change: show localStorage immediately, then sync
  useEffect(() => {
    try { setTrains(JSON.parse(localStorage.getItem(key) || '[]')); }
    catch { setTrains([]); }
    setTeamTrains([]);
    setIsSharing(false);
    fetchFromDb();
  }, [date, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime: refresh on any change for today
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
      }, { onConflict: 'user_id,date,train_number' }).then(() => {});
    }
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
    supabase.from('daily_trains' as any)
      .update({ shared: next })
      .eq('user_id', user.id)
      .eq('date', date)
      .then(() => {});
  };

  return { trains, addTrain, removeTrain, isSharing, toggleSharing, teamTrains };
}

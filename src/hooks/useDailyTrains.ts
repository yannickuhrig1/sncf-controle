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

  // Fetch from Supabase and update local state + localStorage cache
  const fetchFromDb = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('daily_trains' as any)
      .select('train_number, train_info')
      .eq('user_id', user.id)
      .eq('date', date)
      .order('created_at');
    if (data) {
      const fetched: DailyTrain[] = (data as any[]).map(r => ({
        trainNumber: r.train_number,
        trainInfo: r.train_info ?? undefined,
      }));
      setTrains(fetched);
      localStorage.setItem(key, JSON.stringify(fetched));
    }
  }, [user, date, key]);

  // On date or user change: show localStorage immediately, then sync from DB
  useEffect(() => {
    try { setTrains(JSON.parse(localStorage.getItem(key) || '[]')); }
    catch { setTrains([]); }
    fetchFromDb();
  }, [date, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime: refresh when any row changes for this user
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`daily_trains_${user.id}_${date}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'daily_trains',
        filter: `user_id=eq.${user.id}`,
      }, () => { fetchFromDb(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, date, fetchFromDb]);

  const addTrain = (trainNumber: string, trainInfo?: TrainInfo) => {
    // Optimistic local update
    setTrains(prev => {
      const idx = prev.findIndex(t => t.trainNumber === trainNumber);
      const entry: DailyTrain = { trainNumber, trainInfo };
      const updated = idx >= 0
        ? prev.map((t, i) => i === idx ? entry : t)
        : [...prev, entry];
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    });
    // Persist to Supabase (fire and forget)
    if (user) {
      supabase.from('daily_trains' as any).upsert({
        user_id: user.id,
        date,
        train_number: trainNumber,
        train_info: trainInfo ?? null,
      }, { onConflict: 'user_id,date,train_number' }).then(() => {});
    }
  };

  const removeTrain = (trainNumber: string) => {
    // Optimistic local update
    setTrains(prev => {
      const updated = prev.filter(t => t.trainNumber !== trainNumber);
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    });
    // Delete from Supabase (fire and forget)
    if (user) {
      supabase.from('daily_trains' as any)
        .delete()
        .eq('user_id', user.id)
        .eq('date', date)
        .eq('train_number', trainNumber)
        .then(() => {});
    }
  };

  return { trains, addTrain, removeTrain };
}

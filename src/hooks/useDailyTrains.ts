import { useState, useEffect } from 'react';
import type { TrainInfo } from './useTrainLookup';

export interface DailyTrain {
  trainNumber: string;
  trainInfo?: TrainInfo;
}

export function useDailyTrains(date: string) {
  const key = `daily_trains_${date}`;

  const [trains, setTrains] = useState<DailyTrain[]>(() => {
    try { return JSON.parse(localStorage.getItem(`daily_trains_${date}`) || '[]'); }
    catch { return []; }
  });

  // Reload when date changes
  useEffect(() => {
    try { setTrains(JSON.parse(localStorage.getItem(`daily_trains_${date}`) || '[]')); }
    catch { setTrains([]); }
  }, [date]);

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
  };

  const removeTrain = (trainNumber: string) => {
    setTrains(prev => {
      const updated = prev.filter(t => t.trainNumber !== trainNumber);
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    });
  };

  return { trains, addTrain, removeTrain };
}

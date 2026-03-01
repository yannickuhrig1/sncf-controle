import { useState } from 'react';

export interface DepartureEntry {
  trainNumber: string;
  direction:   string;
  scheduledTime: string;   // HH:MM théorique
  realTime:      string;   // HH:MM temps réel
  delayMinutes:  number;
  status:        'on_time' | 'delayed' | 'cancelled';
  trainType?:    string;
  platform?:     string;
}

function parseNavitiaTime(dt: string | undefined): string {
  if (!dt || dt.length < 13) return '';
  // format Navitia : 20240301T081500
  const h = parseInt(dt.slice(9, 11)) % 24;
  const m = dt.slice(11, 13);
  return `${String(h).padStart(2, '0')}:${m}`;
}

function diffMinutes(real: string, base: string): number {
  if (!real || !base || real.length < 13 || base.length < 13) return 0;
  const rMin = parseInt(real.slice(9, 11))  * 60 + parseInt(real.slice(11, 13));
  const bMin = parseInt(base.slice(9, 11))  * 60 + parseInt(base.slice(11, 13));
  return Math.max(0, rMin - bMin);
}

/* Formate une date YYYY-MM-DD + heure HH:MM en chaîne Navitia YYYYMMDDTHHMMSS */
export function toNavitiaDatetime(date: string, time: string): string {
  return date.replace(/-/g, '') + 'T' + time.replace(':', '') + '00';
}

export function useStationDepartures() {
  const [isLoading,   setIsLoading]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [departures,  setDepartures]  = useState<DepartureEntry[]>([]);
  const [stationName, setStationName] = useState('');

  const fetchDepartures = async (station: string, datetime?: string) => {
    if (!station.trim()) return;
    setIsLoading(true);
    setError(null);
    setDepartures([]);

    try {
      const params = new URLSearchParams({ station: station.trim() });
      if (datetime) params.set('datetime', datetime);

      const res = await fetch(`/api/sncf-departures?${params}`);
      if (res.status === 503) throw new Error('Token SNCF non configuré sur le serveur');
      if (res.status === 404) throw new Error('Gare introuvable dans Navitia');
      if (!res.ok)            throw new Error(`Erreur API (${res.status})`);

      const json = await res.json();
      setStationName(json.stationName || station);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const deps: DepartureEntry[] = (json.departures as any[]).map(d => {
        const info = d.display_informations ?? {};
        const sdt  = d.stop_date_time       ?? {};

        const scheduled = sdt.base_departure_date_time ?? sdt.departure_date_time ?? '';
        const real      = sdt.departure_date_time      ?? scheduled;
        const delay     = diffMinutes(real, scheduled);

        const addInfo: string[] = sdt.additional_informations ?? [];
        let status: DepartureEntry['status'] = delay > 0 ? 'delayed' : 'on_time';
        if (addInfo.some((s: string) => /deleted|cancel|supprim/i.test(s))) status = 'cancelled';

        return {
          trainNumber:   info.headsign       ?? '',
          direction:     info.direction      ?? '',
          scheduledTime: parseNavitiaTime(scheduled),
          realTime:      parseNavitiaTime(real),
          delayMinutes:  delay,
          status,
          trainType:     info.commercial_mode || info.name || undefined,
          platform:      d.stop_point?.platform_code || undefined,
        } satisfies DepartureEntry;
      }).filter(d => d.trainNumber);

      setDepartures(deps);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => { setDepartures([]); setError(null); setStationName(''); };

  return { fetchDepartures, isLoading, error, departures, stationName, reset };
}

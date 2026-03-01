import { useState } from 'react';

export type TrainStatus = 'on_time' | 'delayed' | 'cancelled' | 'unknown';

export interface TrainStop {
  name: string;
  departureTime: string;   // HH:MM (réel si dispo)
  arrivalTime?: string;    // HH:MM
  platform?: string;       // Voie/quai
  isDelayed: boolean;
  delayMinutes?: number;
}

export interface TrainInfo {
  // Trajet
  origin: string;
  destination: string;
  departureTime: string;    // HH:MM 1ère gare
  arrivalTime?: string;     // HH:MM dernière gare
  journeyDuration?: number; // en minutes
  stops: TrainStop[];       // Toutes les gares
  // Type
  trainType?: string;       // "TGV", "TER", "Intercités", "OUIGO"…
  trainNumber?: string;     // Numéro officiel
  operator?: string;        // "SNCF", "OUIGO"…
  // Statut
  status: TrainStatus;
  delayMinutes?: number;
  disruptionReason?: string;
}

const SNCF_API_BASE = 'https://api.sncf.com/v1/coverage/sncf';

function toApiDate(dateStr: string): string {
  return dateStr.replace(/-/g, '') + 'T000000';
}

function parseHHMMSS(hhmmss: string | undefined): string {
  if (!hhmmss || hhmmss.length < 4) return '';
  // Navitia encode les trains après minuit > 24h (ex: "250000" = 01:00 le lendemain)
  const h = Math.floor(parseInt(hhmmss.slice(0, 2))) % 24;
  const m = hhmmss.slice(2, 4);
  return `${String(h).padStart(2, '0')}:${m}`;
}

function toMinutes(hhmmss: string): number {
  return parseInt(hhmmss.slice(0, 2)) * 60 + parseInt(hhmmss.slice(2, 4));
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

function cleanStationName(name: string): string {
  return name.replace(/\s*\([^)]*\)/, '').trim();
}

function extractTrainNumber(raw: string): string {
  const match = raw.trim().match(/\d+/);
  return match ? match[0] : raw.trim();
}

export { formatDuration };

export function useTrainLookup() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [trainInfo, setTrainInfo] = useState<TrainInfo | null>(null);

  const getToken = (): string => localStorage.getItem('sncf_api_token') || '';

  const lookup = async (trainNumber: string, date: string): Promise<TrainInfo | null> => {
    const token = getToken();
    if (!token) {
      setError('Token SNCF manquant. Configurez-le dans Administration → Intégrations.');
      return null;
    }

    const headsign = extractTrainNumber(trainNumber);
    if (!headsign) return null;

    setIsLoading(true);
    setError(null);
    setTrainInfo(null);

    try {
      const since   = toApiDate(date);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      const until = nextDay.toISOString().split('T')[0].replace(/-/g, '') + 'T000000';

      const url =
        `${SNCF_API_BASE}/vehicle_journeys` +
        `?headsign=${encodeURIComponent(headsign)}` +
        `&since=${since}&until=${until}` +
        `&data_freshness=realtime` +
        `&depth=2` +
        `&count=1`;

      const res = await fetch(url, {
        headers: { Authorization: 'Basic ' + btoa(token + ':') },
      });

      if (res.status === 401) throw new Error('Token SNCF invalide');
      if (res.status === 404) throw new Error('Train introuvable');
      if (!res.ok)            throw new Error(`Erreur API SNCF (${res.status})`);

      const json = await res.json();

      // ── Vehicle journey ────────────────────────────────────────────────────
      const journey = json.vehicle_journeys?.[0];
      if (!journey) {
        setError('Train introuvable pour cette date');
        return null;
      }

      // ── Stops ──────────────────────────────────────────────────────────────
      const rawStops: {
        stop_point?:          { name?: string; platform_code?: string };
        departure_time?:      string;
        arrival_time?:        string;
        base_departure_time?: string;
        departure_status?:    string;
      }[] = journey.stop_times || [];

      if (rawStops.length < 2) {
        setError('Données de trajet incomplètes');
        return null;
      }

      const stops: TrainStop[] = rawStops.map(s => {
        const isDelayed = s.departure_status === 'delayed';
        let delayMinutes: number | undefined;
        if (isDelayed && s.base_departure_time && s.departure_time) {
          const d = toMinutes(s.departure_time) - toMinutes(s.base_departure_time);
          if (d > 0) delayMinutes = d;
        }
        return {
          name:          cleanStationName(s.stop_point?.name || ''),
          departureTime: parseHHMMSS(s.departure_time),
          arrivalTime:   parseHHMMSS(s.arrival_time),
          platform:      s.stop_point?.platform_code || undefined,
          isDelayed,
          delayMinutes,
        };
      });

      // ── Journey duration ───────────────────────────────────────────────────
      let journeyDuration: number | undefined;
      const firstDep  = rawStops[0].departure_time;
      const lastArr   = rawStops[rawStops.length - 1].arrival_time || rawStops[rawStops.length - 1].departure_time;
      if (firstDep && lastArr) {
        const diff = toMinutes(lastArr) - toMinutes(firstDep);
        if (diff > 0) journeyDuration = diff;
      }

      // ── Train type & operator ──────────────────────────────────────────────
      const commercialModes: { name?: string }[] = journey.commercial_modes || [];
      const physicalModes:   { name?: string }[] = journey.physical_modes   || [];
      const networks:        { name?: string }[] = journey.networks         || [];
      const trainType = commercialModes[0]?.name || physicalModes[0]?.name;
      const operator  = networks[0]?.name;

      // ── Status ─────────────────────────────────────────────────────────────
      let status: TrainStatus = 'on_time';
      let delayMinutes: number | undefined;
      let disruptionReason: string | undefined;

      const disruptions: {
        severity?: { effect?: string };
        messages?: { text?: string }[];
      }[] = json.disruptions || [];

      if (disruptions.length > 0) {
        const d      = disruptions[0];
        const effect = d.severity?.effect;
        if (effect === 'NO_SERVICE')                                       status = 'cancelled';
        else if (effect === 'SIGNIFICANT_DELAYS' || effect === 'REDUCED_SERVICE') status = 'delayed';
        disruptionReason = d.messages?.[0]?.text;
      }

      const firstDelayed = stops.find(s => s.isDelayed);
      if (status === 'on_time' && firstDelayed) {
        status       = 'delayed';
        delayMinutes = firstDelayed.delayMinutes;
      }
      if (status === 'delayed' && !delayMinutes) delayMinutes = stops[0].delayMinutes;

      const info: TrainInfo = {
        origin:           stops[0].name,
        destination:      stops[stops.length - 1].name,
        departureTime:    stops[0].departureTime,
        arrivalTime:      stops[stops.length - 1].arrivalTime || stops[stops.length - 1].departureTime,
        journeyDuration,
        stops,
        trainType,
        trainNumber:      journey.headsign || headsign,
        operator,
        status,
        delayMinutes,
        disruptionReason,
      };

      setTrainInfo(info);
      return info;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => { setTrainInfo(null); setError(null); };

  return { lookup, isLoading, error, trainInfo, reset };
}

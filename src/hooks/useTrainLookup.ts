import { useState } from 'react';

export type TrainStatus = 'on_time' | 'delayed' | 'cancelled' | 'unknown';

export interface TrainStop {
  name: string;
  departureTime: string;  // HH:MM (temps réel si dispo)
  arrivalTime?: string;   // HH:MM
  isDelayed: boolean;
  delayMinutes?: number;
}

export interface TrainInfo {
  // Trajet
  origin: string;
  destination: string;
  departureTime: string;   // HH:MM depuis la 1ère gare
  stops: TrainStop[];      // Toutes les gares du train
  // Type
  trainType?: string;      // "TGV", "TER", "Intercités", "OUIGO"…
  trainNumber?: string;    // Numéro officiel (headsign)
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
  // Navitia encodes times > 24h as "250000" for trains arriving next day
  const h = Math.floor(parseInt(hhmmss.slice(0, 2))) % 24;
  const m = hhmmss.slice(2, 4);
  return `${String(h).padStart(2, '0')}:${m}`;
}

function cleanStationName(name: string): string {
  return name.replace(/\s*\([^)]*\)/, '').trim();
}

function extractTrainNumber(raw: string): string {
  const match = raw.trim().match(/\d+/);
  return match ? match[0] : raw.trim();
}

function toMinutes(hhmmss: string): number {
  return parseInt(hhmmss.slice(0, 2)) * 60 + parseInt(hhmmss.slice(2, 4));
}

export function useTrainLookup() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [trainInfo, setTrainInfo] = useState<TrainInfo | null>(null);

  const getToken = (): string => localStorage.getItem('sncf_api_token') || '';

  const lookup = async (trainNumber: string, date: string): Promise<TrainInfo | null> => {
    const token = getToken();
    if (!token) {
      setError('Token SNCF manquant. Configurez-le dans Paramètres → Intégrations.');
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
        `&depth=2` +          // Include physical_modes, commercial_modes
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
        stop_point?:            { name?: string };
        departure_time?:        string;
        arrival_time?:          string;
        base_departure_time?:   string;
        departure_status?:      string;
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
          isDelayed,
          delayMinutes,
        };
      });

      // ── Train type ─────────────────────────────────────────────────────────
      const commercialModes: { name?: string }[] = journey.commercial_modes || [];
      const physicalModes:   { name?: string }[] = journey.physical_modes   || [];
      const trainType = commercialModes[0]?.name || physicalModes[0]?.name;

      // ── Status ─────────────────────────────────────────────────────────────
      let status: TrainStatus = 'on_time';
      let delayMinutes: number | undefined;
      let disruptionReason: string | undefined;

      const disruptions: {
        severity?:  { effect?: string };
        messages?:  { text?: string }[];
      }[] = json.disruptions || [];

      if (disruptions.length > 0) {
        const d      = disruptions[0];
        const effect = d.severity?.effect;
        if (effect === 'NO_SERVICE') {
          status = 'cancelled';
        } else if (effect === 'SIGNIFICANT_DELAYS' || effect === 'REDUCED_SERVICE') {
          status = 'delayed';
        }
        disruptionReason = d.messages?.[0]?.text;
      }

      // Also check stop-level delays
      const firstDelayed = stops.find(s => s.isDelayed);
      if (status === 'on_time' && firstDelayed) {
        status = 'delayed';
        delayMinutes = firstDelayed.delayMinutes;
      }

      if (status === 'delayed' && !delayMinutes) {
        delayMinutes = stops[0].delayMinutes;
      }

      const info: TrainInfo = {
        origin:           stops[0].name,
        destination:      stops[stops.length - 1].name,
        departureTime:    stops[0].departureTime,
        stops,
        trainType,
        trainNumber:      journey.headsign || headsign,
        status,
        delayMinutes,
        disruptionReason,
      };

      setTrainInfo(info);
      return info;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setTrainInfo(null);
    setError(null);
  };

  return { lookup, isLoading, error, trainInfo, reset };
}

import { useState } from 'react';

export type TrainStatus = 'on_time' | 'delayed' | 'cancelled' | 'unknown';

export interface TrainInfo {
  origin: string;
  destination: string;
  departureTime: string; // HH:MM
  status: TrainStatus;
  delayMinutes?: number;
}

const SNCF_API_BASE = 'https://api.sncf.com/v1/coverage/sncf';

function toApiDate(dateStr: string): string {
  // "2026-03-01" → "20260301T000000"
  return dateStr.replace(/-/g, '') + 'T000000';
}

function parseHHMMSS(hhmmss: string): string {
  // "083000" → "08:30"
  if (!hhmmss || hhmmss.length < 4) return '';
  return hhmmss.slice(0, 2) + ':' + hhmmss.slice(2, 4);
}

function cleanStationName(name: string): string {
  // "Paris Montparnasse (Paris)" → "Paris Montparnasse"
  return name.replace(/\s*\([^)]*\)/, '').trim();
}

// Extract numeric part from train number: "TGV 6201" or "tgv6201" → "6201"
function extractTrainNumber(raw: string): string {
  const match = raw.trim().match(/\d+/);
  return match ? match[0] : raw.trim();
}

export function useTrainLookup() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trainInfo, setTrainInfo] = useState<TrainInfo | null>(null);

  const getToken = (): string => localStorage.getItem('sncf_api_token') || '';

  const lookup = async (trainNumber: string, date: string): Promise<TrainInfo | null> => {
    const token = getToken();
    if (!token) {
      setError('Token SNCF manquant. Configurez-le dans les Paramètres.');
      return null;
    }

    const headsign = extractTrainNumber(trainNumber);
    if (!headsign) return null;

    setIsLoading(true);
    setError(null);
    setTrainInfo(null);

    try {
      const since = toApiDate(date);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      const until = nextDay.toISOString().split('T')[0].replace(/-/g, '') + 'T000000';

      const url =
        `${SNCF_API_BASE}/vehicle_journeys` +
        `?headsign=${encodeURIComponent(headsign)}` +
        `&since=${since}&until=${until}` +
        `&data_freshness=realtime&count=1`;

      const res = await fetch(url, {
        headers: { Authorization: 'Basic ' + btoa(token + ':') },
      });

      if (res.status === 401) throw new Error('Token SNCF invalide');
      if (res.status === 404) throw new Error('Train introuvable');
      if (!res.ok) throw new Error(`Erreur API SNCF (${res.status})`);

      const json = await res.json();
      const journey = json.vehicle_journeys?.[0];
      if (!journey) {
        setError('Train introuvable pour cette date');
        return null;
      }

      const stops: {
        stop_point?: { name?: string };
        departure_time?: string;
        base_departure_time?: string;
        departure_status?: string;
      }[] = journey.stop_times || [];

      if (stops.length < 2) {
        setError('Données de trajet incomplètes');
        return null;
      }

      const first = stops[0];
      const last  = stops[stops.length - 1];

      // Determine status
      let status: TrainStatus = 'on_time';
      let delayMinutes: number | undefined;

      const disruptions: { severity?: { effect?: string } }[] = json.disruptions || [];
      if (disruptions.length > 0) {
        const effect = disruptions[0].severity?.effect;
        if (effect === 'NO_SERVICE') {
          status = 'cancelled';
        } else if (effect === 'SIGNIFICANT_DELAYS' || effect === 'REDUCED_SERVICE') {
          status = 'delayed';
        }
      }

      // Check stop-level delay
      const hasDelay = stops.some(s => s.departure_status === 'delayed');
      if (status === 'on_time' && hasDelay) status = 'delayed';

      // Calculate delay in minutes from base vs realtime departure
      if (status === 'delayed' && first.base_departure_time && first.departure_time) {
        const toMin = (t: string) => parseInt(t.slice(0, 2)) * 60 + parseInt(t.slice(2, 4));
        delayMinutes = toMin(first.departure_time) - toMin(first.base_departure_time);
        if (delayMinutes < 0) delayMinutes = undefined;
      }

      const info: TrainInfo = {
        origin:        cleanStationName(first.stop_point?.name || ''),
        destination:   cleanStationName(last.stop_point?.name  || ''),
        departureTime: parseHHMMSS(first.departure_time || ''),
        status,
        delayMinutes,
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

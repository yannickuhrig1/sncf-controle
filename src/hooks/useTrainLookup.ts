import { useState } from 'react';

export type TrainStatus = 'on_time' | 'delayed' | 'cancelled' | 'unknown';

export interface TrainStop {
  name: string;
  departureTime: string;   // HH:MM (réel si dispo)
  arrivalTime?: string;    // HH:MM
  baseDepartureTime?: string; // HH:MM (horaire théorique, si retard)
  baseArrivalTime?: string;   // HH:MM (horaire théorique, si retard)
  platform?: string;       // Voie/quai
  isDelayed: boolean;
  delayMinutes?: number;
}

export interface TrainComposition {
  carriages: number;
  classes: string[];
  formation: string | null;
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
  // Occupation
  occupancy?: string;       // Libellé FR de l'occupation si fourni
  // Composition (enrichi par HAFAS)
  composition?: TrainComposition;
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

export { formatDuration };

/** Enrichit les stops Navitia avec les voies HAFAS (DB) et récupère la composition */
async function enrichWithHafas(
  trainNumber: string,
  date: string,
  stops: TrainStop[],
): Promise<{ stops: TrainStop[]; composition?: TrainComposition }> {
  try {
    const res = await fetch(
      `/api/hafas-trip?trainNumber=${encodeURIComponent(trainNumber)}&date=${encodeURIComponent(date)}`
    );
    if (!res.ok) return { stops };
    const data = await res.json();
    if (!data.found || !data.stops?.length) return { stops };

    // Normalise pour le matching (lowercase, sans accents, sans suffixes)
    const norm = (s: string) =>
      s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        .replace(/\s*-\s*ville$/, '').replace(/-/g, ' ').trim();

    // Build a map from HAFAS stop name → platform info
    const hafasMap = new Map<string, { dPlatform: string | null; aPlatform: string | null }>();
    for (const hs of data.stops) {
      if (!hs.name) continue;
      hafasMap.set(norm(hs.name), {
        dPlatform: hs.departurePlatform,
        aPlatform: hs.arrivalPlatform,
      });
    }

    // Enrich Navitia stops with HAFAS platform data (only if Navitia platform is missing)
    const enrichedStops = stops.map(stop => {
      if (stop.platform) return stop; // Navitia already has platform
      const hafas = hafasMap.get(norm(stop.name));
      if (!hafas) return stop;
      const platform = hafas.dPlatform || hafas.aPlatform;
      return platform ? { ...stop, platform } : stop;
    });

    return {
      stops: enrichedStops,
      composition: data.composition ?? undefined,
    };
  } catch {
    // HAFAS enrichment is optional — don't fail the lookup
    return { stops };
  }
}

export function useTrainLookup() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [trainInfo, setTrainInfo] = useState<TrainInfo | null>(null);

  const lookup = async (trainNumber: string, date: string): Promise<TrainInfo | null> => {
    if (!trainNumber.trim()) return null;

    setIsLoading(true);
    setError(null);
    setTrainInfo(null);

    try {
      const res = await fetch(
        `/api/sncf-lookup?trainNumber=${encodeURIComponent(trainNumber.trim())}&date=${encodeURIComponent(date)}`
      );

      if (res.status === 503) throw new Error('Token SNCF non configuré sur le serveur');
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
        base_arrival_time?:   string;
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
        const baseDep = isDelayed && s.base_departure_time ? parseHHMMSS(s.base_departure_time) : undefined;
        const baseArr = isDelayed && s.base_arrival_time ? parseHHMMSS(s.base_arrival_time) : undefined;
        return {
          name:          cleanStationName(s.stop_point?.name || ''),
          departureTime: parseHHMMSS(s.departure_time),
          arrivalTime:   parseHHMMSS(s.arrival_time),
          baseDepartureTime: baseDep && baseDep !== parseHHMMSS(s.departure_time) ? baseDep : undefined,
          baseArrivalTime:   baseArr && baseArr !== parseHHMMSS(s.arrival_time) ? baseArr : undefined,
          platform:      s.stop_point?.platform_code || undefined,
          isDelayed,
          delayMinutes,
        };
      });

      // ── Journey duration ───────────────────────────────────────────────────
      let journeyDuration: number | undefined;
      const firstDep = rawStops[0].departure_time;
      const lastArr  = rawStops[rawStops.length - 1].arrival_time || rawStops[rawStops.length - 1].departure_time;
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
        impacted_objects?: {
          impacted_stops?: {
            departure_status?: string;
            amended_departure_time?: string;
            base_departure_time?: string;
          }[];
        }[];
      }[] = json.disruptions || [];

      if (disruptions.length > 0) {
        const d      = disruptions[0];
        const effect = d.severity?.effect;
        if (effect === 'NO_SERVICE')                                              status = 'cancelled';
        else if (effect === 'SIGNIFICANT_DELAYS' || effect === 'REDUCED_SERVICE') status = 'delayed';
        disruptionReason = d.messages?.[0]?.text;

        // Essayer d'extraire le retard depuis impacted_stops de la perturbation
        if (!delayMinutes) {
          const impactedStops = d.impacted_objects?.[0]?.impacted_stops ?? [];
          const delayedStop = impactedStops.find(s => s.departure_status === 'delayed');
          if (delayedStop?.amended_departure_time && delayedStop?.base_departure_time) {
            const diff = toMinutes(delayedStop.amended_departure_time) - toMinutes(delayedStop.base_departure_time);
            if (diff > 0) delayMinutes = diff;
          }
        }
      }

      const firstDelayed = stops.find(s => s.isDelayed);
      if (status === 'on_time' && firstDelayed) {
        status       = 'delayed';
        delayMinutes = firstDelayed.delayMinutes;
      }
      if (status === 'delayed' && !delayMinutes) delayMinutes = stops[0].delayMinutes;

      // ── Occupancy ──────────────────────────────────────────────────────────
      const OCCUPANCY_LABELS: Record<string, string> = {
        empty:                      'Vide',
        many_seats_available:       'Places disponibles',
        few_seats_available:        'Peu de places',
        standing_room_only:         'Debout seulement',
        crushed_standing_room_only: 'Bondé',
        not_accepting_passengers:   'Accès refusé',
      };
      const rawOccupancy: string | undefined = journey.occupancies?.[0]?.occupancy ?? journey.occupancy;
      const occupancy = rawOccupancy ? (OCCUPANCY_LABELS[rawOccupancy] ?? rawOccupancy) : undefined;

      // ── HAFAS enrichment (platforms + composition) ─────────────────────
      const resolvedTrainNumber = journey.headsign || trainNumber.trim();
      const hafas = await enrichWithHafas(resolvedTrainNumber, date, stops);

      const info: TrainInfo = {
        origin:        hafas.stops[0].name,
        destination:   hafas.stops[hafas.stops.length - 1].name,
        departureTime: hafas.stops[0].departureTime,
        arrivalTime:   hafas.stops[hafas.stops.length - 1].arrivalTime || hafas.stops[hafas.stops.length - 1].departureTime,
        journeyDuration,
        stops: hafas.stops,
        trainType,
        trainNumber:   resolvedTrainNumber,
        operator,
        status,
        delayMinutes,
        disruptionReason,
        occupancy,
        composition:   hafas.composition,
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

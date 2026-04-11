export const config = { runtime: 'edge' };

// Navitia stop_times uses HHMMSS format (6 chars), hours can exceed 23 for overnight
function parseStopTime(t: string | undefined): string {
  if (!t || t.length < 6) return '';
  const h = parseInt(t.slice(0, 2)) % 24;
  const m = t.slice(2, 4);
  return `${String(h).padStart(2, '0')}:${m}`;
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const id  = url.searchParams.get('id');

  const token = process.env.SNCF_API_TOKEN;
  if (!token) return Response.json({ error: 'Token non configuré' }, { status: 503 });
  if (!id)    return Response.json({ error: 'id requis' },           { status: 400 });

  const auth = 'Basic ' + btoa(token + ':');
  const base = 'https://api.sncf.com/v1/coverage/sncf';

  const res = await fetch(
    `${base}/vehicle_journeys/${encodeURIComponent(id)}?depth=2&data_freshness=realtime`,
    { headers: { Authorization: auth } }
  );

  if (res.status === 404) return Response.json({ error: 'Trajet introuvable' }, { status: 404 });
  if (!res.ok)            return Response.json({ error: `Erreur API (${res.status})` }, { status: res.status });

  const json = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vj: any = json.vehicle_journeys?.[0];
  if (!vj) return Response.json({ error: 'Trajet introuvable' }, { status: 404 });

  // Build a delay map from disruptions → impacted_stops
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const disruptions: any[] = json.disruptions ?? [];
  const delayByStopId: Record<string, { amendedDep?: string; baseDep?: string; amendedArr?: string; baseArr?: string }> = {};
  for (const d of disruptions) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const io of (d.impacted_objects ?? [])) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const is_ of (io.impacted_stops ?? [])) {
        const spId = is_.stop_point?.id;
        if (!spId) continue;
        if (is_.departure_status === 'delayed' || is_.arrival_status === 'delayed' || is_.amended_departure_time || is_.amended_arrival_time) {
          delayByStopId[spId] = {
            amendedDep: is_.amended_departure_time,
            baseDep:    is_.base_departure_time,
            amendedArr: is_.amended_arrival_time,
            baseArr:    is_.base_arrival_time,
          };
        }
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stops = (vj.stop_times ?? []).map((st: any) => {
    const spId = st.stop_point?.id;
    const disruptionDelay = spId ? delayByStopId[spId] : undefined;

    // Prefer stop_times fields, fallback to disruption data
    let depTime  = parseStopTime(st.departure_time);
    let arrTime  = parseStopTime(st.arrival_time);
    let baseDep  = parseStopTime(st.base_departure_time);
    let baseArr  = parseStopTime(st.base_arrival_time);
    let isDelayed = st.departure_status === 'delayed' || st.arrival_status === 'delayed';

    // If disruption has amended times and stop_times doesn't have base times
    if (disruptionDelay) {
      if (!isDelayed) isDelayed = true;
      if (!baseDep && disruptionDelay.baseDep) {
        baseDep = parseStopTime(disruptionDelay.baseDep);
        if (disruptionDelay.amendedDep) depTime = parseStopTime(disruptionDelay.amendedDep);
      }
      if (!baseArr && disruptionDelay.baseArr) {
        baseArr = parseStopTime(disruptionDelay.baseArr);
        if (disruptionDelay.amendedArr) arrTime = parseStopTime(disruptionDelay.amendedArr);
      }
    }

    let delayMinutes: number | undefined;
    if (isDelayed && baseDep && depTime && baseDep !== depTime) {
      const [bh, bm] = baseDep.split(':').map(Number);
      const [dh, dm] = depTime.split(':').map(Number);
      const diff = (dh * 60 + dm) - (bh * 60 + bm);
      if (diff > 0) delayMinutes = diff;
    }

    return {
      name:              (st.stop_point?.name ?? '').replace(/\s*\([^)]*\)/, '').trim(),
      arrivalTime:       arrTime,
      departureTime:     depTime,
      baseArrivalTime:   isDelayed && baseArr && baseArr !== arrTime ? baseArr : null,
      baseDepartureTime: isDelayed && baseDep && baseDep !== depTime ? baseDep : null,
      platform:          st.stop_point?.platform_code ?? null,
      isDelayed,
      delayMinutes:      delayMinutes ?? null,
    };
  });

  return Response.json({
    stops,
    headsign:  vj.headsign ?? '',
    trainName: vj.name     ?? '',
  });
}

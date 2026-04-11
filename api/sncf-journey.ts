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
    `${base}/vehicle_journeys/${encodeURIComponent(id)}?depth=2`,
    { headers: { Authorization: auth } }
  );

  if (res.status === 404) return Response.json({ error: 'Trajet introuvable' }, { status: 404 });
  if (!res.ok)            return Response.json({ error: `Erreur API (${res.status})` }, { status: res.status });

  const json = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vj: any = json.vehicle_journeys?.[0];
  if (!vj) return Response.json({ error: 'Trajet introuvable' }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stops = (vj.stop_times ?? []).map((st: any) => {
    const depTime  = parseStopTime(st.departure_time);
    const arrTime  = parseStopTime(st.arrival_time);
    const baseDep  = parseStopTime(st.base_departure_time);
    const baseArr  = parseStopTime(st.base_arrival_time);
    const isDelayed = st.departure_status === 'delayed' || st.arrival_status === 'delayed';
    return {
      name:              (st.stop_point?.name ?? '').replace(/\s*\([^)]*\)/, '').trim(),
      arrivalTime:       arrTime,
      departureTime:     depTime,
      baseArrivalTime:   isDelayed && baseArr && baseArr !== arrTime ? baseArr : null,
      baseDepartureTime: isDelayed && baseDep && baseDep !== depTime ? baseDep : null,
      platform:          st.stop_point?.platform_code ?? null,
      isDelayed,
    };
  });

  return Response.json({
    stops,
    headsign:  vj.headsign ?? '',
    trainName: vj.name     ?? '',
  });
}

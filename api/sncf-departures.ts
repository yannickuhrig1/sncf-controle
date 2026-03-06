export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  const url      = new URL(req.url);
  const station  = url.searchParams.get('station');
  const datetime = url.searchParams.get('datetime'); // YYYYMMDDTHHMMSS
  const count    = url.searchParams.get('count') || '25';
  const mode     = url.searchParams.get('mode') === 'arrivals' ? 'arrivals' : 'departures';

  const token = process.env.SNCF_API_TOKEN;
  if (!token)   return Response.json({ error: 'Token non configuré' }, { status: 503 });
  if (!station) return Response.json({ error: 'station requis' },      { status: 400 });

  const auth = 'Basic ' + btoa(token + ':');
  const base = 'https://api.sncf.com/v1/coverage/sncf';

  // Step 1 : trouver le stop_area_id de la gare
  const placesRes = await fetch(
    `${base}/places?q=${encodeURIComponent(station)}&type[]=stop_area&count=1`,
    { headers: { Authorization: auth } }
  );
  const placesJson = await placesRes.json();
  const stopArea = placesJson.places?.[0];
  if (!stopArea) return Response.json({ error: 'Gare introuvable' }, { status: 404 });

  // Formatage du datetime (now si non fourni)
  const dt = datetime ?? new Date().toISOString().replace(/[-:]/g, '').replace('T', 'T').slice(0, 15);

  // Step 2 : récupérer les départs ou arrivées temps réel
  const endpoint = mode; // 'departures' | 'arrivals'
  const depRes = await fetch(
    `${base}/stop_areas/${encodeURIComponent(stopArea.id)}/${endpoint}` +
    `?from_datetime=${dt}&count=${count}&data_freshness=realtime&depth=2`,
    { headers: { Authorization: auth } }
  );
  const depJson = await depRes.json();

  return Response.json({
    stationName: stopArea.name?.replace(/\s*\([^)]*\)/, '').trim() ?? station,
    stationId:   stopArea.id,
    departures:  depJson[endpoint] ?? [],
    disruptions: depJson.disruptions ?? [],
    mode,
  }, { status: depRes.ok ? 200 : depRes.status });
}

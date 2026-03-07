export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  const url   = new URL(req.url);
  const lat   = url.searchParams.get('lat');
  const lon   = url.searchParams.get('lon');
  const count = url.searchParams.get('count') || '5';

  const token = process.env.SNCF_API_TOKEN;
  if (!token)      return Response.json({ error: 'Token non configuré' }, { status: 503 });
  if (!lat || !lon) return Response.json({ error: 'lat et lon requis' },  { status: 400 });

  const auth = 'Basic ' + btoa(token + ':');
  const base = 'https://api.sncf.com/v1/coverage/sncf';

  const res = await fetch(
    `${base}/coords/${lon};${lat}/places_nearby` +
    `?type[]=stop_area&count=${count}&distance=50000`,
    { headers: { Authorization: auth } }
  );

  if (res.status === 404) return Response.json({ stations: [] }, { status: 200 });
  if (!res.ok)            return Response.json({ error: `Erreur API (${res.status})` }, { status: res.status });

  const json = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stations = (json.places_nearby ?? []).map((p: any) => ({
    id:       p.id,
    name:     p.name?.replace(/\s*\([^)]*\)/, '').trim() ?? p.name,
    distance: p.distance ?? 0,
  }));

  return Response.json({ stations });
}

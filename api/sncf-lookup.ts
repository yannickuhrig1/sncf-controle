export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const trainNumber = url.searchParams.get('trainNumber');
  const date = url.searchParams.get('date');

  if (!trainNumber || !date) {
    return Response.json({ error: 'trainNumber et date requis' }, { status: 400 });
  }

  const token = process.env.SNCF_API_TOKEN;
  if (!token) {
    return Response.json({ error: 'Token SNCF non configuré (variable SNCF_API_TOKEN manquante)' }, { status: 503 });
  }

  const headsign = trainNumber.trim().match(/\d+/)?.[0] ?? trainNumber.trim();

  // Normaliser le format : accepte YYYY-MM-DD ou YYYYMMDD
  const raw     = date.replace(/-/g, '');  // → YYYYMMDD (pour since/until Navitia)
  const isoDate = raw.length === 8
    ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
    : date;                                 // → YYYY-MM-DD (pour new Date())

  const since   = raw + 'T000000';
  const nextDay = new Date(isoDate);
  if (isNaN(nextDay.getTime())) {
    return Response.json({ error: `Date invalide : ${date}` }, { status: 400 });
  }
  nextDay.setDate(nextDay.getDate() + 1);
  const until = nextDay.toISOString().split('T')[0].replace(/-/g, '') + 'T000000';

  const apiUrl =
    `https://api.sncf.com/v1/coverage/sncf/vehicle_journeys` +
    `?headsign=${encodeURIComponent(headsign)}` +
    `&since=${since}&until=${until}` +
    `&data_freshness=realtime&depth=2&count=1`;

  try {
    const sncfRes = await fetch(apiUrl, {
      headers: { Authorization: 'Basic ' + btoa(token + ':') },
    });

    let data: unknown;
    const ct = sncfRes.headers.get('content-type') ?? '';
    if (ct.includes('application/json')) {
      data = await sncfRes.json();
    } else {
      const text = await sncfRes.text();
      data = { error: `Réponse non-JSON (${sncfRes.status}): ${text.slice(0, 200)}` };
    }
    return Response.json(data, { status: sncfRes.status });
  } catch (err) {
    return Response.json({ error: `Erreur réseau : ${String(err)}` }, { status: 502 });
  }
}

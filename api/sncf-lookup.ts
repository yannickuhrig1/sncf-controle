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
  const since = date.replace(/-/g, '') + 'T000000';
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  const until = nextDay.toISOString().split('T')[0].replace(/-/g, '') + 'T000000';

  const apiUrl =
    `https://api.sncf.com/v1/coverage/sncf/vehicle_journeys` +
    `?headsign=${encodeURIComponent(headsign)}` +
    `&since=${since}&until=${until}` +
    `&data_freshness=realtime&depth=2&count=1`;

  const sncfRes = await fetch(apiUrl, {
    headers: { Authorization: 'Basic ' + btoa(token + ':') },
  });

  const data = await sncfRes.json();
  return Response.json(data, { status: sncfRes.status });
}

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const trainNumber = url.searchParams.get('trainNumber');
  const date        = url.searchParams.get('date');

  if (!trainNumber) {
    return Response.json({ error: 'trainNumber requis' }, { status: 400 });
  }

  const num = trainNumber.replace(/\D/g, '');

  // SNCF Open Data — composition des trains
  // Normaliser la date : YYYY-MM-DD ou YYYYMMDD → YYYY-MM-DD
  let dateStr = date ?? '';
  if (dateStr.length === 8 && !dateStr.includes('-')) {
    dateStr = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }

  let where = `numero_train=${encodeURIComponent(num)}`;
  if (dateStr) where += ` and date_circulation="${dateStr}"`;

  const apiUrl =
    `https://ressources.data.sncf.com/api/explore/v2.1/catalog/datasets/composition-des-trains/records` +
    `?where=${encodeURIComponent(where)}` +
    `&select=position_voiture,categorie_voiture,classe_voiture,numero_voiture,sous_type_materiel,numero_ordre_voiture` +
    `&order_by=position_voiture&limit=30`;

  const headers: Record<string, string> = { Accept: 'application/json' };
  // Clé API optionnelle (SNCF Open Data requiert auth depuis 2025)
  const openDataKey = process.env.SNCF_OPENDATA_KEY;
  if (openDataKey) headers['Authorization'] = `Apikey ${openDataKey}`;

  try {
    const res = await fetch(apiUrl, { headers });
    if (!res.ok) {
      // 403 = API requiert clé — renvoyer résultats vides pour activer le fallback itinéraire
      return Response.json({ results: [] }, { status: 200 });
    }
    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json({ results: [] }, { status: 200 });
  }
}

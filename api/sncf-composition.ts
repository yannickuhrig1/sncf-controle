export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const trainNumber = url.searchParams.get('trainNumber');
  const date        = url.searchParams.get('date');

  if (!trainNumber) {
    return Response.json({ error: 'trainNumber requis' }, { status: 400 });
  }

  const num = trainNumber.replace(/\D/g, '');

  // SNCF Open Data — composition des trains (pas d'auth nécessaire)
  let where = `numero_train=${encodeURIComponent(num)}`;
  if (date) where += ` and date_circulation="${date}"`;

  const apiUrl =
    `https://ressources.data.sncf.com/api/explore/v2.1/catalog/datasets/composition-des-trains/records` +
    `?where=${encodeURIComponent(where)}` +
    `&select=position_voiture,categorie_voiture,classe_voiture,numero_voiture,sous_type_materiel,numero_ordre_voiture` +
    `&order_by=position_voiture&limit=30`;

  try {
    const res = await fetch(apiUrl, { headers: { Accept: 'application/json' } });
    if (!res.ok) return Response.json({ error: `Erreur API (${res.status})` }, { status: res.status });
    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json({ error: 'Erreur réseau' }, { status: 502 });
  }
}

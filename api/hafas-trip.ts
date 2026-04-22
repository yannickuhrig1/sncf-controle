export const config = { runtime: 'edge' };

/**
 * Proxy edge pour DB HAFAS — enrichit un train avec voies et composition.
 * DB HAFAS couvre les TGV, ICE, TER frontaliers et beaucoup de trains SNCF.
 *
 * Usage: /api/hafas-trip?trainNumber=88583&date=2026-04-22
 */

const HAFAS_ENDPOINT = 'https://reiseauskunft.bahn.de/bin/mgate.exe';

const HAFAS_BASE = {
  ver: '1.57',
  lang: 'fra',
  auth: { type: 'AID', aid: 'n91dB8Z77MLdoR0K' },
  client: { id: 'DB', v: '22040000', type: 'IPH', name: 'DB Navigator' },
};

interface HafasStop {
  name: string;
  arrivalPlatform: string | null;
  departurePlatform: string | null;
  plannedArrivalPlatform: string | null;
  plannedDeparturePlatform: string | null;
  arrivalTime: string | null;
  departureTime: string | null;
}

interface HafasResult {
  found: boolean;
  tripId: string | null;
  trainName: string | null;
  stops: HafasStop[];
  composition: {
    carriages: number;
    classes: string[];
    formation: string | null;
  } | null;
}

async function hafasRequest(svcReqL: unknown[]) {
  const body = { ...HAFAS_BASE, svcReqL };
  const res = await fetch(HAFAS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'DB Navigator/22.04' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HAFAS HTTP ${res.status}`);
  return res.json();
}

function formatHafasTime(time: string | undefined | null, date: string | undefined | null): string | null {
  if (!time) return null;
  // HAFAS time format: HHMMSS
  const h = time.slice(0, 2);
  const m = time.slice(2, 4);
  return `${h}:${m}`;
}

function cleanName(name: string): string {
  return name.replace(/\s*\([^)]*\)/, '').trim();
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const trainNumber = url.searchParams.get('trainNumber');
  const date = url.searchParams.get('date');

  if (!trainNumber) {
    return Response.json({ error: 'trainNumber requis' }, { status: 400 });
  }

  const num = trainNumber.trim().replace(/\D/g, '');
  // Date format: YYYYMMDD
  const dateStr = date ? date.replace(/-/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, '');

  try {
    // Step 1: JourneyMatch — find the trip by train number
    const matchRes = await hafasRequest([{
      meth: 'JourneyMatch',
      req: {
        input: num,
        date: dateStr,
        tripId: '',
        onlyCR: false,
      },
    }]);

    const matchData = matchRes?.svcResL?.[0]?.res;
    if (!matchData?.jnyL?.length) {
      return Response.json({ found: false, tripId: null, trainName: null, stops: [], composition: null } satisfies HafasResult);
    }

    // Find best match (exact train number)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jny = matchData.jnyL.find((j: any) => {
      const prodNum = j.prodX !== undefined ? matchData.common?.prodL?.[j.prodX]?.number : null;
      return prodNum === num || j.trainNumber === num;
    }) || matchData.jnyL[0];

    const tripId = jny.jid;
    const prodIdx = jny.prodX;
    const product = prodIdx !== undefined ? matchData.common?.prodL?.[prodIdx] : null;
    const trainName = product ? `${product.catOut?.trim() ?? ''} ${product.number ?? ''}`.trim() : null;

    if (!tripId) {
      return Response.json({ found: false, tripId: null, trainName, stops: [], composition: null } satisfies HafasResult);
    }

    // Step 2: TripDetails — get stops with platforms
    const tripRes = await hafasRequest([{
      meth: 'TripDetails',
      req: {
        jid: tripId,
        getTrainComposition: true,
        getPolyline: false,
      },
    }]);

    const tripData = tripRes?.svcResL?.[0]?.res;
    const common = tripData?.common ?? matchData?.common;
    const locL = common?.locL ?? [];
    const trip = tripData?.journey ?? tripData?.jny;

    const stops: HafasStop[] = [];

    if (trip?.stopL) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const st of trip.stopL) {
        const loc = locL[st.locX];
        const name = loc ? cleanName(loc.name ?? '') : '';

        stops.push({
          name,
          arrivalPlatform: st.aPltfR?.txt ?? st.aPltfS?.txt ?? null,
          departurePlatform: st.dPltfR?.txt ?? st.dPltfS?.txt ?? null,
          plannedArrivalPlatform: st.aPltfS?.txt ?? null,
          plannedDeparturePlatform: st.dPltfS?.txt ?? null,
          arrivalTime: formatHafasTime(st.aTimeR ?? st.aTimeS, st.aDateR ?? st.aDateS),
          departureTime: formatHafasTime(st.dTimeR ?? st.dTimeS, st.dDateR ?? st.dDateS),
        });
      }
    }

    // Step 3: Extract composition if available
    let composition: HafasResult['composition'] = null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const trainComp = tripData?.trainComposition ?? (trip as any)?.trainComposition;
    if (trainComp) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const coaches = trainComp.cmpSections?.flatMap((s: any) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        s.coaches?.map((c: any) => ({
          number: c.number ?? c.uic,
          class: c.cls === 1 ? '1ère' : c.cls === 2 ? '2nde' : null,
          type: c.type,
        })) ?? []
      ) ?? [];

      const classes = [...new Set(coaches
        .map((c: { class: string | null }) => c.class)
        .filter(Boolean)
      )] as string[];

      composition = {
        carriages: coaches.length || 0,
        classes,
        formation: coaches.length > 0
          ? coaches.map((c: { number: string | null; class: string | null }) => c.number ? `V${c.number}${c.class ? ` (${c.class})` : ''}` : null).filter(Boolean).join(' — ')
          : null,
      };
    }

    const result: HafasResult = {
      found: true,
      tripId,
      trainName,
      stops,
      composition,
    };

    return Response.json(result, {
      headers: { 'Cache-Control': 'public, max-age=120, s-maxage=120' },
    });
  } catch (err) {
    return Response.json(
      { found: false, tripId: null, trainName: null, stops: [], composition: null, error: String(err) },
      { status: 200 } // 200 pour que le frontend puisse fallback gracefully
    );
  }
}

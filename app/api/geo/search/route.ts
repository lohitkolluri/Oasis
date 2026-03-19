import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type GeoResult = {
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  country?: string;
};

function pickAddressName(addr: any): { name: string; admin1?: string; country?: string } {
  const city =
    addr?.city ||
    addr?.town ||
    addr?.village ||
    addr?.city_district ||
    addr?.suburb ||
    addr?.county ||
    addr?.state_district;
  const suburb = addr?.suburb || addr?.neighbourhood || addr?.quarter;
  const state = addr?.state;
  const country = addr?.country;

  const primary = suburb && city ? `${suburb}, ${city}` : city || suburb || '';
  const admin1 = state || addr?.state_district || addr?.county;
  return {
    name: primary || '',
    admin1: admin1 ? String(admin1) : undefined,
    country: country ? String(country) : undefined,
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  const limit = Math.min(8, Math.max(1, Number(url.searchParams.get('limit') ?? 5)));

  if (q.length < 2) {
    return NextResponse.json({ results: [] satisfies GeoResult[] });
  }

  // Primary: Photon (Komoot) — best prefix matching for typeahead.
  // Note: Photon is global, so we filter to India.
  try {
    const photonUrl = new URL('https://photon.komoot.io/api/');
    photonUrl.searchParams.set('q', q);
    photonUrl.searchParams.set('limit', String(Math.max(limit * 2, 10))); // oversample then filter to IN
    photonUrl.searchParams.set('lang', 'en');

    const res = await fetch(photonUrl.toString(), {
      headers: {
        'User-Agent': 'Oasis/1.0 (zone-autocomplete)',
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (res.ok) {
      const data = (await res.json()) as {
        features?: Array<{
          geometry?: { coordinates?: [number, number] };
          properties?: {
            name?: string;
            city?: string;
            state?: string;
            country?: string;
            countrycode?: string;
          };
        }>;
      };

      const results: GeoResult[] = (data.features ?? [])
        .map((f) => {
          const props = f.properties ?? {};
          const coords = f.geometry?.coordinates;
          const lon = Number(coords?.[0]);
          const lat = Number(coords?.[1]);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

          const cc = String(props.countrycode ?? '').toLowerCase();
          if (cc && cc !== 'in') return null;

          const name =
            (props.name && props.city ? `${props.name}, ${props.city}` : props.name || props.city || '')
              .trim();
          if (!name) return null;
          return {
            name,
            latitude: lat,
            longitude: lon,
            admin1: props.state ? String(props.state) : undefined,
            country: props.country ? String(props.country) : undefined,
          } satisfies GeoResult;
        })
        .filter(Boolean) as GeoResult[];

      return NextResponse.json({ results: results.slice(0, limit) });
    }
  } catch {
    // fall through
  }

  // Secondary: Nominatim (good accuracy; prefix matching can be weaker).
  try {
    const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search');
    nominatimUrl.searchParams.set('q', q);
    nominatimUrl.searchParams.set('format', 'jsonv2');
    nominatimUrl.searchParams.set('addressdetails', '1');
    nominatimUrl.searchParams.set('limit', String(limit));
    nominatimUrl.searchParams.set('countrycodes', 'in');

    const res = await fetch(nominatimUrl.toString(), {
      headers: {
        // Nominatim usage policy expects an identifying UA; this runs from your app server.
        'User-Agent': 'Oasis/1.0 (zone-autocomplete)',
        Accept: 'application/json',
      },
      // Keep it snappy for typing.
      cache: 'no-store',
    });

    if (res.ok) {
      const data = (await res.json()) as Array<any>;
      const results: GeoResult[] = (data ?? [])
        .map((r) => {
          const lat = Number(r?.lat);
          const lon = Number(r?.lon);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
          const picked = pickAddressName(r?.address);
          const name =
            picked.name ||
            String(r?.display_name ?? '').split(',').slice(0, 2).join(',').trim();
          if (!name) return null;
          return {
            name,
            latitude: lat,
            longitude: lon,
            admin1: picked.admin1,
            country: picked.country,
          } satisfies GeoResult;
        })
        .filter(Boolean) as GeoResult[];

      return NextResponse.json({ results });
    }
  } catch {
    // fall through
  }

  // Fallback: Open-Meteo geocoding (less strict; still useful).
  try {
    const openMeteoUrl = new URL('https://geocoding-api.open-meteo.com/v1/search');
    openMeteoUrl.searchParams.set('name', q);
    openMeteoUrl.searchParams.set('count', String(limit));
    openMeteoUrl.searchParams.set('language', 'en');
    openMeteoUrl.searchParams.set('countryCode', 'IN');

    const res = await fetch(openMeteoUrl.toString(), { cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ results: [] satisfies GeoResult[] });
    const geo = (await res.json()) as { results?: Array<any> };

    const results: GeoResult[] = (geo.results ?? [])
      .map((r) => ({
        name: String(r?.name ?? ''),
        latitude: Number(r?.latitude),
        longitude: Number(r?.longitude),
        admin1: r?.admin1 ? String(r.admin1) : undefined,
        country: r?.country ? String(r.country) : undefined,
      }))
      .filter((r) => r.name && Number.isFinite(r.latitude) && Number.isFinite(r.longitude));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] satisfies GeoResult[] });
  }
}


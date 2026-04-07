import { fetchTextWithRetry } from '@/lib/utils/retry';
import { EXTERNAL_APIS } from '@/lib/config/constants';

export type ToiRssItem = {
  title: string;
  description: string;
  link?: string;
  pubDate?: string;
};

export type ToiRssFeed = {
  id: string;
  label: string;
  url: string;
  /** Optional centroid for picking feeds based on rider zones */
  center?: { lat: number; lng: number };
};

function decodeCdata(s: string): string {
  // Avoid dotAll flag for older TS targets.
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1');
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, ' ');
}

function normalize(s: string): string {
  return stripTags(decodeCdata(s))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function firstTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = block.match(re);
  return m?.[1] ?? '';
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

export const TOI_RSS_FEEDS: ToiRssFeed[] = [
  {
    id: 'toi_top_stories',
    label: 'TOI Top Stories',
    url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',
  },
  {
    id: 'toi_india',
    label: 'TOI India',
    // TOI provides a category feed for India news; resilient fallback when city feeds are empty.
    url: 'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms',
  },
  {
    id: 'toi_city_bengaluru',
    label: 'TOI Bengaluru',
    url: 'https://timesofindia.indiatimes.com/city/bengaluru/rssfeeds/-2128833038.cms',
    center: { lat: 12.9716, lng: 77.5946 },
  },
  {
    id: 'toi_city_chennai',
    label: 'TOI Chennai',
    url: 'https://timesofindia.indiatimes.com/rssfeeds/2950623.cms',
    center: { lat: 13.0827, lng: 80.2707 },
  },
  {
    id: 'toi_city_mumbai',
    label: 'TOI Mumbai',
    url: 'https://toifeeds.indiatimes.com/city/mumbai',
    center: { lat: 19.076, lng: 72.8777 },
  },
  {
    id: 'toi_city_delhi',
    label: 'TOI Delhi',
    url: 'https://toifeeds.indiatimes.com/india/delhi',
    center: { lat: 28.6139, lng: 77.209 },
  },
  {
    id: 'toi_city_hyderabad',
    label: 'TOI Hyderabad',
    url: 'https://toifeeds.indiatimes.com/city/hyderabad',
    center: { lat: 17.385, lng: 78.4867 },
  },
  {
    id: 'toi_city_pune',
    label: 'TOI Pune',
    url: 'https://toifeeds.indiatimes.com/city/pune',
    center: { lat: 18.5204, lng: 73.8567 },
  },
  {
    id: 'toi_city_kolkata',
    label: 'TOI Kolkata',
    url: 'https://toifeeds.indiatimes.com/city/kolkata',
    center: { lat: 22.5726, lng: 88.3639 },
  },
  {
    id: 'toi_city_ahmedabad',
    label: 'TOI Ahmedabad',
    url: 'https://toifeeds.indiatimes.com/city/ahmedabad',
    center: { lat: 23.0225, lng: 72.5714 },
  },
  {
    id: 'toi_city_jaipur',
    label: 'TOI Jaipur',
    url: 'https://toifeeds.indiatimes.com/city/jaipur',
    center: { lat: 26.9124, lng: 75.7873 },
  },
  {
    id: 'toi_city_lucknow',
    label: 'TOI Lucknow',
    url: 'https://toifeeds.indiatimes.com/city/lucknow',
    center: { lat: 26.8467, lng: 80.9462 },
  },
  {
    id: 'toi_city_indore',
    label: 'TOI Indore',
    url: 'https://toifeeds.indiatimes.com/city/indore',
    center: { lat: 22.7196, lng: 75.8577 },
  },
  {
    id: 'toi_city_kochi',
    label: 'TOI Kochi',
    url: 'https://toifeeds.indiatimes.com/city/kochi',
    center: { lat: 9.9312, lng: 76.2673 },
  },
  {
    id: 'toi_city_chandigarh',
    label: 'TOI Chandigarh',
    url: 'https://toifeeds.indiatimes.com/city/chandigarh',
    center: { lat: 30.7333, lng: 76.7794 },
  },
];

export async function fetchToiRss(
  feedUrl: string,
  opts?: { cacheTtlMs?: number; timeoutMs?: number },
): Promise<ToiRssItem[]> {

  const xml = await fetchTextWithRetry(
    feedUrl,
    { method: 'GET', headers: { Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8' } },
    {
      cacheTtlMs: opts?.cacheTtlMs ?? EXTERNAL_APIS.CACHE_NEWS_TTL_MS,
      timeoutMs: opts?.timeoutMs ?? EXTERNAL_APIS.NEWS_FETCH_TIMEOUT_MS,
    },
  );

  const items: ToiRssItem[] = [];
  const rawItems = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];
  for (const it of rawItems.slice(0, 15)) {
    const title = normalize(firstTag(it, 'title'));
    const description = normalize(firstTag(it, 'description'));
    const link = normalize(firstTag(it, 'link')) || undefined;
    const pubDate = normalize(firstTag(it, 'pubDate')) || undefined;
    if (!title) continue;
    items.push({ title, description, link, pubDate });
  }
  return items;
}

/**
 * Production-friendly TOI ingestion: pick the most relevant city feeds based on rider zones,
 * and always include Top Stories as a safety net.
 */
export async function fetchToiRssForZones(
  activeZones: Array<{ lat: number; lng: number }> | undefined,
  opts?: { cacheTtlMs?: number; timeoutMs?: number; maxCityFeeds?: number },
): Promise<ToiRssItem[]> {
  // Default to 3 feeds; scale up slightly when rider zones are geographically dispersed.
  const zoneCount = activeZones?.length ?? 0;
  const base = opts?.maxCityFeeds ?? (zoneCount >= 25 ? 4 : zoneCount >= 8 ? 3 : 2);
  const maxCityFeeds = Math.max(1, Math.min(5, base));
  const zones = activeZones && activeZones.length > 0 ? activeZones : [];

  const top = TOI_RSS_FEEDS.find((f) => f.id === 'toi_top_stories');
  const india = TOI_RSS_FEEDS.find((f) => f.id === 'toi_india');
  const cityFeeds = TOI_RSS_FEEDS.filter((f) => f.center);

  const ranked =
    zones.length === 0
      ? cityFeeds
      : cityFeeds
          .map((f) => {
            const c = f.center!;
            const minKm = Math.min(...zones.map((z) => haversineKm(z, c)));
            return { feed: f, minKm };
          })
          .sort((a, b) => a.minKm - b.minKm)
          .map((x) => x.feed);

  // Volatile selection: rotate through the nearest feeds each hour to improve coverage
  // without exploding request volume. Deterministic per-hour so observability is stable.
  const hourBucket = Math.floor(Date.now() / (60 * 60 * 1000));
  const window = Math.min(ranked.length, Math.max(maxCityFeeds * 2, 6));
  const pool = ranked.slice(0, window);
  const rotated: ToiRssFeed[] = [];
  for (let i = 0; i < pool.length; i++) {
    rotated.push(pool[(i + (hourBucket % Math.max(1, pool.length))) % pool.length]);
  }

  const picked = [
    ...(top ? [top] : []),
    ...(india ? [india] : []),
    ...rotated.slice(0, maxCityFeeds),
  ];

  const all: ToiRssItem[] = [];
  for (const feed of picked) {
    try {
      const items = await fetchToiRss(feed.url, opts);
      all.push(...items);
    } catch {
      // Caller handles health logging; swallowing here makes multi-feed ingestion resilient.
    }
  }

  // Dedupe by (title+link) and trim for LLM prompt safety.
  const seen = new Set<string>();
  const deduped: ToiRssItem[] = [];
  for (const it of all) {
    const k = `${it.title}::${it.link ?? ''}`;
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(it);
    if (deduped.length >= 25) break;
  }
  return deduped;
}

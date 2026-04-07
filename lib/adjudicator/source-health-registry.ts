/**
 * Source-health rows are persisted in `parametric_source_health` and can outlive
 * the code/config that originally produced them. This registry defines which
 * sources are "expected" for the currently running build + environment.
 */

export function getExpectedParametricSourceIds(): Set<string> {
  const ids = new Set<string>();

  // Open-Meteo (free, always available; used across weather + geocoding)
  ids.add('openmeteo_forecast');
  ids.add('openmeteo_aqi_current');
  ids.add('openmeteo_aqi_historical');
  ids.add('openmeteo_geocode');

  // Optional paid/keys
  if (process.env.TOMORROW_IO_API_KEY) ids.add('tomorrow_io');
  if (process.env.WAQI_API_KEY) ids.add('waqi_ground_station');
  if (process.env.TOMTOM_API_KEY) ids.add('tomtom_traffic');

  // TOI RSS sources (used as primary news feed; plus system-health "touch" rows)
  ids.add('toi_rss_top_stories');
  ids.add('toi_rss_india');
  ids.add('toi_rss_traffic');
  ids.add('toi_rss_curfew');

  // OpenRouter LLM (used for both TOI + NewsData classification)
  if (process.env.OPENROUTER_API_KEY) {
    ids.add('openrouter_toi_traffic');
    ids.add('openrouter_toi_curfew');
    ids.add('openrouter_news_traffic');
    ids.add('openrouter_news_curfew');
  }

  // NewsData (optional fallback feed)
  if (process.env.NEWSDATA_IO_API_KEY) {
    ids.add('newsdata_io_traffic');
    ids.add('newsdata_io_curfew');
  }

  return ids;
}

/**
 * Rows we deliberately "pin" so the admin console always has a small baseline.
 * These are explicitly touched in `/api/admin/system-health`.
 */
export function getPinnedParametricSourceIds(): Set<string> {
  return new Set<string>(['toi_rss_top_stories', 'toi_rss_india']);
}

export function shouldKeepSourceHealthRow(input: {
  sourceId: string;
  lastObservedAt?: string | null;
  keepObservedWithinDays?: number;
  expectedIds?: Set<string>;
  pinnedIds?: Set<string>;
}): boolean {
  const pinned = input.pinnedIds ?? getPinnedParametricSourceIds();
  if (pinned.has(input.sourceId)) return true;

  const days = input.keepObservedWithinDays ?? 7;
  const ts = input.lastObservedAt;
  if (!ts) return false;
  const t = Date.parse(ts);
  if (!Number.isFinite(t)) return false;

  // Keep only "alive" sources: either currently expected *and* recently observed,
  // or any recently observed legacy row (useful during rollouts).
  const expected = input.expectedIds ?? getExpectedParametricSourceIds();
  const isRecent = Date.now() - t <= days * 24 * 60 * 60 * 1000;
  return isRecent && expected.has(input.sourceId);
}


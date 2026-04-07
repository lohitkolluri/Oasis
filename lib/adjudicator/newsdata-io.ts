/**
 * NewsData.io — Latest News API client.
 * @see https://newsdata.io/documentation — endpoint `/api/1/latest`, param `size` (not `limit`).
 * Auth supports `apikey` query param or `X-ACCESS-KEY` header.
 */

import { EXTERNAL_APIS } from '@/lib/config/constants';
import { fetchWithRetry } from '@/lib/utils/retry';

/** Documented base URL for latest/breaking news (past 48h, sorted by publish date). */
export const NEWSDATA_LATEST_URL = 'https://newsdata.io/api/1/latest';

export type NewsDataArticle = {
  article_id?: string;
  title?: string;
  link?: string;
  description?: string;
  pubDate?: string;
  source_id?: string;
  source_name?: string;
  country?: string;
  language?: string;
};

export type NewsDataApiResponse = {
  status?: string;
  totalResults?: number;
  results?: NewsDataArticle[];
  nextPage?: string;
  message?: string;
  /** Present when status is "error" */
  code?: string;
};

export function assertNewsDataResponse(data: NewsDataApiResponse): NewsDataApiResponse {
  const s = typeof data?.status === 'string' ? data.status.toLowerCase() : '';
  if (s === 'error') {
    const parts = [data.code, data.message].filter(
      (x): x is string => typeof x === 'string' && x.length > 0,
    );
    throw new Error(parts.length ? parts.join(': ') : 'NewsData.io API error');
  }
  if (s && s !== 'success') {
    throw new Error(
      typeof data.message === 'string' && data.message.length > 0
        ? data.message
        : `NewsData status: ${data.status}`,
    );
  }
  return data;
}

export type FetchNewsDataLatestParams = {
  /** Keyword query; supports AND / OR / NOT per NewsData docs (max 512 chars). */
  q: string;
  /** ISO 3166-1 alpha-2, e.g. `in` */
  country: string;
  /** Language code, e.g. `en` */
  language: string;
  /** Articles per request; free tier allows 1–10. */
  size?: number;
  /** Hours in the past (1–48) — Latest endpoint only. */
  timeframeHours?: number;
  /** Dedupe per NewsData internal algorithm. */
  removeduplicate?: boolean;
  /** e.g. `news` to prefer wire-style articles. */
  datatype?: string;
};

function clampSizeForFreeTier(size: number): number {
  const max = EXTERNAL_APIS.NEWS_DATA_LATEST_SIZE_MAX;
  const min = 1;
  return Math.max(min, Math.min(max, Math.floor(size)));
}

/**
 * GET latest news with API key in header (avoids key in URLs/logs).
 * Uses documented `size` parameter; does not use legacy `limit` or `/api/1/news`.
 */
export async function fetchNewsDataLatest(
  apiKey: string,
  params: FetchNewsDataLatestParams,
  retry?: { cacheTtlMs?: number; timeoutMs?: number },
): Promise<NewsDataApiResponse> {
  const search = new URLSearchParams();
  search.set('q', params.q);
  search.set('country', params.country);
  search.set('language', params.language);
  search.set(
    'size',
    String(clampSizeForFreeTier(params.size ?? EXTERNAL_APIS.NEWS_DATA_LATEST_SIZE)),
  );

  // `timeframe` is not available on the Free plan per NewsData docs.
  // Only include it when explicitly requested by the caller.
  if (params.timeframeHours != null) {
    const tf = params.timeframeHours;
    if (tf >= 1 && tf <= 48) {
      search.set('timeframe', String(tf));
    }
  }

  if (params.removeduplicate !== false) {
    search.set('removeduplicate', '1');
  }

  if (params.datatype) {
    search.set('datatype', params.datatype);
  }

  const url = `${NEWSDATA_LATEST_URL}?${search.toString()}`;

  const raw = await fetchWithRetry<NewsDataApiResponse>(
    url,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-ACCESS-KEY': apiKey,
      },
    },
    {
      cacheTtlMs: retry?.cacheTtlMs ?? EXTERNAL_APIS.CACHE_NEWS_TTL_MS,
      timeoutMs: retry?.timeoutMs ?? EXTERNAL_APIS.NEWS_FETCH_TIMEOUT_MS,
    },
  );

  return assertNewsDataResponse(raw);
}

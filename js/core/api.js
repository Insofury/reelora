/**
 * api.js — the only module that talks to the network.
 *
 * Wraps the free TVmaze REST API (https://www.tvmaze.com/api, no key needed) with:
 *  - a concurrency limiter (TVmaze allows ~20 requests / 10 s per IP)
 *  - timeouts, retries and exponential back-off on HTTP 429
 *  - request de-duplication (two components asking for the same thing share one request)
 *  - a two-level cache: in-memory Map + localStorage with a time-to-live
 *  - normalisation of raw API objects into the small "show" shape the UI uses
 */
import { sleep, stripTags, truncate, storage, isoDate, uniqueBy } from './utils.js';

const BASE_URL = 'https://api.tvmaze.com';
const HOUR = 60 * 60 * 1000;
const CACHE_PREFIX = 'reelora:cache:';
const MAX_CONCURRENT = 4;
const TIMEOUT_MS = 15000;

/** Well-known series used for the billboard and the Top 10 row. */
const FEATURED_TITLES = [
  'Stranger Things', 'Wednesday', 'The Last of Us', 'Squid Game', 'Breaking Bad',
  'Game of Thrones', 'The Witcher', 'Money Heist', 'Peaky Blinders', 'The Crown',
  'The Boys', 'Arcane', 'House of the Dragon', 'The Mandalorian', 'Severance', 'The Bear',
];

export class ApiError extends Error {
  constructor(status, path) {
    super(status ? `TVmaze returned HTTP ${status} for ${path}` : `Network error while loading ${path}`);
    this.name = 'ApiError';
    this.status = status;
  }
}

/* ---------- concurrency limiter ---------- */
let running = 0;
const queue = [];

function pump() {
  while (running < MAX_CONCURRENT && queue.length) {
    const { task, resolve, reject } = queue.shift();
    running += 1;
    task()
      .then(resolve, reject)
      .finally(() => {
        running -= 1;
        pump();
      });
  }
}

const limited = (task) =>
  new Promise((resolve, reject) => {
    queue.push({ task, resolve, reject });
    pump();
  });

/* ---------- fetch with timeout + retry ---------- */
async function fetchJson(path, attempt = 0) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response;
  try {
    response = await fetch(BASE_URL + path, { signal: controller.signal });
  } catch {
    if (attempt < 2) {
      await sleep(700 * 2 ** attempt);
      return fetchJson(path, attempt + 1);
    }
    throw new ApiError(0, path);
  } finally {
    clearTimeout(timer);
  }
  if (response.status === 429 && attempt < 4) {
    await sleep(1500 * 2 ** attempt); // rate-limited: back off and try again
    return fetchJson(path, attempt + 1);
  }
  if (!response.ok) throw new ApiError(response.status, path);
  return response.json();
}

const request = (path) => limited(() => fetchJson(path));

/* ---------- cache ---------- */
const memory = new Map();
const inflight = new Map();

function readCache(key, ttl) {
  const hit = memory.get(key);
  if (hit && Date.now() - hit.t < ttl) return hit.v;
  const stored = storage.get(CACHE_PREFIX + key, null);
  if (stored && Date.now() - stored.t < ttl) {
    memory.set(key, stored);
    return stored.v;
  }
  return undefined;
}

function writeCache(key, value, persist) {
  const entry = { t: Date.now(), v: value };
  memory.set(key, entry);
  if (!persist) return;
  if (!storage.set(CACHE_PREFIX + key, entry)) {
    clearPersistentCache(); // quota full: drop old cache entries and try once more
    storage.set(CACHE_PREFIX + key, entry);
  }
}

export function clearPersistentCache(matcher = () => true) {
  storage
    .keys()
    .filter((k) => k.startsWith(CACHE_PREFIX) && matcher(k.slice(CACHE_PREFIX.length)))
    .forEach((k) => storage.remove(k));
}

/** Return a cached value, or run `producer` once (shared by concurrent callers) and cache it. */
async function cached(key, { ttl, persist = false }, producer) {
  const hit = readCache(key, ttl);
  if (hit !== undefined) return hit;
  if (inflight.has(key)) return inflight.get(key);
  const promise = producer().then((value) => {
    writeCache(key, value, persist);
    return value;
  });
  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}

/* ---------- normalisation ---------- */

/** Reduce a raw TVmaze show to the fields the UI needs (keeps cache small). */
export function normalizeShow(raw) {
  const channel = raw.network || raw.webChannel || null;
  return {
    id: raw.id,
    name: raw.name || 'Untitled',
    type: raw.type || '',
    language: raw.language || '',
    genres: Array.isArray(raw.genres) ? raw.genres : [],
    status: raw.status || '',
    runtime: raw.runtime || raw.averageRuntime || 0,
    premiered: raw.premiered || '',
    ended: raw.ended || '',
    year: raw.premiered ? raw.premiered.slice(0, 4) : '',
    rating: raw.rating?.average ?? null,
    weight: raw.weight ?? 0,
    network: channel?.name || '',
    poster: raw.image?.medium || '',
    posterLarge: raw.image?.original || raw.image?.medium || '',
    summary: truncate(stripTags(raw.summary), 420),
    officialSite: raw.officialSite || '',
    url: raw.url || '',
  };
}

/* ---------- public API ---------- */

/** ~750 shows from the first three pages of the TVmaze index (cached 24 h). */
export function getCatalog() {
  return cached('catalog:v1', { ttl: 24 * HOUR, persist: true }, async () => {
    const pages = await Promise.all([0, 1, 2].map((page) => request(`/shows?page=${page}`)));
    return uniqueBy(pages.flat().map(normalizeShow)).filter((show) => show.poster);
  });
}

/** Popular modern series looked up by name (cached 24 h). */
export function getFeatured() {
  return cached('featured:v1', { ttl: 24 * HOUR, persist: true }, async () => {
    const results = await Promise.all(
      FEATURED_TITLES.map((title) =>
        request(`/singlesearch/shows?q=${encodeURIComponent(title)}`).catch(() => null),
      ),
    );
    return uniqueBy(results.filter(Boolean).map(normalizeShow)).filter((show) => show.poster);
  });
}

/** Series with new episodes on streaming services today (cached 3 h). */
export function getStreamingToday() {
  const date = isoDate();
  clearPersistentCache((key) => key.startsWith('web:') && key !== `web:${date}`);
  return cached(`web:${date}`, { ttl: 3 * HOUR, persist: true }, async () => {
    const episodes = await request(`/schedule/web?date=${date}`);
    const shows = episodes.map((episode) => episode._embedded?.show).filter(Boolean).map(normalizeShow);
    return uniqueBy(shows)
      .filter((show) => show.poster)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 40);
  });
}

/** Landscape backdrop and title-logo artwork for one show (cached 7 days). */
export function getArtwork(id) {
  return cached(`art:${id}`, { ttl: 7 * 24 * HOUR, persist: true }, async () => {
    const images = await request(`/shows/${id}/images`);
    const best = (type) => {
      const list = images.filter((img) => img.type === type);
      return (list.find((img) => img.main) || list[0])?.resolutions || null;
    };
    const background = best('background');
    const typography = best('typography');
    return {
      backdrop: background?.original?.url || '',
      logo: typography?.original?.url || '',
    };
  });
}

/** Full details: cast, seasons and episodes in one request (memory cache only). */
export function getShowDetails(id) {
  return cached(`show:${id}`, { ttl: 6 * HOUR }, async () => {
    const raw = await request(`/shows/${id}?embed[]=cast&embed[]=episodes&embed[]=seasons`);
    const embedded = raw._embedded || {};
    return {
      ...normalizeShow(raw),
      summaryFull: stripTags(raw.summary),
      cast: (embedded.cast || []).slice(0, 14).map((credit) => ({
        name: credit.person?.name || '',
        character: credit.character?.name || '',
        photo: credit.person?.image?.medium || credit.character?.image?.medium || '',
      })),
      seasons: (embedded.seasons || []).map((season) => ({
        number: season.number,
        name: season.name || '',
        episodeCount: season.episodeOrder || 0,
        premiered: season.premiereDate || '',
      })),
      episodes: (embedded.episodes || []).map((episode) => ({
        id: episode.id,
        season: episode.season,
        number: episode.number,
        name: episode.name || '',
        runtime: episode.runtime || 0,
        airdate: episode.airdate || '',
        image: episode.image?.medium || '',
        summary: truncate(stripTags(episode.summary), 220),
      })),
    };
  });
}

/** Free-text search across all TVmaze shows (memory cache 1 h). */
export function searchShows(query) {
  const q = query.trim().toLowerCase();
  return cached(`search:${q}`, { ttl: HOUR }, async () => {
    const results = await request(`/search/shows?q=${encodeURIComponent(q)}`);
    return uniqueBy(results.map((result) => normalizeShow(result.show)));
  });
}

/**
 * catalog.js — turns raw API lists into the app's "library".
 *
 * Combines the three sources (index pages, featured hits, today's streaming
 * releases), keeps a registry of every show seen so buttons can find a show by
 * id, applies the Kids-profile filter and provides sorting/similarity helpers.
 */
import { getCatalog, getFeatured, getStreamingToday } from './api.js';
import { uniqueBy } from './utils.js';
import { store } from './store.js';

/** Genre rows on the home page, in display order. */
export const GENRE_ROWS = [
  { genre: 'Drama', title: 'Gripping Dramas' },
  { genre: 'Comedy', title: 'Laugh-Out-Loud Comedies' },
  { genre: 'Crime', title: 'Crime & Investigation' },
  { genre: 'Science-Fiction', title: 'Sci-Fi Worlds' },
  { genre: 'Thriller', title: 'Edge-of-Your-Seat Thrillers' },
  { genre: 'Action', title: 'Action-Packed Series' },
  { genre: 'Fantasy', title: 'Fantasy & Magic' },
  { genre: 'Mystery', title: 'Mysteries to Solve' },
  { genre: 'Romance', title: 'Love Stories' },
  { genre: 'Horror', title: 'Late-Night Horror' },
  { genre: 'Family', title: 'Watch Together' },
  { genre: 'Anime', title: 'Anime Picks' },
  { genre: 'Adventure', title: 'Big Adventures' },
];

/* ---------- registry: id -> show ---------- */
const registry = new Map();

const hasValue = (value) => value !== '' && value != null && !(Array.isArray(value) && !value.length);

/** Remember shows so action buttons can look them up by id. New non-empty fields win. */
export function remember(shows) {
  for (const show of shows) {
    if (!show || show.id == null) continue;
    const filled = Object.fromEntries(Object.entries(show).filter(([, value]) => hasValue(value)));
    registry.set(show.id, { ...registry.get(show.id), ...filled });
  }
  return shows;
}

export const lookup = (id) => registry.get(Number(id));

/* ---------- Kids profile filter ---------- */
const BLOCKED_FOR_KIDS = new Set(['Horror', 'Crime', 'Thriller', 'War', 'Adult', 'Espionage', 'Medical', 'Legal', 'Supernatural']);
const KID_FRIENDLY = new Set(['Children', 'Family', 'Anime', 'Comedy', 'Adventure', 'Fantasy', 'Music', 'Nature', 'Sports', 'Food', 'Travel']);

export function isKidSafe(show) {
  const genres = show.genres || [];
  if (genres.some((g) => BLOCKED_FOR_KIDS.has(g))) return false;
  return show.type === 'Animation' || genres.some((g) => KID_FRIENDLY.has(g));
}

/** Apply the active profile's content filter. */
export function forProfile(shows) {
  return store.activeProfile()?.kids ? shows.filter(isKidSafe) : shows;
}

/* ---------- sorting & similarity ---------- */
export const byPopularity = (a, b) => b.weight - a.weight || (b.rating || 0) - (a.rating || 0);
export const byRating = (a, b) => (b.rating || 0) - (a.rating || 0) || b.weight - a.weight;
export const byNewest = (a, b) => (b.premiered || '').localeCompare(a.premiered || '');
export const byName = (a, b) => a.name.localeCompare(b.name);

export function similarTo(show, pool, count = 9) {
  const genres = new Set(show.genres || []);
  return pool
    .filter((candidate) => candidate.id !== show.id)
    .map((candidate) => ({
      candidate,
      score: candidate.genres.filter((g) => genres.has(g)).length,
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || byPopularity(a.candidate, b.candidate))
    .slice(0, count)
    .map(({ candidate }) => candidate);
}

export function genreCounts(shows) {
  const counts = new Map();
  shows.forEach((show) => show.genres.forEach((g) => counts.set(g, (counts.get(g) || 0) + 1)));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

/* ---------- library loader ---------- */
let libraryPromise = null;

/** Load (once) and combine all sources. Partial failures still return what loaded. */
export function loadLibrary() {
  if (!libraryPromise) {
    libraryPromise = Promise.allSettled([getCatalog(), getFeatured(), getStreamingToday()]).then(
      ([catalogResult, featuredResult, streamingResult]) => {
        const value = (result) => (result.status === 'fulfilled' ? result.value : []);
        const catalog = value(catalogResult);
        const featured = value(featuredResult);
        const streaming = value(streamingResult);
        if (!catalog.length && !featured.length && !streaming.length) {
          libraryPromise = null; // allow a retry
          throw catalogResult.reason || new Error('Could not load shows');
        }
        const all = uniqueBy([...featured, ...streaming, ...catalog]);
        remember(all);
        return { catalog, featured, streaming, all };
      },
    );
  }
  return libraryPromise;
}

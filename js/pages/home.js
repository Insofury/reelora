/**
 * home.js — the landing page: billboard + personal rows + curated rows.
 */
import { el } from '../core/utils.js';
import { store } from '../core/store.js';
import { GENRE_ROWS, byPopularity, byRating, forProfile, loadLibrary, remember } from '../core/catalog.js';
import { createHero, heroSkeleton } from '../components/hero.js';
import { createRow, skeletonRow } from '../components/row.js';
import { errorState } from '../components/states.js';

let personalSlot = null;

export function renderHome(main) {
  const page = el('<div class="page page--home"></div>');
  const heroSlot = el('<div class="hero-slot"></div>');
  const rows = el('<div class="rows"></div>');
  personalSlot = el('<div class="rows-personal"></div>');
  page.append(heroSlot, rows);
  main.append(page);

  heroSlot.append(heroSkeleton());
  rows.append(skeletonRow(), skeletonRow(), skeletonRow());

  loadLibrary()
    .then((library) => {
      if (!page.isConnected) return;
      const pool = forProfile(library.all);
      const featured = forProfile(library.featured).sort(byPopularity);
      const heroPool = (featured.length ? featured : [...pool].sort(byPopularity)).slice(0, 8);
      heroSlot.replaceChildren(...(heroPool.length ? [createHero(heroPool)] : []));
      rows.replaceChildren(personalSlot, ...curatedRows(library, pool));
      refreshPersonalRows();
    })
    .catch(() => {
      if (!page.isConnected) return;
      heroSlot.replaceChildren();
      rows.classList.add('rows--plain');
      rows.replaceChildren(
        errorState('We couldn’t load shows right now.', () => {
          main.replaceChildren();
          renderHome(main);
        }),
      );
    });
}

/** Continue Watching + My List rows. Called again whenever those change. */
export function refreshPersonalRows() {
  if (!personalSlot?.isConnected) return;
  const profile = store.activeProfile();
  const continuing = forProfile(remember(store.continueWatching().map((entry) => entry.show)));
  const myList = forProfile(remember(store.myList()));
  const rows = [];
  if (continuing.length) {
    rows.push(createRow({ title: `Continue Watching${profile ? ` for ${profile.name}` : ''}`, shows: continuing }));
  }
  if (myList.length) rows.push(createRow({ title: 'My List', shows: myList, href: '#/my-list' }));
  personalSlot.replaceChildren(...rows);
}

function curatedRows(library, pool) {
  const rows = [];
  const featured = forProfile(library.featured);

  const top10 = [...(featured.length >= 10 ? featured : pool)].sort(byPopularity).slice(0, 10);
  if (top10.length >= 5) rows.push(createRow({ title: 'Top 10 Series Today', shows: top10, ranked: true }));

  const used = new Set(top10.map((show) => show.id));
  const trending = [...pool].sort(byPopularity).filter((show) => !used.has(show.id)).slice(0, 30);
  if (trending.length >= 5) rows.push(createRow({ title: 'Trending Now', shows: trending, href: '#/browse' }));

  const streaming = forProfile(library.streaming).slice(0, 30);
  if (streaming.length >= 5) rows.push(createRow({ title: 'New Episodes on Streaming Today', shows: streaming, href: '#/new' }));

  const acclaimed = pool.filter((show) => (show.rating || 0) >= 8.3).sort(byRating).slice(0, 30);
  if (acclaimed.length >= 5) rows.push(createRow({ title: 'Critically Acclaimed', shows: acclaimed }));

  for (const { genre, title } of GENRE_ROWS) {
    const shows = pool.filter((show) => show.genres.includes(genre)).sort(byPopularity).slice(0, 30);
    if (shows.length >= 6) rows.push(createRow({ title, shows, href: `#/browse/${encodeURIComponent(genre)}` }));
  }
  return rows;
}

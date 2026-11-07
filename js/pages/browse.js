/**
 * browse.js — every series in a grid, filtered by genre chips and sortable.
 * Routes: #/browse (all) and #/browse/:genre
 */
import { el, esc } from '../core/utils.js';
import { byName, byNewest, byPopularity, byRating, forProfile, genreCounts, loadLibrary } from '../core/catalog.js';
import { cardMarkup, skeletonCards } from '../components/card.js';
import { emptyState, errorState } from '../components/states.js';
import { icons } from '../components/icons.js';

const SORTS = {
  popular: { label: 'Most popular', compare: byPopularity },
  rating: { label: 'Highest rated', compare: byRating },
  newest: { label: 'Newest first', compare: byNewest },
  az: { label: 'A–Z', compare: byName },
};
let sortKey = 'popular'; // remembered while the app is open

export function renderBrowse(main, genre = 'All') {
  const isAll = genre === 'All';
  const page = el(`
    <div class="page page--browse">
      <header class="page-head">
        <h1 class="page-title">${isAll ? 'Browse all series' : esc(genre)}</h1>
        <label class="select">
          <span class="visually-hidden">Sort by</span>
          <select data-sort>
            ${Object.entries(SORTS).map(([key, s]) => `<option value="${key}">${esc(s.label)}</option>`).join('')}
          </select>${icons.chevronDown}
        </label>
      </header>
      <nav class="chips" aria-label="Genres" data-chips></nav>
      <p class="result-count" data-count aria-live="polite"></p>
      <ul class="grid" role="list" data-grid>${skeletonCards(18)}</ul>
    </div>`);
  main.append(page);

  const grid = page.querySelector('[data-grid]');
  const count = page.querySelector('[data-count]');
  const select = page.querySelector('[data-sort]');
  select.value = sortKey;

  loadLibrary()
    .then((library) => {
      if (!page.isConnected) return;
      const pool = forProfile(library.all);
      const genres = genreCounts(pool).slice(0, 20).map(([g]) => g);
      page.querySelector('[data-chips]').innerHTML = ['All', ...genres]
        .map((g) => {
          const href = g === 'All' ? '#/browse' : `#/browse/${encodeURIComponent(g)}`;
          const active = g === genre;
          return `<a class="chip${active ? ' is-active' : ''}" href="${href}"${active ? ' aria-current="page"' : ''}>${esc(g)}</a>`;
        })
        .join('');

      const list = isAll ? pool : pool.filter((show) => show.genres.includes(genre));
      const draw = () => {
        const sorted = [...list].sort(SORTS[sortKey].compare);
        count.textContent = `${sorted.length} series`;
        if (!sorted.length) {
          grid.replaceChildren(
            emptyState({ title: `No ${genre} series yet`, text: 'Try another genre.', href: '#/browse', cta: 'Browse all' }),
          );
          return;
        }
        grid.innerHTML = sorted.map((show) => cardMarkup(show)).join('');
      };
      select.addEventListener('change', () => {
        sortKey = select.value;
        draw();
      });
      draw();
    })
    .catch(() => {
      if (!page.isConnected) return;
      grid.replaceChildren(
        errorState('We couldn’t load the catalog.', () => {
          main.replaceChildren();
          renderBrowse(main, genre);
        }),
      );
    });
}

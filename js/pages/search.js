/**
 * search.js — live search results (#/search?q=…) powered by TVmaze /search/shows.
 * The page stays mounted while you type; only the results area updates.
 */
import { el, esc } from '../core/utils.js';
import { searchShows } from '../core/api.js';
import { GENRE_ROWS, forProfile, remember } from '../core/catalog.js';
import { cardMarkup, skeletonCards } from '../components/card.js';
import { emptyState, errorState } from '../components/states.js';

const current = { page: null, query: null, token: 0 };

export function renderSearch(main, query) {
  const page = el(`
    <div class="page page--search">
      <header class="page-head"><h1 class="page-title" data-title>Search</h1></header>
      <div data-results></div>
    </div>`);
  main.append(page);
  current.page = page;
  current.query = null;
  updateSearch(query);
}

export function updateSearch(query) {
  const { page } = current;
  if (!page?.isConnected) return;
  const q = (query || '').trim();
  if (q === current.query) return;
  current.query = q;

  const title = page.querySelector('[data-title]');
  const results = page.querySelector('[data-results]');
  const token = ++current.token;

  if (q.length < 2) {
    title.textContent = 'Search';
    results.replaceChildren(
      el(`<div class="search-intro">
        <p class="state-text">Type at least two letters in the search box to find any TV series. Or jump into a genre:</p>
        <nav class="chips" aria-label="Popular genres">${GENRE_ROWS.map(
          ({ genre }) => `<a class="chip" href="#/browse/${encodeURIComponent(genre)}">${esc(genre)}</a>`,
        ).join('')}</nav>
      </div>`),
    );
    return;
  }

  title.innerHTML = `Results for <span class="accent">“${esc(q)}”</span>`;
  results.innerHTML = `<ul class="grid" role="list">${skeletonCards(12)}</ul>`;

  searchShows(q)
    .then((shows) => {
      if (token !== current.token || !page.isConnected) return;
      remember(shows);
      const visible = forProfile(shows);
      if (!visible.length) {
        results.replaceChildren(
          emptyState({ title: `No matches for “${q}”`, text: 'Check the spelling or try a different title.', href: '#/browse', cta: 'Browse all series' }),
        );
        return;
      }
      results.innerHTML = `
        <p class="result-count" aria-live="polite">${visible.length} result${visible.length === 1 ? '' : 's'}</p>
        <ul class="grid" role="list">${visible.map((show) => cardMarkup(show)).join('')}</ul>`;
    })
    .catch(() => {
      if (token !== current.token || !page.isConnected) return;
      results.replaceChildren(
        errorState('Search is unavailable right now.', () => {
          current.query = null;
          updateSearch(q);
        }),
      );
    });
}

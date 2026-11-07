/**
 * new-popular.js — "New & Popular": today's streaming releases and popularity rows.
 */
import { el } from '../core/utils.js';
import { byNewest, byPopularity, byRating, forProfile, loadLibrary } from '../core/catalog.js';
import { createRow, skeletonRow } from '../components/row.js';
import { errorState } from '../components/states.js';

export function renderNewPopular(main) {
  const page = el(`
    <div class="page page--rows">
      <header class="page-head"><h1 class="page-title">New &amp; Popular</h1></header>
      <div class="rows rows--plain" data-rows></div>
    </div>`);
  main.append(page);
  const rows = page.querySelector('[data-rows]');
  rows.append(skeletonRow(), skeletonRow());

  loadLibrary()
    .then((library) => {
      if (!page.isConnected) return;
      const pool = forProfile(library.all);
      const sections = [
        { title: 'New Episodes on Streaming Today', shows: forProfile(library.streaming).slice(0, 30) },
        { title: 'Recently Premiered', shows: pool.filter((s) => s.premiered).sort(byNewest).slice(0, 30) },
        { title: 'Most Popular Right Now', shows: [...pool].sort(byPopularity).slice(0, 10), ranked: true },
        { title: 'Top Rated of All Time', shows: [...pool].sort(byRating).slice(0, 30) },
      ];
      rows.replaceChildren(...sections.filter((s) => s.shows.length >= 3).map((s) => createRow(s)));
    })
    .catch(() => {
      if (!page.isConnected) return;
      rows.replaceChildren(
        errorState('We couldn’t load new releases.', () => {
          main.replaceChildren();
          renderNewPopular(main);
        }),
      );
    });
}

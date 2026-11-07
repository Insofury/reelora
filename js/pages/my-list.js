/**
 * my-list.js — the active profile's saved shows (stored in localStorage).
 */
import { el, esc } from '../core/utils.js';
import { store } from '../core/store.js';
import { forProfile, remember } from '../core/catalog.js';
import { cardMarkup } from '../components/card.js';
import { emptyState } from '../components/states.js';

export function renderMyList(main) {
  const profile = store.activeProfile();
  const shows = forProfile(remember(store.myList()));
  const page = el(`
    <div class="page page--list">
      <header class="page-head">
        <h1 class="page-title">My List</h1>
        ${profile ? `<p class="page-sub">${shows.length} saved for ${esc(profile.name)}</p>` : ''}
      </header>
    </div>`);
  main.append(page);

  if (!shows.length) {
    page.append(
      emptyState({
        title: 'Your list is empty',
        text: 'Tap the + on any title to save it here for later.',
        href: '#/browse',
        cta: 'Find something to watch',
      }),
    );
    return;
  }
  page.append(el(`<ul class="grid" role="list">${shows.map((show) => cardMarkup(show)).join('')}</ul>`));
}

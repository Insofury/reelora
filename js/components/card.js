/**
 * card.js — the poster card used in rows and grids, plus shared bits
 * (meta line, poster image, My List button) reused by the hero and the modal.
 */
import { esc, formatRuntime, safeUrl } from '../core/utils.js';
import { store } from '../core/store.js';
import { icons } from './icons.js';

/** "★ 8.7" badge, or '' when TVmaze has no rating yet. */
export const ratingHtml = (show) =>
  show.rating ? `<span class="rating" aria-label="Rated ${Number(show.rating).toFixed(1)} out of 10">${icons.star}${Number(show.rating).toFixed(1)}</span>` : '';

/** Rating, year and runtime as small HTML fragments. */
export function metaParts(show) {
  return [
    ratingHtml(show),
    show.year ? esc(show.year) : '',
    show.runtime ? esc(formatRuntime(show.runtime)) : '',
  ].filter(Boolean);
}

export const joinMeta = (parts) => parts.join('<span class="sep" aria-hidden="true">•</span>');

export function posterImg(show, className = 'card-img') {
  const src = safeUrl(show.poster);
  return src
    ? `<img class="${className}" src="${esc(src)}" alt="" loading="lazy" decoding="async" width="210" height="295">`
    : `<div class="${className} card-fallback" aria-hidden="true"><span>${esc(show.name)}</span></div>`;
}

function listLabel(name, inList) {
  return inList ? `Remove ${name} from My List` : `Add ${name} to My List`;
}

/** "+" / "✓" toggle. `labeled` renders a wide button with text (hero, modal). */
export function listButton(show, { labeled = false, className = '' } = {}) {
  const inList = store.inList(show.id);
  const base = labeled ? 'btn btn-secondary' : 'icon-btn';
  return `<button type="button" class="${base} ${className}" data-action="list" data-id="${show.id}"
    data-name="${esc(show.name)}" data-labeled="${labeled}" aria-pressed="${inList}"
    aria-label="${esc(listLabel(show.name, inList))}" title="${inList ? 'Remove from My List' : 'Add to My List'}">
    ${inList ? icons.check : icons.plus}${labeled ? `<span>${inList ? 'In My List' : 'My List'}</span>` : ''}
  </button>`;
}

/** Update every My List button on the page after the list changes. */
export function syncListButtons(root = document) {
  root.querySelectorAll('[data-action="list"][data-id]').forEach((button) => {
    const inList = store.inList(button.dataset.id);
    const labeled = button.dataset.labeled === 'true';
    button.setAttribute('aria-pressed', String(inList));
    button.setAttribute('aria-label', listLabel(button.dataset.name || 'this show', inList));
    button.title = inList ? 'Remove from My List' : 'Add to My List';
    button.innerHTML = `${inList ? icons.check : icons.plus}${labeled ? `<span>${inList ? 'In My List' : 'My List'}</span>` : ''}`;
  });
}

/** One poster card inside an <li>. `rank` adds the big Top 10 number. */
export function cardMarkup(show, { rank = 0 } = {}) {
  const label = `${show.name}${show.year ? ` (${show.year})` : ''}`;
  const genres = (show.genres || []).slice(0, 3).map(esc).join('<span class="sep" aria-hidden="true">•</span>');
  return `
  <li class="card-item${rank ? ' is-ranked' : ''}">
    ${rank ? `<span class="rank" aria-hidden="true">${rank}</span>` : ''}
    <article class="card" data-id="${show.id}">
      <a class="card-link" href="#/title/${show.id}" aria-label="${esc(rank ? `Number ${rank}: ${label}` : label)}">
        ${posterImg(show)}
      </a>
      <div class="card-hover">
        <div class="card-actions">
          <button type="button" class="icon-btn icon-btn--solid" data-action="play" data-id="${show.id}" aria-label="Play ${esc(show.name)}">${icons.play}</button>
          ${listButton(show)}
          <a class="icon-btn icon-btn--end" href="#/title/${show.id}" aria-label="More info about ${esc(show.name)}" title="More info">${icons.chevronDown}</a>
        </div>
        <h3 class="card-title">${esc(show.name)}</h3>
        <p class="card-meta">${joinMeta(metaParts(show))}</p>
        ${genres ? `<p class="card-genres">${genres}</p>` : ''}
      </div>
    </article>
  </li>`;
}

export function skeletonCards(count = 8) {
  return Array.from({ length: count }, () => '<li class="card-item"><div class="card card--skeleton sk"></div></li>').join('');
}

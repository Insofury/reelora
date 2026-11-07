/**
 * row.js — a horizontally scrolling row of cards ("Trending Now", genre rows…).
 *
 * - Native scrolling + scroll-snap (works with touch, trackpad and keyboard);
 *   arrow buttons page through the row on devices with a mouse.
 * - Lazy rendering: a row shows light skeletons and only builds its cards when it
 *   comes within ~500px of the viewport (IntersectionObserver). The home page has
 *   ~17 rows / ~470 posters, so this keeps the first paint fast.
 */
import { el, esc, prefersReducedMotion } from '../core/utils.js';
import { cardMarkup, skeletonCards } from './card.js';
import { icons } from './icons.js';

let rowId = 0;
const fillers = new WeakMap();

const lazyObserver =
  'IntersectionObserver' in window
    ? new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            lazyObserver.unobserve(entry.target);
            fillers.get(entry.target)?.();
            fillers.delete(entry.target);
          }
        },
        { rootMargin: '500px 0px' },
      )
    : null;

export function createRow({ title, shows, ranked = false, href = '' }) {
  rowId += 1;
  const headingId = `row-title-${rowId}`;
  const section = el(`
    <section class="row${ranked ? ' row--ranked' : ''}" aria-labelledby="${headingId}">
      <div class="row-head">
        <h2 class="row-title" id="${headingId}">${esc(title)}</h2>
        ${href ? `<a class="row-more" href="${esc(href)}">Explore all${icons.chevronRight}</a>` : ''}
      </div>
      <div class="row-viewport">
        <button type="button" class="row-arrow row-arrow--prev" aria-label="Scroll ${esc(title)} left" hidden>${icons.chevronLeft}</button>
        <ul class="row-track" role="list">${skeletonCards(Math.min(shows.length, 8))}</ul>
        <button type="button" class="row-arrow row-arrow--next" aria-label="Scroll ${esc(title)} right" hidden>${icons.chevronRight}</button>
      </div>
    </section>`);

  const track = section.querySelector('.row-track');
  const prev = section.querySelector('.row-arrow--prev');
  const next = section.querySelector('.row-arrow--next');

  const update = () => {
    const max = track.scrollWidth - track.clientWidth;
    prev.hidden = track.scrollLeft <= 4;
    next.hidden = track.scrollLeft >= max - 4;
  };
  const page = (direction) =>
    track.scrollBy({
      left: direction * track.clientWidth * 0.9,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });

  prev.addEventListener('click', () => page(-1));
  next.addEventListener('click', () => page(1));

  let frame = 0;
  track.addEventListener(
    'scroll',
    () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    },
    { passive: true },
  );

  const fill = () => {
    track.innerHTML = shows.map((show, i) => cardMarkup(show, { rank: ranked ? i + 1 : 0 })).join('');
    if ('ResizeObserver' in window) new ResizeObserver(update).observe(track);
    update();
  };

  if (lazyObserver) {
    fillers.set(section, fill);
    lazyObserver.observe(section);
  } else {
    fill();
  }
  return section;
}

export function skeletonRow() {
  return el(`
    <section class="row" aria-hidden="true">
      <div class="row-head"><div class="sk sk-line sk-w20"></div></div>
      <div class="row-viewport"><ul class="row-track" role="list">${skeletonCards(8)}</ul></div>
    </section>`);
}

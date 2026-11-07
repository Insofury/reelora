/**
 * hero.js — the big "billboard" at the top of the home page.
 * Renders instantly with a blurred poster, then swaps in the landscape backdrop
 * and the show's title logo once the artwork request finishes.
 */
import { el, esc, pickRandom, safeUrl, truncate } from '../core/utils.js';
import { getArtwork } from '../core/api.js';
import { icons } from './icons.js';
import { joinMeta, listButton, metaParts } from './card.js';
import { markSVG } from './brand.js';

export function heroSkeleton() {
  return el(`
    <section class="hero hero--skeleton" aria-hidden="true">
      <div class="hero-content">
        <div class="sk sk-line sk-w20"></div>
        <div class="sk sk-title"></div>
        <div class="sk sk-line sk-w60"></div>
        <div class="sk sk-line sk-w40"></div>
      </div>
    </section>`);
}

export function createHero(candidates) {
  const show = pickRandom(candidates);
  const genres = (show.genres || []).slice(0, 3).map(esc).join(', ');
  const section = el(`
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-media"></div>
      <div class="hero-shade"></div>
      <div class="hero-content">
        <p class="hero-kicker">${markSVG('hero-kicker-mark')}<span>Featured Series</span></p>
        <h1 class="hero-title" id="hero-title"><span class="hero-title-text">${esc(show.name)}</span></h1>
        <p class="hero-meta">${joinMeta([...metaParts(show), genres].filter(Boolean))}</p>
        <p class="hero-summary">${esc(truncate(show.summary, 220))}</p>
        <div class="hero-actions">
          <button type="button" class="btn btn-primary" data-action="play" data-id="${show.id}">${icons.play}<span>Play</span></button>
          <button type="button" class="btn btn-secondary" data-action="info" data-id="${show.id}">${icons.info}<span>More Info</span></button>
          ${listButton(show, { className: 'icon-btn--lg' })}
        </div>
      </div>
    </section>`);

  /** Fade an image into the billboard once it has loaded. */
  const showImage = (src, className) => {
    if (!src) return;
    const img = new Image();
    img.className = className;
    img.alt = '';
    img.decoding = 'async';
    img.onload = () => {
      section.querySelector('.hero-media').replaceChildren(img);
      requestAnimationFrame(() => img.classList.add('is-ready'));
    };
    img.src = src;
  };
  const posterFallback = () => showImage(safeUrl(show.posterLarge), 'hero-img hero-img--poster');

  getArtwork(show.id)
    .then((art) => {
      const backdrop = safeUrl(art.backdrop);
      if (backdrop) showImage(backdrop, 'hero-img');
      else posterFallback();
      const logo = safeUrl(art.logo);
      if (logo) {
        const logoImg = new Image();
        logoImg.className = 'hero-logo';
        logoImg.alt = show.name;
        logoImg.onload = () => section.querySelector('.hero-title').replaceChildren(logoImg);
        logoImg.src = logo;
      }
    })
    .catch(posterFallback); // artwork request failed: use the poster

  return section;
}

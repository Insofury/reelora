/**
 * modal.js — the title details pop-up (#/title/:id).
 *
 * Built on the native <dialog> element: it traps focus, makes the page behind it
 * inert and closes on Esc for free. Content: backdrop, actions, synopsis, cast,
 * season picker with episodes, "More Like This" and an About block.
 */
import { $, esc, formatRuntime, safeUrl } from '../core/utils.js';
import { getArtwork, getShowDetails } from '../core/api.js';
import { forProfile, loadLibrary, lookup, remember, similarTo } from '../core/catalog.js';
import { icons } from './icons.js';
import { joinMeta, listButton, metaParts, posterImg, ratingHtml } from './card.js';

let requestClose = null;
let token = 0;

const dialog = () => $('#title-modal');

export function initModal() {
  const node = dialog();
  node.addEventListener('cancel', (event) => {
    event.preventDefault(); // let the router decide what "close" means
    close();
  });
  node.addEventListener('click', (event) => {
    if (event.target === node || event.target.closest('[data-close]')) close();
  });
}

function close() {
  if (requestClose) requestClose();
  else closeTitleModal();
}

export function openTitleModal(id, { onClose } = {}) {
  const node = dialog();
  requestClose = onClose || null;
  const current = ++token;

  node.innerHTML = loadingTemplate(lookup(id));
  if (!node.open) {
    node.showModal();
    document.documentElement.classList.add('modal-open');
  }
  node.scrollTop = 0;

  Promise.all([getShowDetails(id), getArtwork(id).catch(() => ({ backdrop: '', logo: '' }))])
    .then(([details, art]) => {
      if (current !== token || !node.open) return;
      remember([details]);
      node.innerHTML = detailTemplate(details, art);
      wireSeasons(node, details);
      fillSimilar(node, details, current);
      node.querySelector('.modal-close')?.focus({ preventScroll: true });
    })
    .catch(() => {
      if (current !== token || !node.open) return;
      node.innerHTML = errorTemplate();
      node.querySelector('[data-retry]')?.addEventListener('click', () => openTitleModal(id, { onClose }));
    });
}

export function closeTitleModal() {
  const node = dialog();
  token += 1;
  requestClose = null;
  if (node.open) node.close();
  node.innerHTML = '';
  document.documentElement.classList.remove('modal-open');
}

/* ---------- templates ---------- */

const closeButton = () =>
  `<button type="button" class="icon-btn modal-close" data-close aria-label="Close details">${icons.close}</button>`;

function loadingTemplate(preview) {
  const poster = preview ? safeUrl(preview.posterLarge) : '';
  return `
    <div class="modal-inner" aria-busy="true">
      ${closeButton()}
      <div class="modal-hero">
        ${poster ? `<img class="modal-backdrop modal-backdrop--poster" src="${esc(poster)}" alt="">` : ''}
        <div class="modal-hero-shade"></div>
        <div class="modal-hero-content">
          <h2 class="modal-title" id="modal-title">${esc(preview?.name || 'Loading…')}</h2>
        </div>
      </div>
      <div class="modal-body">
        <div class="sk sk-line sk-w60"></div><div class="sk sk-line"></div><div class="sk sk-line sk-w80"></div>
      </div>
    </div>`;
}

function errorTemplate() {
  return `
    <div class="modal-inner">
      ${closeButton()}
      <div class="modal-body modal-error">
        <h2 id="modal-title">We couldn't load this title</h2>
        <p>TVmaze may be busy. Check your connection and try again.</p>
        <button type="button" class="btn btn-primary" data-retry>${icons.refresh}<span>Try again</span></button>
      </div>
    </div>`;
}

function yearsLabel(show) {
  if (!show.year) return '';
  if (show.ended) return `${show.year}–${show.ended.slice(0, 4)}`;
  return show.status === 'Running' ? `${show.year}–present` : show.year;
}

function seasonNumbers(details) {
  return [...new Set(details.episodes.map((ep) => ep.season))].sort((a, b) => a - b);
}

function detailTemplate(details, art) {
  const backdrop = safeUrl(art.backdrop);
  const logo = safeUrl(art.logo);
  const seasons = seasonNumbers(details);
  const castNames = details.cast.slice(0, 4).map((c) => esc(c.name)).join(', ');
  const site = safeUrl(details.officialSite);
  const tvmaze = safeUrl(details.url);
  const statusBadge = details.status ? `<span class="badge">${esc(details.status)}</span>` : '';
  const seasonsLabel = seasons.length ? `${seasons.length} Season${seasons.length > 1 ? 's' : ''}` : '';

  return `
    <div class="modal-inner">
      ${closeButton()}
      <div class="modal-hero">
        ${
          backdrop
            ? `<img class="modal-backdrop" src="${esc(backdrop)}" alt="">`
            : `<img class="modal-backdrop modal-backdrop--poster" src="${esc(safeUrl(details.posterLarge))}" alt="">`
        }
        <div class="modal-hero-shade"></div>
        <div class="modal-hero-content">
          <h2 class="modal-title" id="modal-title">${
            logo ? `<img class="modal-logo" src="${esc(logo)}" alt="${esc(details.name)}">` : esc(details.name)
          }</h2>
          <div class="modal-actions">
            <button type="button" class="btn btn-primary" data-action="play" data-id="${details.id}">${icons.play}<span>Play</span></button>
            ${listButton(details, { labeled: true })}
          </div>
        </div>
      </div>

      <div class="modal-body">
        <div class="modal-grid">
          <div>
            <p class="modal-meta">${joinMeta(
              [ratingHtml(details), esc(yearsLabel(details)), esc(seasonsLabel), esc(formatRuntime(details.runtime)), statusBadge].filter(Boolean),
            )}</p>
            <p class="modal-summary">${esc(details.summaryFull || details.summary || 'No synopsis available yet.')}</p>
          </div>
          <dl class="modal-facts">
            ${castNames ? `<div><dt>Cast</dt><dd>${castNames}</dd></div>` : ''}
            ${details.genres.length ? `<div><dt>Genres</dt><dd>${details.genres.map(esc).join(', ')}</dd></div>` : ''}
            ${details.network ? `<div><dt>Network</dt><dd>${esc(details.network)}</dd></div>` : ''}
          </dl>
        </div>

        ${
          seasons.length
            ? `<section class="modal-section episodes" aria-labelledby="episodes-title">
                <div class="section-head">
                  <h3 id="episodes-title">Episodes</h3>
                  ${
                    seasons.length > 1
                      ? `<label class="select"><span class="visually-hidden">Season</span>
                          <select data-season-select>${seasons
                            .map((n) => `<option value="${n}">Season ${n}</option>`)
                            .join('')}</select>${icons.chevronDown}</label>`
                      : `<span class="section-note">Season ${seasons[0]}</span>`
                  }
                </div>
                <ol class="episode-list" data-episodes>${episodeItems(details, seasons[0])}</ol>
              </section>`
            : ''
        }

        ${
          details.cast.length
            ? `<section class="modal-section" aria-labelledby="cast-title">
                <h3 id="cast-title">Cast</h3>
                <ul class="cast-list" role="list">${details.cast
                  .map(
                    (c) => `<li class="cast-item">
                      ${
                        safeUrl(c.photo)
                          ? `<img src="${esc(safeUrl(c.photo))}" alt="" loading="lazy" width="96" height="96">`
                          : `<span class="cast-fallback" aria-hidden="true">${esc((c.name || '?').charAt(0))}</span>`
                      }
                      <span class="cast-name">${esc(c.name)}</span>
                      ${c.character ? `<span class="cast-role">${esc(c.character)}</span>` : ''}
                    </li>`,
                  )
                  .join('')}</ul>
              </section>`
            : ''
        }

        <section class="modal-section" aria-labelledby="similar-title" data-similar hidden>
          <h3 id="similar-title">More Like This</h3>
          <ul class="similar-grid" role="list"></ul>
        </section>

        <section class="modal-section about" aria-labelledby="about-title">
          <h3 id="about-title">About <strong>${esc(details.name)}</strong></h3>
          <dl class="about-list">
            ${details.genres.length ? `<div><dt>Genres</dt><dd>${details.genres
              .map((g) => `<a href="#/browse/${encodeURIComponent(g)}">${esc(g)}</a>`)
              .join(', ')}</dd></div>` : ''}
            ${details.premiered ? `<div><dt>Premiered</dt><dd>${esc(details.premiered)}</dd></div>` : ''}
            ${details.language ? `<div><dt>Language</dt><dd>${esc(details.language)}</dd></div>` : ''}
            ${details.type ? `<div><dt>Type</dt><dd>${esc(details.type)}</dd></div>` : ''}
            <div><dt>Links</dt><dd>
              ${site ? `<a href="${esc(site)}" target="_blank" rel="noopener noreferrer">Official site${icons.external}</a>` : ''}
              ${tvmaze ? `<a href="${esc(tvmaze)}" target="_blank" rel="noopener noreferrer">View on TVmaze${icons.external}</a>` : ''}
            </dd></div>
          </dl>
        </section>
      </div>
    </div>`;
}

function episodeItems(details, season) {
  const episodes = details.episodes.filter((ep) => ep.season === season);
  return episodes
    .map((ep) => {
      const img = safeUrl(ep.image);
      return `
      <li class="episode">
        <button type="button" class="episode-btn" data-action="play" data-id="${details.id}"
          aria-label="Play episode ${ep.number ?? ''}: ${esc(ep.name)}">
          <span class="episode-num" aria-hidden="true">${ep.number ?? '•'}</span>
          <span class="episode-thumb">
            ${img ? `<img src="${esc(img)}" alt="" loading="lazy" width="250" height="140">` : '<span class="episode-thumb-fallback"></span>'}
            <span class="episode-play" aria-hidden="true">${icons.play}</span>
          </span>
          <span class="episode-text">
            <span class="episode-head"><strong>${esc(ep.name)}</strong><span>${esc(formatRuntime(ep.runtime))}</span></span>
            <span class="episode-summary">${esc(ep.summary || 'No synopsis available yet.')}</span>
          </span>
        </button>
      </li>`;
    })
    .join('');
}

function wireSeasons(node, details) {
  const select = node.querySelector('[data-season-select]');
  if (!select) return;
  select.addEventListener('change', () => {
    node.querySelector('[data-episodes]').innerHTML = episodeItems(details, Number(select.value));
  });
}

function fillSimilar(node, details, current) {
  loadLibrary()
    .then((library) => {
      if (current !== token) return;
      const similar = similarTo(details, forProfile(library.all), 8);
      const section = node.querySelector('[data-similar]');
      if (!similar.length || !section) return;
      section.querySelector('ul').innerHTML = similar
        .map(
          (show) => `
          <li class="similar-card">
            <a href="#/title/${show.id}" class="similar-link" aria-label="${esc(show.name)}">${posterImg(show, 'similar-img')}</a>
            <div class="similar-info">
              <p class="similar-meta">${joinMeta(metaParts(show))}</p>
              ${listButton(show)}
            </div>
            <p class="similar-name">${esc(show.name)}</p>
          </li>`,
        )
        .join('');
      section.hidden = false;
    })
    .catch(() => {
      /* "More Like This" is optional */
    });
}

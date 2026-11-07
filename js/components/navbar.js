/**
 * navbar.js — top navigation: logo, section links, live search and profile menu.
 * Transparent over the billboard, solid once the page scrolls.
 */
import { $, debounce, esc } from '../core/utils.js';
import { navigate, parseHash } from '../core/router.js';
import { store } from '../core/store.js';
import { icons } from './icons.js';
import { logoMarkup } from './brand.js';
import { avatar } from './profiles.js';

const LINKS = [
  { key: 'home', href: '#/', label: 'Home' },
  { key: 'browse', href: '#/browse', label: 'Browse' },
  { key: 'new', href: '#/new', label: 'New & Popular' },
  { key: 'my-list', href: '#/my-list', label: 'My List' },
];

export const REPO_URL = 'https://github.com/Insofury/reelora';

export function mountNavbar(root, { onSwitchProfile }) {
  root.innerHTML = `
    <div class="nav-inner">
      <a class="brand" href="#/" aria-label="Reelora home">${logoMarkup()}</a>
      <nav class="nav-links" aria-label="Primary">
        ${LINKS.map((l) => `<a href="${l.href}" data-nav="${l.key}">${esc(l.label)}</a>`).join('')}
      </nav>
      <details class="nav-menu">
        <summary>Browse${icons.chevronDown}</summary>
        <div class="nav-menu-panel">
          ${LINKS.map((l) => `<a href="${l.href}" data-nav="${l.key}">${esc(l.label)}</a>`).join('')}
        </div>
      </details>
      <div class="nav-tools">
        <form class="search" role="search" data-search>
          <button type="button" class="icon-btn search-toggle" aria-label="Open search" aria-expanded="false">${icons.search}</button>
          <label class="visually-hidden" for="search-input">Search shows</label>
          <input id="search-input" class="search-input" type="search" placeholder="Titles, genres…" autocomplete="off" enterkeyhint="search">
        </form>
        <div class="profile-menu">
          <button type="button" class="avatar-btn" aria-haspopup="true" aria-expanded="false" aria-controls="profile-panel">
            <span data-avatar></span>${icons.chevronDown}
          </button>
          <div class="menu" id="profile-panel" hidden>
            <p class="menu-label" data-profile-name></p>
            <button type="button" class="menu-item" data-switch>${icons.user}<span>Switch profile</span></button>
            <a class="menu-item" href="#/my-list">${icons.check}<span>My List</span></a>
            <a class="menu-item" href="${REPO_URL}" target="_blank" rel="noopener noreferrer">${icons.github}<span>View source</span></a>
          </div>
        </div>
      </div>
    </div>`;

  /* solid background after scrolling */
  const onScroll = () => root.classList.toggle('is-solid', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* search */
  const form = $('[data-search]', root);
  const input = $('#search-input', root);
  const toggle = $('.search-toggle', root);
  const open = () => {
    form.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    input.focus();
  };
  toggle.addEventListener('click', () => (form.classList.contains('is-open') ? input.focus() : open()));
  input.addEventListener('blur', () => {
    if (!input.value.trim()) {
      form.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
  const runSearch = debounce(() => {
    const q = input.value.trim();
    const onSearch = parseHash().path === '/search';
    if (q.length >= 2) navigate(`/search?q=${encodeURIComponent(q)}`, { replace: onSearch });
    else if (!q && onSearch) navigate('/search', { replace: true });
  }, 350);
  input.addEventListener('input', runSearch);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const q = input.value.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`, { replace: parseHash().path === '/search' });
  });

  /* profile menu */
  const avatarButton = $('.avatar-btn', root);
  const panel = $('#profile-panel', root);
  const setMenu = (show) => {
    panel.hidden = !show;
    avatarButton.setAttribute('aria-expanded', String(show));
  };
  avatarButton.addEventListener('click', (event) => {
    event.stopPropagation();
    setMenu(panel.hidden);
  });
  document.addEventListener('click', (event) => {
    if (!panel.hidden && !event.target.closest('.profile-menu')) setMenu(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) {
      setMenu(false);
      avatarButton.focus();
    }
  });
  panel.addEventListener('click', (event) => {
    if (event.target.closest('[data-switch]')) {
      setMenu(false);
      onSwitchProfile?.();
    } else if (event.target.closest('a')) {
      setMenu(false);
    }
  });

  /* close the mobile menu after choosing a link */
  const mobileMenu = $('.nav-menu', root);
  mobileMenu.addEventListener('click', (event) => {
    if (event.target.closest('a')) mobileMenu.open = false;
  });

  refreshProfile(root);
}

export function refreshProfile(root = document.getElementById('nav')) {
  const profile = store.activeProfile();
  $('[data-avatar]', root).innerHTML = profile ? avatar(profile) : `<span class="avatar">${icons.user}</span>`;
  $('[data-profile-name]', root).textContent = profile ? `Watching as ${profile.name}${profile.kids ? ' (Kids)' : ''}` : '';
  $('.avatar-btn', root).setAttribute('aria-label', profile ? `Profile menu for ${profile.name}` : 'Profile menu');
}

/** Highlight the current section and keep the search box in sync with the URL. */
export function setActiveNav(key, query = '') {
  const root = document.getElementById('nav');
  root.querySelectorAll('[data-nav]').forEach((link) => {
    const active = link.dataset.nav === key;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  const input = $('#search-input', root);
  if (key === 'search') {
    $('[data-search]', root).classList.add('is-open');
    if (document.activeElement !== input) input.value = query;
  } else if (document.activeElement !== input) {
    input.value = '';
    $('[data-search]', root).classList.remove('is-open');
  }
}

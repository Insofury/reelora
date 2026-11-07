/**
 * app.js — entry point and controller.
 *
 * Wires the router to the pages, keeps one "base page" rendered underneath the
 * overlays (title modal, video player), handles global button actions via event
 * delegation, reacts to store changes and registers the service worker.
 */
import { $ } from './core/utils.js';
import { addRoute, navigate, navigationCount, parseHash, setFallback, startRouter } from './core/router.js';
import { store } from './core/store.js';
import { lookup } from './core/catalog.js';
import { mountNavbar, refreshProfile, setActiveNav } from './components/navbar.js';
import { closeTitleModal, initModal, openTitleModal } from './components/modal.js';
import { closePlayer, openPlayer } from './components/player.js';
import { hideProfileGate, showProfileGate } from './components/profiles.js';
import { syncListButtons } from './components/card.js';
import { toast } from './components/toast.js';
import { refreshPersonalRows, renderHome } from './pages/home.js';
import { renderBrowse } from './pages/browse.js';
import { renderNewPopular } from './pages/new-popular.js';
import { renderSearch, updateSearch } from './pages/search.js';
import { renderMyList } from './pages/my-list.js';

const main = $('#main');
const APP_NAME = 'Reelora';

let base = null; // { key, navKey, render } — the page under any overlay
let baseHash = '#/';
let progressChanged = false;

/* ---------- page & overlay management ---------- */

function closeOverlays() {
  closeTitleModal();
  closePlayer();
  if (progressChanged && base?.key === 'home') refreshPersonalRows();
  progressChanged = false;
}

function setTitle(text) {
  document.title = text ? `${text} · ${APP_NAME}` : `${APP_NAME} — Stream the stories you love`;
}

function showPage(key, render, { navKey = key.split(':')[0], title = '' } = {}) {
  closeOverlays();
  baseHash = location.hash || '#/';
  if (base?.key === key) return;
  base = { key, navKey, render };
  main.replaceChildren();
  window.scrollTo(0, 0);
  render(main);
  setActiveNav(navKey, parseHash().query.get('q') || '');
  setTitle(title);
}

/** Overlays opened by deep link need a page underneath them. */
function ensureBase() {
  if (base) return;
  base = { key: 'home', navKey: 'home', render: renderHome };
  baseHash = '#/';
  renderHome(main);
  setActiveNav('home');
  setTitle('');
}

function rerenderBase() {
  if (!base) return;
  main.replaceChildren();
  base.render(main);
}

/** Close an overlay: go Back if we came from inside the app, else to the page underneath. */
function leaveOverlay() {
  if (navigationCount() > 1) history.back();
  else navigate(baseHash.replace(/^#/, '') || '/');
}

/* ---------- routes ---------- */

addRoute('/', () => showPage('home', renderHome));
addRoute('/browse', () => showPage('browse:All', (m) => renderBrowse(m, 'All'), { title: 'Browse' }));
addRoute('/browse/:genre', ({ params }) =>
  showPage(`browse:${params.genre}`, (m) => renderBrowse(m, params.genre), { navKey: 'browse', title: params.genre }),
);
addRoute('/new', () => showPage('new', renderNewPopular, { title: 'New & Popular' }));
addRoute('/my-list', () => showPage('my-list', renderMyList, { title: 'My List' }));
addRoute('/search', ({ query }) => {
  const q = query.get('q') || '';
  if (base?.key === 'search') {
    closeOverlays();
    baseHash = location.hash;
    updateSearch(q);
    setActiveNav('search', q);
  } else {
    showPage('search', (m) => renderSearch(m, parseHash().query.get('q') || ''), { title: 'Search' });
  }
});
addRoute('/title/:id', ({ params }) => {
  ensureBase();
  closePlayer();
  openTitleModal(Number(params.id), { onClose: leaveOverlay });
});
addRoute('/watch/:id', ({ params }) => {
  ensureBase();
  closeTitleModal();
  openPlayer(Number(params.id), { onClose: leaveOverlay });
});
setFallback(() => navigate('/', { replace: true }));

/* ---------- global actions (event delegation) ---------- */

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-action]');
  if (!trigger) return;
  const id = Number(trigger.dataset.id);
  const { action } = trigger.dataset;

  if (action === 'play') {
    event.preventDefault();
    navigate(`/watch/${id}`);
  } else if (action === 'info') {
    navigate(`/title/${id}`);
  } else if (action === 'list') {
    const show = lookup(id);
    if (!show) return;
    if (!store.activeProfile()) {
      openProfileGate();
      return;
    }
    const added = store.toggleList(show);
    toast(added ? `Added “${show.name}” to My List` : `Removed “${show.name}” from My List`);
  }
});

document.addEventListener('click', (event) => {
  if (event.target.closest('[data-skip]')) {
    event.preventDefault();
    main.focus();
  }
});

/* Press "/" anywhere to jump to search */
document.addEventListener('keydown', (event) => {
  if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (document.documentElement.matches('.modal-open, .player-open, .gate-open')) return;
  event.preventDefault();
  $('.search-toggle')?.click();
});

/* ---------- store reactions ---------- */

store.subscribe((type) => {
  if (type === 'list') {
    syncListButtons();
    if (base?.key === 'my-list') rerenderBase();
    else if (base?.key === 'home') refreshPersonalRows();
  } else if (type === 'progress') {
    progressChanged = true;
  } else if (type === 'profile') {
    refreshProfile();
    rerenderBase();
  }
});

function openProfileGate() {
  showProfileGate({ onPicked: () => hideProfileGate() });
}

/* ---------- boot ---------- */

mountNavbar($('#nav'), { onSwitchProfile: openProfileGate });
initModal();
startRouter();
if (!store.activeProfile()) openProfileGate();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

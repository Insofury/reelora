/**
 * sw.js — service worker that makes Reelora installable and usable offline.
 *
 *  - App shell (HTML/CSS/JS/icons): network-first, falling back to the cache
 *    when offline, so a new deploy shows up on the next visit.
 *  - TVmaze API responses: stale-while-revalidate (instant from cache,
 *    refreshed in the background), capped at 120 entries.
 *  - Posters/images are left to the browser's HTTP cache (they are cross-origin
 *    "opaque" responses that would bloat Cache Storage).
 */
const VERSION = 'reelora-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const API_CACHE = `${VERSION}-api`;
const API_LIMIT = 120;

const SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './manifest.webmanifest',
  './assets/favicon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './js/app.js',
  './js/core/api.js',
  './js/core/catalog.js',
  './js/core/router.js',
  './js/core/store.js',
  './js/core/utils.js',
  './js/components/brand.js',
  './js/components/card.js',
  './js/components/hero.js',
  './js/components/icons.js',
  './js/components/modal.js',
  './js/components/navbar.js',
  './js/components/player.js',
  './js/components/profiles.js',
  './js/components/row.js',
  './js/components/states.js',
  './js/components/toast.js',
  './js/pages/browse.js',
  './js/pages/home.js',
  './js/pages/my-list.js',
  './js/pages/new-popular.js',
  './js/pages/search.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request));
  } else if (url.hostname === 'api.tvmaze.com') {
    event.respondWith(staleWhileRevalidate(request, event));
  }
});

async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request, { ignoreSearch: true });
    return cached || (await cache.match('./index.html')) || Response.error();
  }
}

async function staleWhileRevalidate(request, event) {
  const cache = await caches.open(API_CACHE);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(request, response.clone());
        await trim(cache, API_LIMIT);
      }
      return response;
    })
    .catch(() => cached || Response.error());
  if (cached) {
    event.waitUntil(refresh);
    return cached;
  }
  return refresh;
}

async function trim(cache, max) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((key) => cache.delete(key)));
}

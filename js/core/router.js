/**
 * router.js — a tiny hash-based router.
 *
 * Hash URLs (#/title/169) work on GitHub Pages without any server rewrite rules,
 * every screen gets a shareable link, and the browser Back button just works.
 */

const routes = [];
let fallback = () => {};
let resolveCount = 0;

/** Register a route such as '/title/:id'. The handler receives { params, query, path }. */
export function addRoute(pattern, handler) {
  const keys = [];
  const source = pattern.replace(/\/:([^/]+)/g, (_, key) => {
    keys.push(key);
    return '/([^/]+)';
  });
  routes.push({ regex: new RegExp(`^${source}/?$`), keys, handler });
}

export function setFallback(handler) {
  fallback = handler;
}

export function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, queryString = ''] = raw.split('?');
  return { path: path || '/', query: new URLSearchParams(queryString) };
}

/** How many routes have been resolved since the page loaded (used to decide if "Back" is safe). */
export const navigationCount = () => resolveCount;

export function resolve() {
  resolveCount += 1;
  const { path, query } = parseHash();
  for (const route of routes) {
    const match = path.match(route.regex);
    if (match) {
      const params = Object.fromEntries(route.keys.map((key, i) => [key, decodeURIComponent(match[i + 1])]));
      route.handler({ params, query, path });
      return;
    }
  }
  fallback({ path, query });
}

/** Go to a path like '/browse/Drama'. `replace` swaps the current history entry. */
export function navigate(path, { replace = false } = {}) {
  const hash = `#${path}`;
  if (location.hash === hash) return;
  if (replace) {
    history.replaceState(history.state, '', hash);
    resolve();
  } else {
    location.hash = path;
  }
}

export function startRouter() {
  window.addEventListener('hashchange', resolve);
  resolve();
}

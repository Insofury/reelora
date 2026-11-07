/**
 * store.js — user state that lives in the browser (localStorage).
 *
 * Profiles ("Who's watching?"), the active profile, each profile's My List and
 * Continue Watching progress. Components subscribe to change events so the UI
 * stays in sync (e.g. every "+" button flips to "✓" when a show is added).
 */
import { storage } from './utils.js';

const KEYS = {
  profiles: 'reelora:profiles',
  active: 'reelora:active-profile',
  list: (profileId) => `reelora:list:${profileId}`,
  progress: (profileId) => `reelora:progress:${profileId}`,
};

const PALETTE = ['#2dd4bf', '#818cf8', '#f472b6', '#fbbf24', '#34d399', '#60a5fa'];
const MAX_PROFILES = 5;

const DEFAULT_PROFILES = [
  { id: 'ashish', name: 'Ashish', color: '#2dd4bf', kids: false },
  { id: 'guest', name: 'Guest', color: '#818cf8', kids: false },
  { id: 'kids', name: 'Kids', color: '#fbbf24', kids: true },
];

const listeners = new Set();
const emit = (type) => listeners.forEach((listener) => listener(type));

/* In-memory copy of what we read from localStorage: rendering hundreds of cards
   asks "is this in My List?" for each one, so the JSON is parsed only once. */
const memo = new Map();
const read = (key, fallback) => {
  if (!memo.has(key)) memo.set(key, storage.get(key, fallback));
  return memo.get(key);
};
const write = (key, value) => {
  memo.set(key, value);
  storage.set(key, value);
};
const drop = (key) => {
  memo.delete(key);
  storage.remove(key);
};

// Another tab changed something: forget our copy and re-read on next access.
window.addEventListener('storage', (event) => {
  if (!event.key || (event.key.startsWith('reelora:') && !event.key.startsWith('reelora:cache:'))) {
    memo.clear();
    emit('profile');
  }
});

/** Keep only what list/progress rows need to render without another API call. */
const mini = (show) => ({
  id: show.id,
  name: show.name,
  poster: show.poster,
  posterLarge: show.posterLarge,
  genres: show.genres || [],
  rating: show.rating ?? null,
  year: show.year || '',
  runtime: show.runtime || 0,
  weight: show.weight || 0,
  type: show.type || '',
  summary: show.summary || '',
});

export const store = {
  MAX_PROFILES,

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /* ----- profiles ----- */
  profiles() {
    const saved = read(KEYS.profiles, null);
    return Array.isArray(saved) && saved.length ? saved : DEFAULT_PROFILES;
  },

  activeProfile() {
    const id = read(KEYS.active, null);
    return this.profiles().find((profile) => profile.id === id) || null;
  },

  setActiveProfile(id) {
    write(KEYS.active, id);
    emit('profile');
  },

  addProfile(name, kids = false) {
    const profiles = this.profiles();
    const clean = String(name || '').trim().slice(0, 20);
    if (!clean || profiles.length >= MAX_PROFILES) return null;
    const profile = {
      id: `p${Date.now().toString(36)}`,
      name: clean,
      color: PALETTE[profiles.length % PALETTE.length],
      kids: Boolean(kids),
    };
    write(KEYS.profiles, [...profiles, profile]);
    emit('profiles');
    return profile;
  },

  removeProfile(id) {
    const remaining = this.profiles().filter((profile) => profile.id !== id);
    if (!remaining.length) return;
    write(KEYS.profiles, remaining);
    drop(KEYS.list(id));
    drop(KEYS.progress(id));
    if (read(KEYS.active, null) === id) drop(KEYS.active);
    emit('profiles');
  },

  /* ----- My List ----- */
  myList() {
    const profile = this.activeProfile();
    return profile ? read(KEYS.list(profile.id), []) : [];
  },

  inList(id) {
    const wanted = Number(id);
    return this.myList().some((show) => show.id === wanted);
  },

  /** Add or remove; returns true when the show is now in the list. */
  toggleList(show) {
    const profile = this.activeProfile();
    if (!profile || !show) return false;
    const list = this.myList();
    const exists = list.some((item) => item.id === show.id);
    const next = exists ? list.filter((item) => item.id !== show.id) : [mini(show), ...list];
    write(KEYS.list(profile.id), next);
    emit('list');
    return !exists;
  },

  /* ----- Continue Watching ----- */
  progressMap() {
    const profile = this.activeProfile();
    return profile ? read(KEYS.progress(profile.id), {}) : {};
  },

  saveProgress(show, position, duration) {
    const profile = this.activeProfile();
    if (!profile || !show || !duration) return;
    const map = { ...this.progressMap() };
    map[show.id] = { show: mini(show), position, duration, updatedAt: Date.now() };
    write(KEYS.progress(profile.id), map);
    emit('progress');
  },

  resumePosition(id) {
    const entry = this.progressMap()[id];
    return entry && entry.duration && entry.position / entry.duration < 0.95 ? entry.position : 0;
  },

  continueWatching() {
    return Object.values(this.progressMap())
      .filter((entry) => entry.duration && entry.position > 5 && entry.position / entry.duration < 0.95)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
};

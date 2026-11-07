/**
 * player.js — full-screen video player (#/watch/:id) with custom controls.
 *
 * TVmaze offers catalog data only (no video), so every title plays the open
 * movie "Big Buck Bunny" (© Blender Foundation, CC BY 3.0) as a demo stream.
 * Features: play/pause, ±10 s, seek bar, volume, fullscreen, keyboard shortcuts,
 * auto-hiding controls and resume ("Continue Watching") per profile.
 */
import { $, el, esc, formatClock } from '../core/utils.js';
import { getShowDetails } from '../core/api.js';
import { lookup, remember } from '../core/catalog.js';
import { store } from '../core/store.js';
import { icons } from './icons.js';

const SOURCES = [
  {
    src: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c0/Big_Buck_Bunny_4K.webm/Big_Buck_Bunny_4K.webm.720p.vp9.webm',
    type: 'video/webm',
  },
  { src: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4', type: 'video/mp4' },
];

let state = null;

const template = (name) => `
  <div class="player" role="dialog" aria-modal="true" aria-label="Video player">
    <video class="player-video" playsinline preload="metadata">
      ${SOURCES.map((s) => `<source src="${esc(s.src)}" type="${esc(s.type)}">`).join('')}
    </video>
    <div class="player-top">
      <button type="button" class="icon-btn player-back" data-player="close" aria-label="Back">${icons.arrowLeft}</button>
      <div class="player-heading">
        <p class="player-title">${esc(name || 'Loading…')}</p>
        <p class="player-note">Demo stream: “Big Buck Bunny” © Blender Foundation (CC BY 3.0)</p>
      </div>
    </div>
    <button type="button" class="player-center" data-player="toggle" aria-label="Play">${icons.play}</button>
    <p class="player-status" role="status" aria-live="polite"></p>
    <div class="player-bottom">
      <input class="player-progress" type="range" min="0" max="1000" step="1" value="0" aria-label="Seek" data-player="seek">
      <div class="player-controls">
        <div class="player-group">
          <button type="button" class="icon-btn" data-player="toggle" aria-label="Play">${icons.play}</button>
          <button type="button" class="icon-btn" data-player="back" aria-label="Back 10 seconds">${icons.back10}</button>
          <button type="button" class="icon-btn" data-player="forward" aria-label="Forward 10 seconds">${icons.forward10}</button>
          <button type="button" class="icon-btn" data-player="mute" aria-label="Mute">${icons.volume}</button>
          <input class="player-volume" type="range" min="0" max="1" step="0.05" value="1" aria-label="Volume" data-player="volume">
          <span class="player-time" aria-live="off">0:00 / 0:00</span>
        </div>
        <div class="player-group">
          <button type="button" class="icon-btn" data-player="fullscreen" aria-label="Full screen">${icons.maximize}</button>
        </div>
      </div>
    </div>
  </div>`;

export function openPlayer(id, { onClose } = {}) {
  closePlayer();
  const known = lookup(id);
  const node = el(template(known?.name));
  $('#player-root').replaceChildren(node);
  document.documentElement.classList.add('player-open');

  const video = node.querySelector('video');
  state = { id, node, video, show: known || null, onClose, idleTimer: 0, lastSave: 0, cleanup: [] };

  if (!known) {
    getShowDetails(id)
      .then((details) => {
        remember([details]);
        if (state?.node !== node) return;
        state.show = details;
        node.querySelector('.player-title').textContent = details.name;
      })
      .catch(() => {});
  }

  wire(node, video);
  node.querySelector('.player-back').focus();
  video.play().catch(() => syncPlayState());
}

export function closePlayer() {
  if (!state) return;
  saveProgress(true);
  const { video, cleanup } = state;
  cleanup.forEach((fn) => fn());
  clearTimeout(state.idleTimer);
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  video.pause();
  video.removeAttribute('src');
  video.querySelectorAll('source').forEach((s) => s.remove());
  video.load();
  $('#player-root').replaceChildren();
  document.documentElement.classList.remove('player-open');
  state = null;
}

/* ---------- behaviour ---------- */

function saveProgress(force = false) {
  if (!state?.show) return;
  const { video } = state;
  if (!video.duration || Number.isNaN(video.duration)) return;
  const now = Date.now();
  if (!force && now - state.lastSave < 5000) return;
  state.lastSave = now;
  store.saveProgress(state.show, video.currentTime, video.duration);
}

function syncPlayState() {
  if (!state) return;
  const { node, video } = state;
  const paused = video.paused;
  node.classList.toggle('is-paused', paused);
  node.querySelectorAll('[data-player="toggle"]').forEach((button) => {
    button.innerHTML = paused ? icons.play : icons.pause;
    button.setAttribute('aria-label', paused ? 'Play' : 'Pause');
  });
}

function syncTime() {
  if (!state) return;
  const { node, video } = state;
  const duration = video.duration || 0;
  const progress = node.querySelector('.player-progress');
  if (duration && document.activeElement !== progress) {
    progress.value = String(Math.round((video.currentTime / duration) * 1000));
  }
  progress.style.setProperty('--p', `${Number(progress.value) / 10}%`);
  node.querySelector('.player-time').textContent = `${formatClock(video.currentTime)} / ${formatClock(duration)}`;
}

function syncVolume() {
  if (!state) return;
  const { node, video } = state;
  const mute = node.querySelector('[data-player="mute"]');
  const silent = video.muted || video.volume === 0;
  mute.innerHTML = silent ? icons.muted : icons.volume;
  mute.setAttribute('aria-label', silent ? 'Unmute' : 'Mute');
  const volume = node.querySelector('.player-volume');
  volume.value = String(video.muted ? 0 : video.volume);
  volume.style.setProperty('--p', `${Number(volume.value) * 100}%`);
}

function syncFullscreen() {
  if (!state) return;
  const button = state.node.querySelector('[data-player="fullscreen"]');
  const active = Boolean(document.fullscreenElement);
  button.innerHTML = active ? icons.minimize : icons.maximize;
  button.setAttribute('aria-label', active ? 'Exit full screen' : 'Full screen');
}

function announce(message) {
  const status = state?.node.querySelector('.player-status');
  if (!status) return;
  status.textContent = message;
  status.classList.add('is-visible');
  clearTimeout(announce.timer);
  announce.timer = setTimeout(() => status.classList.remove('is-visible'), 1600);
}

function toggle() {
  const { video } = state;
  if (video.paused) video.play().catch(() => announce('Playback blocked — press play again'));
  else video.pause();
}

function seekBy(seconds) {
  const { video } = state;
  if (!video.duration) return;
  video.currentTime = Math.min(Math.max(0, video.currentTime + seconds), video.duration - 0.5);
  announce(`${seconds > 0 ? '+' : '−'}${Math.abs(seconds)}s`);
}

function toggleFullscreen() {
  const { node, video } = state;
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  else if (node.requestFullscreen) node.requestFullscreen().catch(() => {});
  else video.webkitEnterFullscreen?.(); // iOS Safari
}

function wakeControls() {
  if (!state) return;
  const { node, video } = state;
  node.classList.remove('is-idle');
  clearTimeout(state.idleTimer);
  state.idleTimer = setTimeout(() => {
    if (state && !video.paused) node.classList.add('is-idle');
  }, 2800);
}

function wire(node, video) {
  const on = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    state.cleanup.push(() => target.removeEventListener(type, handler, options));
  };

  on(video, 'loadedmetadata', () => {
    const resume = store.resumePosition(state.id);
    if (resume && resume < video.duration - 5) {
      video.currentTime = resume;
      announce(`Resuming at ${formatClock(resume)}`);
    }
    syncTime();
  });
  on(video, 'play', () => { syncPlayState(); wakeControls(); });
  on(video, 'pause', () => { syncPlayState(); wakeControls(); saveProgress(true); });
  on(video, 'timeupdate', () => { syncTime(); saveProgress(); });
  on(video, 'volumechange', syncVolume);
  on(video, 'ended', () => { saveProgress(true); syncPlayState(); });
  on(video, 'error', () => announce('Video could not be loaded'), true);
  on(video, 'click', toggle);
  on(document, 'fullscreenchange', syncFullscreen);

  on(node, 'click', (event) => {
    const button = event.target.closest('button[data-player]');
    if (!button) return;
    const action = button.dataset.player;
    if (action === 'close') state.onClose ? state.onClose() : closePlayer();
    else if (action === 'toggle') toggle();
    else if (action === 'back') seekBy(-10);
    else if (action === 'forward') seekBy(10);
    else if (action === 'mute') video.muted = !video.muted;
    else if (action === 'fullscreen') toggleFullscreen();
  });

  on(node.querySelector('.player-progress'), 'input', (event) => {
    event.target.style.setProperty('--p', `${Number(event.target.value) / 10}%`);
    if (video.duration) video.currentTime = (Number(event.target.value) / 1000) * video.duration;
  });
  on(node.querySelector('.player-volume'), 'input', (event) => {
    video.volume = Number(event.target.value);
    video.muted = video.volume === 0;
  });

  on(node, 'pointermove', wakeControls);
  on(node, 'touchstart', wakeControls, { passive: true });

  on(window, 'keydown', (event) => {
    if (!state || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target;
    const onRange = target instanceof HTMLInputElement && target.type === 'range';
    const onButton = target instanceof HTMLButtonElement;
    wakeControls();
    switch (event.key) {
      case ' ':
      case 'k':
      case 'K':
        if (onButton && event.key === ' ') return; // the button handles its own activation
        event.preventDefault();
        toggle();
        break;
      case 'ArrowLeft':
        if (onRange) return;
        event.preventDefault();
        seekBy(-10);
        break;
      case 'ArrowRight':
        if (onRange) return;
        event.preventDefault();
        seekBy(10);
        break;
      case 'f':
      case 'F':
        toggleFullscreen();
        break;
      case 'm':
      case 'M':
        video.muted = !video.muted;
        break;
      case 'Escape':
        if (!document.fullscreenElement) {
          event.preventDefault();
          state.onClose ? state.onClose() : closePlayer();
        }
        break;
      default:
    }
  });

  syncPlayState();
  syncVolume();
  wakeControls();
}

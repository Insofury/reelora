/**
 * profiles.js — the "Who's watching?" screen.
 * Pick a profile, add one (with an optional Kids filter) or remove profiles.
 */
import { $, el, esc } from '../core/utils.js';
import { store } from '../core/store.js';
import { icons } from './icons.js';
import { logoMarkup } from './brand.js';

const safeColor = (color) => (/^#[0-9a-f]{3,8}$/i.test(color) ? color : '#2dd4bf');

/** Circular gradient avatar with the profile's initial. */
export function avatar(profile, size = 'sm') {
  const initial = (profile?.name || '?').trim().charAt(0).toUpperCase();
  return `<span class="avatar avatar--${size}" style="--avatar:${safeColor(profile?.color)}" aria-hidden="true">${esc(initial)}</span>`;
}

let onPick = null;
let managing = false;
let keyHandler = null;

export function showProfileGate({ onPicked } = {}) {
  onPick = onPicked || null;
  managing = false;
  render();
  document.documentElement.classList.add('gate-open');
}

export function hideProfileGate() {
  $('#gate-root').replaceChildren();
  document.documentElement.classList.remove('gate-open');
  if (keyHandler) window.removeEventListener('keydown', keyHandler);
  keyHandler = null;
}

function render() {
  const profiles = store.profiles();
  const canAdd = profiles.length < store.MAX_PROFILES;
  const gate = el(`
    <div class="gate" role="dialog" aria-modal="true" aria-labelledby="gate-title">
      <div class="gate-brand">${logoMarkup()}</div>
      <h1 class="gate-title" id="gate-title">${managing ? 'Manage profiles' : 'Who’s watching?'}</h1>
      <ul class="gate-list" role="list">
        ${profiles
          .map(
            (p) => `
          <li class="gate-item">
            <button type="button" class="profile-tile" data-pick="${esc(p.id)}" ${managing ? 'disabled' : ''}>
              ${avatar(p, 'lg')}
              <span class="profile-name">${esc(p.name)}</span>
              ${p.kids ? '<span class="kids-tag">Kids</span>' : ''}
            </button>
            ${
              managing && profiles.length > 1
                ? `<button type="button" class="profile-remove" data-remove="${esc(p.id)}" aria-label="Delete profile ${esc(p.name)}">${icons.trash}</button>`
                : ''
            }
          </li>`,
          )
          .join('')}
        ${
          canAdd && !managing
            ? `<li class="gate-item">
                <button type="button" class="profile-tile profile-tile--add" data-add>
                  <span class="avatar avatar--lg avatar--add" aria-hidden="true">${icons.plus}</span>
                  <span class="profile-name">Add profile</span>
                </button>
              </li>`
            : ''
        }
      </ul>
      <form class="gate-form" hidden>
        <label class="field"><span>Profile name</span>
          <input name="name" maxlength="20" required autocomplete="off" placeholder="e.g. Priya">
        </label>
        <label class="check"><input type="checkbox" name="kids"><span>Kids profile (family-friendly titles only)</span></label>
        <div class="gate-form-actions">
          <button type="submit" class="btn btn-primary">Add profile</button>
          <button type="button" class="btn btn-secondary" data-cancel>Cancel</button>
        </div>
      </form>
      <button type="button" class="btn btn-outline gate-manage" data-manage>${managing ? 'Done' : 'Manage profiles'}</button>
    </div>`);

  gate.addEventListener('click', (event) => {
    const pick = event.target.closest('[data-pick]');
    const remove = event.target.closest('[data-remove]');
    if (pick && !managing) {
      store.setActiveProfile(pick.dataset.pick);
      hideProfileGate();
      onPick?.();
    } else if (remove) {
      store.removeProfile(remove.dataset.remove);
      render();
    } else if (event.target.closest('[data-manage]')) {
      managing = !managing;
      render();
    } else if (event.target.closest('[data-add]')) {
      const form = gate.querySelector('.gate-form');
      form.hidden = false;
      form.querySelector('input[name="name"]').focus();
    } else if (event.target.closest('[data-cancel]')) {
      gate.querySelector('.gate-form').hidden = true;
    }
  });

  gate.querySelector('.gate-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (store.addProfile(data.get('name'), data.get('kids') === 'on')) render();
  });

  $('#gate-root').replaceChildren(gate);

  if (!keyHandler) {
    keyHandler = (event) => {
      // Esc only closes the picker when someone is already signed in
      if (event.key === 'Escape' && store.activeProfile()) {
        hideProfileGate();
        onPick?.();
      }
    };
    window.addEventListener('keydown', keyHandler);
  }

  (gate.querySelector('[data-pick]:not([disabled])') || gate.querySelector('[data-manage]'))?.focus();
}

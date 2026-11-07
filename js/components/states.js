/**
 * states.js — reusable empty and error panels.
 */
import { el, esc } from '../core/utils.js';
import { icons } from './icons.js';

export function errorState(message, onRetry) {
  const node = el(`
    <div class="state state--error" role="alert">
      <p class="state-title">${esc(message)}</p>
      <p class="state-text">TVmaze may be busy or your connection dropped. Your lists are safe.</p>
      <button type="button" class="btn btn-primary">${icons.refresh}<span>Try again</span></button>
    </div>`);
  node.querySelector('button').addEventListener('click', onRetry);
  return node;
}

export function emptyState({ title, text, href = '', cta = '' }) {
  return el(`
    <div class="state">
      <p class="state-title">${esc(title)}</p>
      <p class="state-text">${esc(text)}</p>
      ${href ? `<a class="btn btn-primary" href="${esc(href)}">${esc(cta)}</a>` : ''}
    </div>`);
}

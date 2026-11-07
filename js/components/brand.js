/**
 * brand.js — the Reelora logo: a film reel with a play button, plus the wordmark.
 * Each inline copy gets its own gradient id so several logos can share one page.
 */
let uid = 0;

export function markSVG(className = 'brand-mark') {
  uid += 1;
  const id = `reelora-grad-${uid}`;
  return `<svg class="${className}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2dd4bf"/><stop offset=".55" stop-color="#6366f1"/><stop offset="1" stop-color="#d946ef"/>
    </linearGradient></defs>
    <circle cx="32" cy="32" r="30" fill="url(#${id})"/>
    <g fill="#0b0b10">
      <circle cx="32" cy="11.5" r="4"/><circle cx="49.75" cy="21.75" r="4"/><circle cx="49.75" cy="42.25" r="4"/>
      <circle cx="32" cy="52.5" r="4"/><circle cx="14.25" cy="42.25" r="4"/><circle cx="14.25" cy="21.75" r="4"/>
    </g>
    <path d="M27 23.5 L42 32 L27 40.5 Z" fill="#0b0b10" stroke="#0b0b10" stroke-width="3" stroke-linejoin="round"/>
  </svg>`;
}

export const logoMarkup = () => `${markSVG()}<span class="brand-word">REELORA</span>`;

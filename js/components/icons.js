/**
 * icons.js — inline SVG icons (no icon font, no extra requests).
 * Every icon is decorative (aria-hidden); buttons carry their own aria-label.
 */
const stroke = (body) =>
  `<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const solid = (body) =>
  `<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">${body}</svg>`;

export const icons = {
  play: solid('<path d="M7 4.6v14.8a1 1 0 0 0 1.52.86l12.1-7.4a1 1 0 0 0 0-1.72L8.52 3.74A1 1 0 0 0 7 4.6z"/>'),
  pause: solid('<rect x="5.5" y="4" width="4.5" height="16" rx="1.2"/><rect x="14" y="4" width="4.5" height="16" rx="1.2"/>'),
  plus: stroke('<path d="M12 5v14M5 12h14"/>'),
  check: stroke('<path d="M20 6 9 17l-5-5"/>'),
  info: stroke('<circle cx="12" cy="12" r="9.5"/><path d="M12 16.5v-5M12 7.8h.01"/>'),
  chevronDown: stroke('<path d="m6 9 6 6 6-6"/>'),
  chevronLeft: stroke('<path d="m15 18-6-6 6-6"/>'),
  chevronRight: stroke('<path d="m9 18 6-6-6-6"/>'),
  search: stroke('<circle cx="11" cy="11" r="7.5"/><path d="m20.5 20.5-4.2-4.2"/>'),
  close: stroke('<path d="M18 6 6 18M6 6l12 12"/>'),
  arrowLeft: stroke('<path d="m12 19-7-7 7-7M19 12H5"/>'),
  star: solid('<path d="m12 2.6 2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95z"/>'),
  volume: stroke('<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.7 5.3a9.5 9.5 0 0 1 0 13.4"/>'),
  muted: stroke('<path d="M11 5 6 9H3v6h3l5 4z"/><path d="m22 9-6 6M16 9l6 6"/>'),
  maximize: stroke('<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>'),
  minimize: stroke('<path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/>'),
  back10: stroke('<path d="M3 12a9 9 0 1 0 2.64-6.36L3 8.3"/><path d="M3 3.5V8.3h4.8"/><text x="12" y="15.6" text-anchor="middle" font-size="7.5" font-weight="700" fill="currentColor" stroke="none" font-family="Inter, Arial, sans-serif">10</text>'),
  forward10: stroke('<path d="M21 12a9 9 0 1 1-2.64-6.36L21 8.3"/><path d="M21 3.5V8.3h-4.8"/><text x="12" y="15.6" text-anchor="middle" font-size="7.5" font-weight="700" fill="currentColor" stroke="none" font-family="Inter, Arial, sans-serif">10</text>'),
  external: stroke('<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'),
  github: stroke('<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>'),
  user: stroke('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  refresh: stroke('<path d="M21 12a9 9 0 1 1-2.64-6.36L21 8"/><path d="M21 3v5h-5"/>'),
  trash: stroke('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>'),
};

/**
 * toast.js — short status messages ("Added to My List") announced to screen readers.
 *
 * An open <dialog> sits in the browser's "top layer", above every z-index, so the
 * toast is moved inside the open dialog while one is showing, then back to <body>.
 */
let node = null;
let timer;

export function toast(message) {
  node ||= document.getElementById('toast');
  if (!node) return;
  const host = document.querySelector('dialog[open]') || document.body;
  if (node.parentElement !== host) host.append(node);
  node.textContent = message;
  node.classList.add('is-visible');
  clearTimeout(timer);
  timer = setTimeout(() => {
    node.classList.remove('is-visible');
    if (node.parentElement !== document.body) document.body.append(node);
  }, 2600);
}

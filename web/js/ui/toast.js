/** Transient outcome messages above the dock. */
import {el, html, render} from './dom.js';
import {icon} from './icons.js';

let container = null;
const ICONS = {info: 'info', success: 'check', warning: 'warning', error: 'warning'};

export function toast(message, {kind = 'info', timeout = 3600, action} = {}) {
  if (!container) { container = el('div', {class: 'toasts', role: 'status', 'aria-live': 'polite'}); document.body.append(container); }
  const node = el('div', {class: `toast is-${kind}`});
  render(node, html`${icon(ICONS[kind] || 'info', {size: 18})}<span class="grow">${message}</span>`);
  if (action) {
    const button = el('button', {class: 'btn btn-sm btn-ghost', onclick: () => { action.onClick?.(); dismiss(); }}, action.label);
    node.append(button);
  }
  while (container.children.length >= 2) container.firstElementChild.remove();
  container.append(node);
  let timer = setTimeout(dismiss, timeout);
  function dismiss() { clearTimeout(timer); node.remove(); }
  node.addEventListener('click', event => { if (!(event.target instanceof HTMLButtonElement)) dismiss(); });
  return {dismiss};
}

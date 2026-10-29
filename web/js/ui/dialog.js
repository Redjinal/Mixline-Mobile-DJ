/** Modal confirmations, prompts and bottom sheets built on <dialog>. */
import {el, html, render, $} from './dom.js';
import {icon} from './icons.js';

const open = new Set();

function mount(dialog) {
  document.body.append(dialog);
  open.add(dialog);
  dialog.addEventListener('close', () => { open.delete(dialog); dialog.remove(); });
  dialog.showModal();
  return dialog;
}

export function confirmDialog({title, body = '', confirmLabel = 'Continue', cancelLabel = 'Cancel', danger = false}) {
  return new Promise(resolve => {
    const dialog = el('dialog', {class: 'modal'});
    render(dialog, html`<form method="dialog" class="modal-body"><h2>${title}</h2>${body ? html`<p class="muted">${body}</p>` : ''}<div class="modal-actions"><button value="cancel" class="btn btn-ghost">${cancelLabel}</button><button value="ok" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" autofocus>${confirmLabel}</button></div></form>`);
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'));
    mount(dialog);
  });
}

export function promptDialog({title, label = 'Name', value = '', placeholder = '', confirmLabel = 'Save', validate, maxLength = 100, type = 'text'}) {
  return new Promise(resolve => {
    const dialog = el('dialog', {class: 'modal'});
    render(dialog, html`<form method="dialog" class="modal-body"><h2>${title}</h2><label class="field"><span>${label}</span><input class="input" name="value" type="${type}" value="${value}" placeholder="${placeholder}" maxlength="${maxLength}" autocomplete="off" autofocus></label><p class="danger" data-error hidden></p><div class="modal-actions"><button value="cancel" class="btn btn-ghost" formnovalidate>Cancel</button><button value="ok" class="btn btn-primary">${confirmLabel}</button></div></form>`);
    const form = $('form', dialog), input = $('input', dialog), error = $('[data-error]', dialog);
    let result = null;
    form.addEventListener('submit', event => {
      if (event.submitter?.value !== 'ok') { result = null; return; }
      const text = input.value.trim();
      const problem = validate ? validate(text) : (text ? null : 'Enter a value.');
      if (problem) { event.preventDefault(); error.textContent = problem; error.hidden = false; input.focus(); return; }
      result = text;
    });
    dialog.addEventListener('close', () => resolve(result));
    mount(dialog);
  });
}

/** Bottom sheet; returns {el, body, close, setBody}. */
export function sheet({title, body = '', onClose} = {}) {
  const dialog = el('dialog', {class: 'sheet', 'aria-label': title || 'Sheet'});
  render(dialog, html`<div class="sheet-handle"></div><div class="sheet-head"><h2>${title || ''}</h2><button class="btn btn-icon btn-quiet" data-close aria-label="Close">${icon('close')}</button></div><div class="sheet-body">${body}</div>`);
  $('[data-close]', dialog).addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  if (onClose) dialog.addEventListener('close', onClose);
  mount(dialog);
  const bodyEl = $('.sheet-body', dialog);
  return {el: dialog, body: bodyEl, close: () => dialog.open && dialog.close(), setBody: content => render(bodyEl, content)};
}

/** Close the top-most dialog; returns true when one was open (used by Android back). */
export function closeTopDialog() {
  // The close event that removes a dialog from the registry fires asynchronously; skip already-closed entries.
  for (const dialog of [...open].reverse()) {
    if (!dialog.open) { open.delete(dialog); continue; }
    dialog.close();
    return true;
  }
  return false;
}
export const anyDialogOpen = () => [...open].some(dialog => dialog.open);

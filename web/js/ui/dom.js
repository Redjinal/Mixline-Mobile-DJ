/** Small DOM helpers with escape-by-default templating. */
export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const ESCAPES = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'};
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ESCAPES[c]);

class Raw {
  constructor(text) { this.text = text; }
  toString() { return this.text; }
}
/** Mark a string as already-safe HTML. */
export const raw = text => new Raw(String(text));

function stringify(value) {
  if (value == null || value === false) return '';
  if (value instanceof Raw) return value.text;
  if (Array.isArray(value)) return value.map(stringify).join('');
  return esc(value);
}
/** Tagged template: interpolations are escaped unless they are `raw()`/`html` fragments. */
export function html(strings, ...values) {
  let out = '';
  strings.forEach((part, i) => { out += part; if (i < values.length) out += stringify(values[i]); });
  return new Raw(out);
}
/** Render Raw/html fragments, arrays of them, or an HTML string into an element. */
export const toHTML = content => content instanceof Raw ? content.text : Array.isArray(content) ? content.map(toHTML).join('') : String(content ?? '');
export const render = (el, content) => { el.innerHTML = toHTML(content); return el; };
export const classes = (...names) => names.filter(Boolean).join(' ');

/** Event delegation: handler(event, matchedElement). */
export function delegate(root, type, selector, handler, options) {
  const listener = event => {
    const target = event.target instanceof Element ? event.target.closest(selector) : null;
    if (target && root.contains(target)) handler(event, target);
  };
  root.addEventListener(type, listener, options);
  return () => root.removeEventListener(type, listener, options);
}

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

/** Combine percentage clamp for CSS custom properties. */
export const pct = value => `${Math.round(Math.max(0, Math.min(1, value)) * 1000) / 10}%`;

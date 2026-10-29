// MdjElement — base class for every prototype component.
//
// Light DOM (no shadow root) so global tokens/material CSS apply, screenshots are
// plain, and the audit can query every element. Components render from attributes.
//
// Conventions enforced here:
//   - static tag        'mdj-dial'               custom element name
//   - static states     ['idle','pending',...]   named visual states (gallery + audit)
//   - static fr         ['FR-020']               requirement IDs served -> data-fr
//   - static hit        48 | 56 | 0              hit-bound class; 0 = not interactive
//   - static fixture    true                     renders a FIXTURE mark automatically
//   - static observed   ['value','state',...]    attributes that trigger re-render
//
// The `state` attribute is mirrored to data-state for CSS. Every interactive element
// (component or plain <button>) must carry data-hit so the audit can measure it.

export const registry = { components: [] };

export class MdjElement extends HTMLElement {
  static tag = 'mdj-element';
  static states = [];
  static fr = [];
  static hit = 48;
  static fixture = false;
  static observed = ['state'];
  static get observedAttributes() { return Array.from(new Set(['state', ...this.observed])); }

  constructor() {
    super();
    this._rendered = false;
  }

  connectedCallback() {
    const cls = this.constructor;
    if (cls.hit) this.dataset.hit = String(cls.hit);
    if (cls.fr.length && !this.dataset.fr) this.dataset.fr = cls.fr.join(' ');
    if (!this.dataset.component) this.dataset.component = cls.tag;
    this.syncState();
    this.render();
    this._rendered = true;
    if (cls.fixture) this.ensureFixtureMark();
  }

  attributeChangedCallback(name) {
    if (name === 'state') this.syncState();
    if (this._rendered) {
      this.render();
      if (this.constructor.fixture) this.ensureFixtureMark();
    }
  }

  syncState() {
    const s = this.getAttribute('state');
    if (s) this.dataset.state = s; else delete this.dataset.state;
  }

  // ---- attribute helpers ----
  attr(name, def = '') { const v = this.getAttribute(name); return v === null ? def : v; }
  num(name, def = 0) { const v = parseFloat(this.getAttribute(name)); return Number.isFinite(v) ? v : def; }
  bool(name) { return this.hasAttribute(name) && this.getAttribute(name) !== 'false'; }
  get state() { return this.attr('state', this.constructor.states[0] || ''); }
  set state(v) { this.setAttribute('state', v); }

  // ---- DOM helpers ----
  el(tag, attrs = {}, children = []) { return h(tag, attrs, children); }
  svg(tag, attrs = {}, children = []) { return s(tag, attrs, children); }
  emit(name, detail = {}) { this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true })); }

  render() {}

  ensureFixtureMark() {
    if (this.querySelector(':scope > mdj-fixture-mark')) return;
    const m = document.createElement('mdj-fixture-mark');
    m.setAttribute('for', this.getAttribute('fixture') || this.constructor.tag);
    this.appendChild(m);
  }
}

// Register a component class and record it for the gallery/audit.
export function define(cls) {
  if (!customElements.get(cls.tag)) customElements.define(cls.tag, cls);
  if (!registry.components.includes(cls)) registry.components.push(cls);
  return cls;
}

// h(): small DOM builder. attrs: strings, numbers, booleans, 'class', 'style',
// 'dataset' object, 'on' object of listeners, 'html' raw string.
export function h(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  applyAttrs(node, attrs);
  append(node, children);
  return node;
}
export function s(tag, attrs = {}, children = []) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  applyAttrs(node, attrs, true);
  append(node, children);
  return node;
}
function applyAttrs(node, attrs, isSvg = false) {
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.setAttribute('class', v);
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k === 'dataset') for (const [dk, dv] of Object.entries(v)) node.dataset[dk] = dv;
    else if (k === 'on') for (const [ev, fn] of Object.entries(v)) node.addEventListener(ev, fn);
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v === true ? '' : String(v));
  }
}
function append(node, children) {
  for (const c of [].concat(children)) {
    if (c === null || c === undefined || c === false) continue;
    node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
}

// Icon from the sprite in assets/icons.svg. Name must exist in the sprite.
export function icon(name, { size = 20, label = null, cls = '' } = {}) {
  const svg = s('svg', {
    class: `icon ${cls}`.trim(), width: size, height: size, viewBox: '0 0 24 24',
    role: label ? 'img' : 'presentation', 'aria-label': label || undefined, 'aria-hidden': label ? undefined : 'true', focusable: 'false'
  });
  const use = s('use', { href: `assets/icons.svg#${name}` });
  svg.appendChild(use);
  return svg;
}

// Format helpers shared by components and screens.
export const fmt = {
  time(seconds, { remaining = false } = {}) {
    const neg = remaining ? '-' : '';
    const t = Math.max(0, Math.round(seconds));
    const m = Math.floor(t / 60), sec = t % 60;
    return `${neg}${m}:${String(sec).padStart(2, '0')}`;
  },
  bpm(v) { return v == null ? '—' : v.toFixed(1); },
  pct(v) { return v == null ? 'unknown' : `${Math.round(v * 100)}%`; },
  db(v) { return v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1)} dB`; },
  bytes(n) {
    if (n == null) return 'unknown';
    const u = ['B', 'KB', 'MB', 'GB']; let i = 0;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return `${n.toFixed(i ? 1 : 0)} ${u[i]}`;
  },
};

// Plain-element helpers so screens can mark native controls consistently.
export function button({ label, hit = 48, cls = '', fr = [], icon: iconName = null, iconOnly = false, state = null, deck = null, on = {}, attrs = {} }) {
  const b = h('button', {
    type: 'button', class: `btn ${cls}`.trim(), dataset: { hit: String(hit), ...(fr.length ? { fr: fr.join(' ') } : {}), ...(state ? { state } : {}) },
    'aria-label': iconOnly ? label : undefined, on, ...attrs,
  });
  if (deck) b.classList.add(`deck-${deck.toLowerCase()}`);
  if (iconName) b.appendChild(icon(iconName, { size: 20 }));
  if (!iconOnly) b.appendChild(h('span', { class: 'btn-label', text: label }));
  return b;
}

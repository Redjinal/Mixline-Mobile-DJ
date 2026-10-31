// <mdj-provenance-tag kind="measured|user|retrieved|inferred|restricted" label="…" source="YouTube (fixture)"
//                     confidence="low|unverified" size="sm|md" state="default">
//
// Field-level provenance for one ParDay claim (Document 13 "Privacy, source provenance and model
// boundaries"; FR-048, FR-036). Every claim a card or message prints carries one of these; the tag
// says WHO vouches for the claim, never whether the claim is true.
//   measured    — the app measured it (analysis, route, library state, revision)   · square glyph
//   user        — the user typed or placed it (tag, cue, pasted link, set list)     · circle glyph
//   retrieved   — a provider / extractor / document returned it (`source` names it) · hexagon glyph
//   inferred    — the model concluded it; `confidence` prints low / unverified      · diamond glyph with ?
//   restricted  — present in the data but EXCLUDED from prompts, ranking and model  · octagon glyph with bar
//                 input by default (Spotify-derived fields); printed so the omission is visible.
// Shape + word + icon carry the kind; the tone colour is secondary and never alone. Text sits on an
// opaque pill (--raised / tone fill). Engine binding: none. Units / range: n/a. Gesture: none (hit 0).
// Pending vs acknowledged: n/a — provenance is a property of stored data. Cancellation: n/a.
// Accessible: the visible text is the name ("Measured · analysis r3"); the glyph is aria-hidden.
// Also exports the family's shared helpers: the lazy parday.json loader, time/track formatting and
// the icon-id fallback, so the other parday components share one copy.
import { MdjElement, define, h, s, icon } from './base.js';
import { load, fixtures } from '../app/fixtures.js';
import { iconId } from './mdj-marker.js';

export const PROVENANCE = {
  measured:   { text: 'Measured',  tone: 'ok',       icon: ['provenance-measured', 'check'],   shape: 'square',  aria: 'measured by the app' },
  user:       { text: 'You',       tone: 'info',     icon: ['provenance-user', 'edit'],        shape: 'circle',  aria: 'supplied by you' },
  retrieved:  { text: 'Retrieved', tone: 'neutral',  icon: ['provenance-retrieved', 'cloud'],  shape: 'hexagon', aria: 'retrieved from a source' },
  inferred:   { text: 'Inferred',  tone: 'warning',  icon: ['provenance-inferred', 'info'],    shape: 'diamond', aria: 'inferred by the model' },
  restricted: { text: 'Excluded',  tone: 'critical', icon: ['lock', 'lock'],                   shape: 'octagon', aria: 'restricted — excluded from the model' },
};

// ---- shared helpers for the parday family ----
let pardayData = null, pardayPromise = null;
const waiting = new Set();
// Returns the parday fixture once loaded; before that it returns null and re-renders `el` when ready.
export function pardayFixture(el) {
  if (pardayData) return pardayData;
  if (el) waiting.add(el);
  if (!pardayPromise) {
    pardayPromise = load('parday').then((d) => {
      pardayData = d;
      for (const w of waiting) if (w.isConnected) w.render();
      waiting.clear();
      return d;
    }).catch((err) => { console.error('fixtures/parday.json failed to load', err); });
  }
  return null;
}
export function trackTitle(id) { return fixtures.track(id)?.title || (id ? id.toUpperCase() : 'Unknown track'); }
export function trackArtist(id) { return fixtures.track(id)?.artist || ''; }
// m:ss.d for marker positions (keeps the tenth; the engine owns the real frame).
export function secText(sec) {
  if (sec == null || !Number.isFinite(sec)) return '—';
  const m = Math.floor(sec / 60), rest = sec - m * 60;
  const whole = Math.floor(rest), tenth = Math.round((rest - whole) * 10);
  const sTxt = String(tenth >= 10 ? whole + 1 : whole).padStart(2, '0');
  return `${m}:${sTxt}.${tenth >= 10 ? 0 : tenth}`;
}
export function mmss(sec) { const t = Math.max(0, Math.round(sec)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; }
export function groupDigits(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
export function pardayIcon(name, opts) { return icon(iconId(name, FALLBACK[name] || name), opts); }
const FALLBACK = {
  preview: 'headphones', apply: 'save', dismiss: 'x', cancel: 'x', retry: 'refresh', thinking: 'loader', expiry: 'clock',
  'stop-automation': 'stop', 'local-only': 'cloud-off', offline: 'wifi-off', 'cost-limit': 'warning', crate: 'folder',
  'transition-exit': 'marker', 'transition-intro': 'marker', history: 'clock', automix: 'arm', 'rate-limit': 'warning',
  'provenance-measured': 'check', 'provenance-user': 'edit', 'provenance-retrieved': 'cloud', 'provenance-inferred': 'info',
  ready: 'check', blocked: 'unavailable', 'analysis-pending': 'loader', 'grid-uncertain': 'warning', missing: 'unavailable',
  playlist: 'list', redo: 'refresh', validate: 'check', fixture: 'info', discard: 'trash',
};

function glyph(shape) {
  const svg = s('svg', { class: 'ptag__shape', viewBox: '0 0 16 16', width: 12, height: 12, 'aria-hidden': 'true', focusable: 'false' });
  const d = {
    square: 'M2.5 2.5 H13.5 V13.5 H2.5 Z',
    circle: 'M8 2.2 A5.8 5.8 0 1 1 7.99 2.2 Z',
    hexagon: 'M8 1.8 L13.4 4.9 V11.1 L8 14.2 L2.6 11.1 V4.9 Z',
    diamond: 'M8 1.8 L14.2 8 L8 14.2 L1.8 8 Z',
    octagon: 'M5.3 1.8 H10.7 L14.2 5.3 V10.7 L10.7 14.2 H5.3 L1.8 10.7 V5.3 Z',
  }[shape] || 'M2.5 2.5 H13.5 V13.5 H2.5 Z';
  svg.appendChild(s('path', { class: 'ptag__outline', d }));
  if (shape === 'square') svg.appendChild(s('path', { class: 'ptag__detail', d: 'M5 11 V7 M8 11 V5 M11 11 V8.5' }));
  if (shape === 'circle') svg.appendChild(s('circle', { class: 'ptag__detail-fill', cx: 8, cy: 8, r: 2.2 }));
  if (shape === 'hexagon') svg.appendChild(s('path', { class: 'ptag__detail', d: 'M5 8 H11 M8 5 V11' }));
  if (shape === 'diamond') svg.appendChild(s('path', { class: 'ptag__detail', d: 'M6.6 6.6 A1.5 1.5 0 1 1 8.4 8.1 V9.4 M8.4 11.2 V11.3' }));
  if (shape === 'octagon') svg.appendChild(s('path', { class: 'ptag__detail', d: 'M4.8 8 H11.2' }));
  return svg;
}

export class MdjProvenanceTag extends MdjElement {
  static tag = 'mdj-provenance-tag';
  static states = ['static'];
  static fr = ['FR-048', 'FR-036'];
  static hit = 0;
  static fixture = false;
  static observed = ['kind', 'label', 'source', 'confidence', 'size'];
  static samples = {
    default: { kind: 'measured' },
    variants: [
      { kind: 'measured', label: 'Measured · analysis r3' },
      { kind: 'user' },
      { kind: 'retrieved', source: 'YouTube extractor (fixture)' },
      { kind: 'inferred', confidence: 'low' },
      { kind: 'inferred', confidence: 'unverified' },
      { kind: 'restricted', label: 'Spotify fields excluded' },
      { kind: 'measured', size: 'sm' },
    ],
  };

  render() {
    const kindAttr = this.attr('kind', 'measured');
    const kind = PROVENANCE[kindAttr] ? kindAttr : 'inferred';
    const def = PROVENANCE[kind];
    const size = this.attr('size', 'md') === 'sm' ? 'sm' : 'md';
    const source = this.attr('source', '');
    const confidence = this.attr('confidence', '');
    const label = this.attr('label', '') || def.text;
    this.className = `ptag ptag--${kind} ptag--${size}`;
    delete this.dataset.hit;
    const detail = kind === 'retrieved' && source ? source : kind === 'inferred' && confidence ? `${confidence} confidence` : '';
    const name = `Provenance: ${def.aria}${label !== def.text ? ` — ${label}` : ''}${detail ? `, ${detail}` : ''}`;
    const pill = h('span', { class: `ptag__pill tone-${def.tone}`, role: 'note', 'aria-label': name }, [
      glyph(def.shape),
      icon(iconId(def.icon[0], def.icon[1]), { size: size === 'sm' ? 10 : 12, cls: 'ptag__icon' }),
      h('span', { class: 'ptag__text', text: label, 'aria-hidden': 'true' }),
      detail ? h('span', { class: 'ptag__detail-text', text: detail, 'aria-hidden': 'true' }) : null,
    ]);
    this.replaceChildren(pill);
  }
}
define(MdjProvenanceTag);

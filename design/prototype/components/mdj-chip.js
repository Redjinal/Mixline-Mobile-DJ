// <mdj-chip kind="capability|availability|filter|count|status" value="..." label="..." count="12|?"
//           removable tone="neutral|ok|info|warning|critical" icon="..." size="sm|md" state="idle|selected|disabled">
//
// Engine binding: none. A chip prints a resolved status; it never issues an EngineCommand.
//   capability   — a source/provider capability resolution (FR-036). value = allowed | denied | unknown.
//                  Fail-closed language: `unknown` prints "Unknown — treated as denied" and is toned as a
//                  warning, never as "maybe". The label names the operation ("Stems", "Record").
//   availability — a track's file availability (Document 07 / FR-036): ready, missing, permission,
//                  unsupported, pending (analysis), downloaded, demo, discovered (catalogue match, not a
//                  file), loading, duplicate. Text always accompanies the icon and the tone.
//   filter       — a removable filter above results (Document 04 §4 "Filters"): label + real or unknown
//                  count. `count` absent or "?" prints "?" with the accessible text "unknown count".
//   count        — a label with a count ("Crates 5"); unknown → "?".
//   status       — any other printed state ("Played ×3", "Explicit", "Locked grid").
// Units / range: `count` is a non-negative integer or unknown; no percentages.
// Gesture: filter chips are a toggle button (aria-pressed mirrors `selected`); `removable` adds a separate
// 48 dp Remove button (×). Every other kind is static text and carries no data-hit.
// Pending vs acknowledged: not applicable — a chip prints acknowledged state only.
// Cancellation: n/a. Accessible: filter chip name "Key 8A, 6 results"; remove button "Remove filter Key 8A".
// Colour never carries meaning alone: every tone is paired with an icon and the printed word.
// Class prefix is `chip-c` (app.css already owns a generic `.chip` for the home page).
import { MdjElement, define, h, icon } from './base.js';

export const AVAILABILITY = {
  ready:       { text: 'Ready',               icon: 'check',       tone: 'ok' },
  missing:     { text: 'Missing file',        icon: 'unavailable', tone: 'critical' },
  permission:  { text: 'Permission missing',  icon: 'lock',        tone: 'warning' },
  unsupported: { text: 'Unsupported format',  icon: 'warning',     tone: 'critical' },
  pending:     { text: 'Analysis pending',    icon: 'loader',      tone: 'info' },
  downloaded:  { text: 'Downloaded',          icon: 'download',    tone: 'info' },
  demo:        { text: 'Demo',                icon: 'demo',        tone: 'neutral' },
  discovered:  { text: 'Match — not a file yet', icon: 'cloud',    tone: 'neutral' },
  loading:     { text: 'Loading',             icon: 'loader',      tone: 'info' },
  duplicate:   { text: 'Duplicate',           icon: 'duplicate',   tone: 'warning' },
};
export const CAPABILITY = {
  allowed: { text: 'Allowed', icon: 'check',   tone: 'ok' },
  denied:  { text: 'Denied',  icon: 'x',       tone: 'critical' },
  unknown: { text: 'Unknown — treated as denied', icon: 'warning', tone: 'warning' },
};
// Colour tags (cues, crates, tracks): the `--cue-<name>` tokens, with deck accents / status colours as
// fallbacks. Never a raw hex.
export const COLOR_TAG = {
  cyan:   'var(--cue-cyan, var(--deck-a-accent))',
  orange: 'var(--cue-orange, var(--deck-b-accent))',
  purple: 'var(--cue-purple, var(--deck-c-accent))',
  green:  'var(--cue-green, var(--deck-d-accent))',
  red:    'var(--cue-red, var(--critical))',
  yellow: 'var(--cue-yellow, var(--meter-mid))',
};

// Derive the availability key for a fixture track (fixtures/tracks.json vocabulary).
export function availabilityOf(track) {
  if (!track) return 'missing';
  if (track.availability === 'missing') return 'missing';
  if (track.availability === 'permission-missing') return 'permission';
  if (track.availability === 'unsupported') return 'unsupported';
  if (track.availability === 'discovered') return 'discovered';
  if (track.analysis === 'pending') return 'pending';
  if (track.duplicateOf) return 'duplicate';
  if (track.source === 'download') return 'downloaded';
  if (track.source === 'demo') return 'demo';
  return 'ready';
}

export function countText(raw) {
  if (raw === null || raw === undefined || raw === '' || raw === '?' || raw === 'unknown') return { text: '?', aria: 'unknown count', known: false };
  const n = Math.max(0, Math.round(Number(raw)));
  if (!Number.isFinite(n)) return { text: '?', aria: 'unknown count', known: false };
  return { text: String(n), aria: `${n}`, known: true };
}

// Parse a JSON attribute (arrays of actions / filters / options) safely; invalid or absent → fallback.
export function parseJsonAttr(raw, fallback = []) {
  if (raw === null || raw === undefined || raw === '') return fallback;
  try { const v = JSON.parse(raw); return v ?? fallback; } catch { return fallback; }
}

export class MdjChip extends MdjElement {
  static tag = 'mdj-chip';
  static states = ['idle', 'selected', 'disabled'];
  static fr = ['FR-004', 'FR-036'];
  static hit = 48;
  static fixture = false;
  static observed = ['kind', 'value', 'label', 'count', 'removable', 'tone', 'icon', 'size'];
  static samples = {
    default: { kind: 'availability', value: 'ready' },
    variants: [
      { kind: 'capability', label: 'Stems', value: 'allowed' },
      { kind: 'capability', label: 'Record', value: 'denied' },
      { kind: 'capability', label: 'Broadcast', value: 'unknown' },
      { kind: 'availability', value: 'ready' },
      { kind: 'availability', value: 'missing' },
      { kind: 'availability', value: 'permission' },
      { kind: 'availability', value: 'unsupported' },
      { kind: 'availability', value: 'pending' },
      { kind: 'availability', value: 'downloaded' },
      { kind: 'availability', value: 'demo' },
      { kind: 'availability', value: 'duplicate', size: 'sm' },
      { kind: 'filter', label: 'Key 8A', count: 6, removable: true },
      { kind: 'filter', label: 'BPM 120–128', count: '?', removable: true },
      { kind: 'count', label: 'Crates', count: 5 },
      { kind: 'status', label: 'Played ×3', icon: 'clock' },
      { kind: 'status', label: 'Explicit', tone: 'warning', icon: 'warning' },
    ],
  };

  model() {
    const kind = this.attr('kind', 'status');
    const value = this.attr('value', '');
    const label = this.attr('label', '');
    const tone = this.attr('tone', '');
    const size = this.attr('size', 'md') === 'sm' ? 'sm' : 'md';
    const removable = this.bool('removable');
    const state = this.state;
    let def = null, text = label, ic = this.attr('icon', '') || null, count = null, name = label;
    if (kind === 'capability') {
      def = CAPABILITY[value] || CAPABILITY.unknown;
      text = def.text; ic = ic || def.icon;
      name = `${label ? label + ': ' : ''}${def.text}`;
    } else if (kind === 'availability') {
      def = AVAILABILITY[value] || AVAILABILITY.missing;
      text = label || def.text; ic = ic || def.icon;
      name = text;
    } else if (kind === 'filter' || kind === 'count') {
      count = countText(this.getAttribute('count'));
      name = `${label}, ${count.known ? `${count.text} ${kind === 'filter' ? 'results' : ''}`.trim() : 'unknown count'}`;
      if (kind === 'filter' && !ic) ic = 'filter';
    } else {
      name = label || value;
      text = label || value;
    }
    const effTone = tone || def?.tone || 'neutral';
    const interactive = kind === 'filter';
    return { kind, value, label, text, ic, count, tone: effTone, size, removable, state, name, interactive };
  }

  render() {
    const m = this.model();
    this.className = `chip-c chip-c--${m.kind} chip-c--${m.size} chip-c--${m.tone}${m.removable ? ' chip-c--removable' : ''}${m.state === 'selected' ? ' chip-c--selected' : ''}`;
    if (m.interactive || m.removable) this.dataset.hit = '48'; else delete this.dataset.hit;
    const pill = h('span', { class: `chip-c__pill tone-${m.tone}` }, [
      m.ic ? icon(m.ic, { size: m.size === 'sm' ? 12 : 14, cls: 'chip-c__icon' }) : null,
      m.kind === 'capability' && m.label ? h('span', { class: 'chip-c__label', text: m.label }) : null,
      h('span', { class: 'chip-c__text', text: m.text }),
      m.count ? h('span', { class: 'chip-c__count numeral', text: m.count.text, 'aria-hidden': 'true' }) : null,
    ]);
    const parts = [];
    if (m.interactive) {
      parts.push(h('button', {
        type: 'button', class: 'chip-c__btn', 'aria-pressed': String(m.state === 'selected'), 'aria-label': m.name,
        'aria-disabled': m.state === 'disabled' ? 'true' : undefined, dataset: { hit: '48' },
        on: { click: () => { if (m.state !== 'disabled') this.emit('mdj:chip', { kind: m.kind, label: m.label, value: m.value, selected: m.state !== 'selected' }); } },
      }, [pill]));
    } else {
      pill.setAttribute('role', 'status');
      pill.setAttribute('aria-label', m.name);
      parts.push(pill);
    }
    if (m.removable) {
      parts.push(h('button', {
        type: 'button', class: 'chip-c__remove', 'aria-label': `Remove filter ${m.label || m.text}`, dataset: { hit: '48' },
        'aria-disabled': m.state === 'disabled' ? 'true' : undefined,
        on: { click: (e) => { e.stopPropagation(); if (m.state !== 'disabled') this.emit('mdj:chip-remove', { kind: m.kind, label: m.label, value: m.value }); } },
      }, [h('span', { class: 'chip-c__remove-face', 'aria-hidden': 'true' }, [icon('x', { size: 12 })])]));
    }
    this.replaceChildren(...parts);
  }
}
define(MdjChip);

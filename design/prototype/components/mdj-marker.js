// <mdj-marker kind="cue|loop|grid|phrase|memory" n="3" color="cyan" label="Break" size="20"
//             state="active|pending|edited|uncertain|disabled">
//
// Engine binding: none. A marker is the glyph of a stored preparation object — a hot cue (FR-011),
// a saved loop (FR-018), a grid downbeat / bar (FR-007, FR-008), a phrase boundary (FR-007) or a
// memory marker (FR-011) — wherever one is shown: waveform overlays, pad faces, legends and library
// lists. The object lives in the preparation store; the glyph never sends an EngineCommand and never
// carries a revision. A parent control (pad, waveform, list row) owns the gesture.
// Units / range: `n` is the cue / loop / memory number (1..8 are the visible banks; larger numbers
// print as-is) or the bar number for kind=grid; `label` is user text, printed on kind=phrase and
// included in every accessible name; `color` is cyan|green|purple|orange|red|yellow|none, the pads
// family's cue palette (--cue-<name> tokens when the token set provides them, deck accents and
// status colours until then — see sharedChangeRequests).
// Shape carries the kind, so colour never carries meaning alone: cue = pennant pointing down, loop =
// bracketed bar, grid = diamond on a stem, phrase = tag with the label, memory = ring. The number
// always sits on an opaque inner disc (--raised) so it stays readable on every cue colour in every
// theme; the Essential tier and the contrast theme keep the same geometry with flat fills.
// Gesture: none (hit 0). Standalone it carries its own aria-label; inside a button it is aria-hidden
// and the button's name repeats the kind, number and label.
// States: active = stored and valid (solid rim) · pending = a quantized command on this marker is
// admitted but not yet executed (dashed rim + "Q" tag) · edited = user-corrected, not detected (ink
// corner notch + "E" tag) · uncertain = detected with low confidence ("?" tag on a warning rim) ·
// disabled = exists but cannot be used on this deck (dimmed + diagonal strike). Pending and active
// never share a visual and nothing animates.
// Cancellation: n/a. Accessible: "Hot cue 3, Break, edited" / "Loop, 8 bars" / "Bar 17, uncertain".
import { MdjElement, define, h, s } from './base.js';

export const CUE_COLORS = ['cyan', 'green', 'purple', 'orange', 'red', 'yellow', 'none'];
// CSS value for a cue colour: the pads family's --cue-<name> tokens when present, otherwise the
// deck accents / status colours. Shared with the waveform overlays so both families agree.
const COLOR_FALLBACK = { cyan: '--deck-a-accent', orange: '--deck-b-accent', purple: '--deck-c-accent', green: '--deck-d-accent', red: '--critical', yellow: '--warning', none: '--ink-3' };
export function cueColorVar(color) {
  const c = CUE_COLORS.includes(color) ? color : 'none';
  return c === 'none' ? 'var(--ink-3)' : `var(--cue-${c}, var(${COLOR_FALLBACK[c]}))`;
}

// The icons agent adds ids in parallel. iconId() returns the preferred id when the sprite has it and
// the fallback (an id that exists today) otherwise, so a missing icon never leaves an empty box.
const spriteIds = new Set();
let spriteKnown = false;
try {
  fetch(new URL('../assets/icons.svg', import.meta.url))
    .then((r) => (r.ok ? r.text() : ''))
    .then((text) => { for (const m of text.matchAll(/\bid="([^"]+)"/g)) spriteIds.add(m[1]); spriteKnown = true; })
    .catch(() => { spriteKnown = true; });
} catch { spriteKnown = true; }
export function iconId(preferred, fallback) { return spriteKnown && spriteIds.has(preferred) ? preferred : fallback; }

const KIND_NAME = { cue: 'Hot cue', loop: 'Loop', grid: 'Bar', phrase: 'Phrase', memory: 'Memory marker' };
const STATE_WORD = { active: '', pending: 'pending', edited: 'edited', uncertain: 'uncertain', disabled: 'unavailable' };
const STATE_TAG = { pending: 'Q', edited: 'E', uncertain: '?' };

function shape(kind) {
  const svg = s('svg', { class: 'marker__shape', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' });
  const rim = (d) => svg.appendChild(s('path', { class: 'marker__rim', d }));
  if (kind === 'cue') rim('M3 2.5 H21 V14 L12 22.5 L3 14 Z');
  else if (kind === 'loop') { rim('M3 4 H21 V20 H3 Z'); svg.appendChild(s('path', { class: 'marker__bracket', d: 'M7 4 V20 M17 4 V20' })); }
  else if (kind === 'grid') { rim('M12 2 L21 12 L12 22 L3 12 Z'); svg.appendChild(s('path', { class: 'marker__stem', d: 'M12 22 V24' })); }
  else if (kind === 'memory') { svg.appendChild(s('circle', { class: 'marker__rim', cx: 12, cy: 12, r: 10 })); svg.appendChild(s('circle', { class: 'marker__ring', cx: 12, cy: 12, r: 7 })); }
  else rim('M3 4 H17 L22 12 L17 20 H3 Z');
  return svg;
}

export class MdjMarker extends MdjElement {
  static tag = 'mdj-marker';
  static states = ['active', 'pending', 'edited', 'uncertain', 'disabled'];
  static fr = ['FR-011', 'FR-018', 'FR-007'];
  static hit = 0;
  static fixture = false;
  static observed = ['kind', 'n', 'color', 'label', 'size', 'muted'];
  static samples = {
    default: { kind: 'cue', n: 3, color: 'cyan', label: 'Break', size: 24 },
    variants: [
      { kind: 'cue' },
      { kind: 'cue', n: 4, color: 'orange', label: 'Exit' },
      { kind: 'loop', n: 8, color: 'none', label: 'Intro 8' },
      { kind: 'grid', n: 17, color: 'none', label: '' },
      { kind: 'phrase', color: 'none', label: 'Break' },
      { kind: 'memory', n: 2, color: 'purple', label: 'Vocal' },
    ],
  };

  render() {
    const kindAttr = this.attr('kind', 'cue');
    const kind = KIND_NAME[kindAttr] ? kindAttr : 'cue';
    const n = this.attr('n', '');
    const color = CUE_COLORS.includes(this.attr('color')) ? this.attr('color') : 'none';
    const label = this.attr('label', '');
    const size = Math.max(14, this.num('size', 20));
    const state = MdjMarker.states.includes(this.state) ? this.state : 'active';
    this.className = `marker marker--${kind} marker--${color} marker--${state}`;
    this.style.setProperty('--size', `${size}px`);
    this.style.setProperty('--mk', cueColorVar(color));
    const inButton = !!this.closest('button, [role="button"], [role="img"], [role="slider"]');
    const word = STATE_WORD[state];
    const name = kind === 'phrase' ? `Phrase ${label || n}` : kind === 'grid' ? `Bar ${n}` : kind === 'loop' ? `Loop${n ? `, ${n} bars` : ''}${label ? `, ${label}` : ''}` : `${KIND_NAME[kind]} ${n}${label ? `, ${label}` : ''}`;
    if (inButton) { this.setAttribute('aria-hidden', 'true'); this.removeAttribute('role'); this.removeAttribute('aria-label'); }
    else { this.setAttribute('role', 'img'); this.setAttribute('aria-label', `${name}${word ? `, ${word}` : ''}`); this.removeAttribute('aria-hidden'); }
    const parts = [h('span', { class: 'marker__glyph' }, [shape(kind)])];
    if (kind === 'phrase') parts.push(h('span', { class: 'marker__text label', text: label || (n ? `Phrase ${n}` : 'Phrase') }));
    else parts.push(h('span', { class: 'marker__n numeral', text: kind === 'memory' ? `M${n}` : String(n) }));
    if (STATE_TAG[state]) parts.push(h('span', { class: `marker__tag marker__tag--${state}`, text: STATE_TAG[state], 'aria-hidden': 'true' }));
    if (state === 'edited') parts.push(h('span', { class: 'marker__notch', 'aria-hidden': 'true' }));
    if (state === 'disabled') parts.push(h('span', { class: 'marker__strike', 'aria-hidden': 'true' }));
    this.replaceChildren(...parts);
  }
}
define(MdjMarker);

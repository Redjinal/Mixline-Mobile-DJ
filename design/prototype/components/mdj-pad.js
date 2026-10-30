// <mdj-pad mode="cue|loop|roll|jump|slicer|sampler|pitch-play|stem" n="1..8" label="Break"
//          color="cyan|green|purple|orange|red|yellow|none" deck="A" size="56|64" bank="1..4"
//          quantized="1 beat" reason="Restricted"
//          state="empty|loaded|held|pending|playing|edit|error|disabled|unavailable">
//
// Engine binding: a tap issues EngineCommand(pad, { deck, generation, mode, bank, n, quantize }).
// Momentary modes (roll, slicer; stem and pitch-play while held) send pad-down / pad-up under one
// touch id. The visual state is the acknowledged pad state read from the engine snapshot, never
// the tap itself.
// Units / range: n 1..8, bank 1..4, label is user text (truncated with an ellipsis on the face; the
// full text is in the accessible name). Mode icons come from the sprite; the mode word is always
// in the name, so a missing icon loses nothing.
// Gesture: tap, or press-and-hold for momentary modes. There is NO long-press shortcut: editing or
// clearing a pad requires the bank's explicit Edit state (Document 03 §4), where every action is a
// labelled button.
// Pending vs acknowledged: `pending` is a quantized command admitted but not yet executed, drawn as
// a dashed deck ring plus a "Q · <quantize>" marker on an opaque chip; `playing` is the acknowledged
// state, drawn as a filled deck face. The two never share a visual and nothing animates to claim
// success (the pending ring pulses only to say "waiting", and stops under reduced motion).
// Cancellation: pointer-cancel, app background, route loss and rotation release a held pad
// (pad-up); a pending command is cancelled by tapping the pad again before the grid point.
// Accessible: a real <button>; name "Hot cue 3 'Break', deck A, bank 2, loaded"; one activation
// maps to one engine action (no duplicate pointer-down + click). Disabled and unavailable pads stay
// in the tab order with aria-disabled and say why in one word, which is also printed on the face.
// Always visible: pad number (top left) and bank (top right) on opaque chips, Document 03 §4.
// Text scale: pad text follows the font scale up to 140 % (state words to 110 %) and then truncates,
// because the 56 dp target does not grow; at 130 % / 200 % the pad grows taller (64 / 76 dp) so
// nothing clips. At 56 dp a state word drops its icon so the word itself stays whole.
// Colour: loaded pads show a thin edge in the cue colour (cue mode) or the deck colour; cue colours
// read --cue-<name> tokens when the token set provides them and fall back to deck accents / status
// colours until then (request filed). Colour never carries meaning alone: the number, label, edge
// shape and state word do.
import { MdjElement, define, h, icon } from './base.js';

export const PAD_MODES = {
  cue:          { name: 'Hot cue',    icon: 'cue' },
  loop:         { name: 'Loop',       icon: 'loop' },
  roll:         { name: 'Roll',       icon: 'roll' },
  jump:         { name: 'Beat jump',  icon: 'beatjump' },
  slicer:       { name: 'Slicer',     icon: 'slicer' },
  sampler:      { name: 'Sampler',    icon: 'sampler' },
  'pitch-play': { name: 'Pitch play', icon: 'pitch-play' },
  stem:         { name: 'Stem',       icon: 'stems' },
};
export const MOMENTARY_MODES = new Set(['roll', 'slicer']);
export const CUE_COLORS = ['cyan', 'green', 'purple', 'orange', 'red', 'yellow', 'none'];

const STATE_WORD = { empty: 'empty', loaded: 'loaded', held: 'held', pending: 'pending', playing: 'playing', edit: 'editing', error: 'error', disabled: 'disabled', unavailable: 'unavailable' };
// One word that fits the 48 px a 56 dp pad can give it (≤ 8 characters). Longer reasons belong on
// wider pads or in the full-text readiness line of <mdj-stem-strip>.
const DEFAULT_REASON = { stem: 'No stems', sampler: 'Missing', 'pitch-play': 'Capacity', slicer: 'No grid', default: 'Blocked' };

export function clampInt(v, lo, hi) { return Math.min(hi, Math.max(lo, Math.round(Number.isFinite(v) ? v : lo))); }

export class MdjPad extends MdjElement {
  static tag = 'mdj-pad';
  static states = ['empty', 'loaded', 'held', 'pending', 'playing', 'edit', 'error', 'disabled', 'unavailable'];
  static fr = ['FR-011', 'FR-017', 'FR-026'];
  static hit = 56;
  static fixture = false;
  static observed = ['mode', 'n', 'label', 'color', 'deck', 'size', 'bank', 'quantized', 'reason'];
  static samples = {
    default: { deck: 'A', n: 3, bank: 2, mode: 'cue', label: 'Break', color: 'cyan' },
    variants: [
      { mode: 'cue' },
      { mode: 'loop', label: '4', color: 'none', n: 5 },
      { mode: 'roll', label: '1/4', color: 'none', n: 3 },
      { mode: 'jump', label: '+4', color: 'none', n: 6 },
      { mode: 'slicer', label: 'Slice 3', color: 'none' },
      { mode: 'sampler', label: 'Clap', color: 'none', deck: 'B', size: 64 },
      { mode: 'pitch-play', label: '+2 st', color: 'none', deck: 'C' },
      { mode: 'stem', label: 'Vocals', color: 'none', n: 1, deck: 'D' },
    ],
    empty: { label: '' },
    pending: { quantized: '1 beat' },
    error: { reason: 'Refused' },
    disabled: { reason: 'No track' },
  };

  render() {
    const modeAttr = this.attr('mode', 'cue');
    const mode = PAD_MODES[modeAttr] ? modeAttr : 'cue';
    const def = PAD_MODES[mode];
    const n = clampInt(this.num('n', 1), 1, 8);
    const bank = clampInt(this.num('bank', 1), 1, 4);
    const deck = (this.attr('deck', 'A') || 'A').toUpperCase();
    const size = this.num('size', 56) >= 64 ? 64 : 56;
    const colorAttr = this.attr('color', 'none');
    const color = CUE_COLORS.includes(colorAttr) ? colorAttr : 'none';
    const label = this.attr('label', '').trim();
    const state = this.state;
    const quantized = this.attr('quantized', '');
    const reason = this.attr('reason', '') || defaultReason(mode, state);

    this.className = `pad pad--${mode} pad--${size} pad--${color} deck-${deck.toLowerCase()}`;
    this.style.setProperty('--pad-size', `${size}px`);

    const nameParts = [`${def.name} ${n}${label ? ` '${label}'` : ''}`, `deck ${deck}`, `bank ${bank}`, STATE_WORD[state] || state];
    if (state === 'pending') nameParts.push(`waiting for ${quantized || 'next beat'}`);
    if ((state === 'unavailable' || state === 'disabled' || state === 'error') && reason) nameParts.push(reason.toLowerCase());
    if (MOMENTARY_MODES.has(mode)) nameParts.push('momentary');
    const inert = state === 'disabled' || state === 'unavailable';
    const toggle = mode === 'loop' || mode === 'stem';

    const btn = h('button', {
      type: 'button', class: 'pad__btn', 'aria-label': nameParts.join(', '),
      'aria-disabled': inert ? 'true' : undefined,
      'aria-pressed': toggle && (state === 'loaded' || state === 'playing') ? String(state === 'playing') : undefined,
      dataset: { hit: String(size) },
      on: { click: () => { if (!inert) this.emit('mdj:pad', { deck, mode, bank, n, state }); } },
    });
    btn.appendChild(h('span', { class: 'pad__face', 'aria-hidden': 'true' }));
    btn.appendChild(h('span', { class: 'pad__ring', 'aria-hidden': 'true' }));
    btn.appendChild(h('span', { class: 'pad__head', 'aria-hidden': 'true' }, [
      h('span', { class: 'pad__n numeral', text: String(n) }),
      mode === 'cue' && color !== 'none' ? h('span', { class: 'pad__swatch' }) : null,
      h('span', { class: 'pad__bank label', text: `B${bank}` }),
    ]));
    btn.appendChild(h('span', { class: 'pad__mid', 'aria-hidden': 'true' }, [midWord(state, def, label, quantized, reason)]));
    btn.appendChild(h('span', { class: 'pad__label truncate', 'aria-hidden': 'true', text: label ? label.toUpperCase() : (state === 'empty' ? 'EMPTY' : '—') }));
    this.replaceChildren(btn);
  }
}

function defaultReason(mode, state) {
  if (state === 'unavailable') return DEFAULT_REASON[mode] || DEFAULT_REASON.default;
  if (state === 'disabled') return 'Off';
  if (state === 'error') return 'Refused';
  return '';
}

function midWord(state, def, label, quantized, reason) {
  const word = (ic, text, cls) => h('span', { class: `pad__word pad__word--${cls}${text ? ' pad__word--text' : ''}` }, [ic ? icon(ic, { size: 14 }) : null, text ? h('span', { class: 'pad__word-text', text }) : null]);
  switch (state) {
    case 'pending': return word('quantize', `Q ${quantized || 'beat'}`, 'pending');
    case 'held': return word('hand', 'Hold', 'held');
    case 'edit': return word('edit', label ? 'Edit' : 'Set', 'edit');
    case 'error': return word('warning', reason, 'error');
    case 'unavailable': return word('unavailable', reason, 'unavailable');
    case 'disabled': return word('lock', reason, 'disabled');
    case 'playing': return word(def.icon, 'On', 'playing');
    case 'loaded': return word(def.icon, '', 'loaded');
    default: return null;
  }
}

define(MdjPad);

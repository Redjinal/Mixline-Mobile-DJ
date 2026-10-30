// <mdj-loop-controls deck="A" length="4" jump="4" roll="1/4" quantized="1 beat"
//                    pending="in|out|reloop|exit|half|double" saved
//                    state="inactive|active|pending|roll">
//
// Engine binding: In / Out / Reloop / Exit / ½ / ×2 / Roll / Beat jump each issue ONE
// EngineCommand(loop.in | loop.out | loop.reloop | loop.exit | loop.half | loop.double | loop.roll |
// deck.beatjump) carrying the deck generation and the quantize resolution (FR-017, FR-018). The
// readout shows the acknowledged loop state from the snapshot. Roll is momentary (pad-down / pad-up
// under one touch id) and the deck returns to where it would have been (slip), so the readout says
// "returns on release".
// Units / range: loop length in beats (1/16 … 32, printed as a fraction below 1); beat-jump size in
// beats (1, 2, 4, 8, 16, 32); roll lengths 1/16 … 4 beats.
// Gesture: taps; roll buttons are press-and-hold. Every target is ≥ 48 dp and rows wrap instead of
// shrinking (also at 200 % font scale).
// Pending vs acknowledged: `pending` = a quantized In / Out / Reloop admitted but not executed: that
// button carries a dashed deck ring and a "Q" badge, and the readout prints "Q · <quantize>" while
// staying on the LAST acknowledged length. `active` = the engine acknowledged the loop: the readout
// is a filled deck face and Exit is pressed. The two never share a visual and nothing animates to
// claim success (the dashed ring pulses only while waiting; reduced motion stops it).
// Cancellation: tapping a pending button again cancels it before the grid point; pointer-cancel,
// app background, route loss and rotation release a held roll safely (pad-up); an active loop
// survives rotation and deck-focus changes.
// Accessible: real <button>s named with deck and value ("Halve loop, deck A, 4 to 2 beats"); the
// beat-jump size is a button that cycles 1 → 2 → 4 → 8 → 16 → 32 and announces the new size; Exit
// and the held roll use aria-pressed.
import { MdjElement, define, h, icon } from './base.js';

const ROLLS = ['1/16', '1/8', '1/4', '1/2', '1', '2', '4'];
const JUMPS = [1, 2, 4, 8, 16, 32];

export class MdjLoopControls extends MdjElement {
  static tag = 'mdj-loop-controls';
  static states = ['inactive', 'active', 'pending', 'roll'];
  static fr = ['FR-017', 'FR-018', 'FR-019'];
  static hit = 0; // layout container: every button inside carries data-hit="48"
  static fixture = false;
  static observed = ['deck', 'length', 'jump', 'roll', 'quantized', 'pending', 'saved'];
  static samples = {
    default: { deck: 'A', length: 4, jump: 4, saved: true, style: 'width:min(100%, 380px)' },
    variants: [{}, { deck: 'B', length: '1/2', jump: 1 }],
    pending: { quantized: '1 beat', pending: 'in' },
    roll: { roll: '1/4' },
  };

  render() {
    const deck = (this.attr('deck', 'A') || 'A').toUpperCase();
    const state = this.state;
    const lenBeats = toBeats(this.attr('length', '4'), 4);
    const lenText = fmtBeats(lenBeats);
    const jumpAttr = Math.round(this.num('jump', 4));
    const jump = JUMPS.includes(jumpAttr) ? jumpAttr : 4;
    const roll = ROLLS.includes(this.attr('roll', '1/4')) ? this.attr('roll', '1/4') : '1/4';
    const quantized = this.attr('quantized', '1 beat');
    const pending = this.attr('pending', 'in');
    const saved = this.bool('saved') || state === 'active';
    const active = state === 'active';
    this.className = `loop loop--${state} deck-${deck.toLowerCase()}`;

    const btn = ({ text, ic, name, cls = '', pressed, disabled, isPending, on }) => {
      const b = h('button', {
        type: 'button', class: `loop__btn ${cls}${isPending ? ' loop__btn--pending' : ''}`.trim(), 'aria-label': name,
        'aria-pressed': pressed === undefined ? undefined : String(pressed), 'aria-disabled': disabled ? 'true' : undefined, dataset: { hit: '48' },
        on: { click: () => { if (!disabled) on(); } },
      }, [ic ? icon(ic, { size: 16 }) : null, h('span', { class: 'loop__btn-text', text })]);
      if (isPending) b.appendChild(h('span', { class: 'loop__q label', 'aria-hidden': 'true', text: 'Q' }));
      return b;
    };
    const isPending = (id) => state === 'pending' && pending === id;
    const waiting = (id) => (isPending(id) ? `, waiting for ${quantized}` : '');
    const emit = (cmd, extra = {}) => this.emit('mdj:loop', { deck, cmd, length: lenBeats, ...extra });

    // ---- main row: In · Out · Reloop/Exit · readout · ½ · ×2 ----
    const main = h('div', { class: 'loop__row loop__row--main' }, [
      btn({ text: 'In', ic: 'loop-in', name: `Loop in, deck ${deck}${waiting('in')}`, isPending: isPending('in'), on: () => emit('in') }),
      btn({ text: 'Out', ic: 'loop-out', name: `Loop out, deck ${deck}${waiting('out')}`, isPending: isPending('out'), on: () => emit('out') }),
      active
        ? btn({ text: 'Exit', ic: 'reloop', name: `Exit loop, deck ${deck}, ${lenText} beats looping${waiting('exit')}`, pressed: true, isPending: isPending('exit'), on: () => emit('exit') })
        : btn({ text: 'Reloop', ic: 'reloop', name: `Reloop, deck ${deck}${saved ? `, saved ${lenText}-beat loop` : ', no saved loop'}${waiting('reloop')}`, pressed: false, disabled: !saved, isPending: isPending('reloop'), on: () => emit('reloop') }),
      this.readout({ deck, state, lenText, lenBeats, roll, quantized }),
      btn({ text: '½', cls: 'loop__btn--math', name: `Halve loop, deck ${deck}, ${lenText} to ${fmtBeats(lenBeats / 2)} beats${waiting('half')}`, disabled: lenBeats <= 1 / 16, isPending: isPending('half'), on: () => emit('half') }),
      btn({ text: '×2', cls: 'loop__btn--math', name: `Double loop, deck ${deck}, ${lenText} to ${fmtBeats(lenBeats * 2)} beats${waiting('double')}`, disabled: lenBeats >= 32, isPending: isPending('double'), on: () => emit('double') }),
    ]);

    // ---- roll row ----
    const rollRow = h('div', { class: 'loop__row loop__row--roll', role: 'group', 'aria-label': `Loop roll, deck ${deck}, momentary` }, ROLLS.map((r) => btn({
      text: r, cls: 'loop__btn--roll', name: `Loop roll ${r === '1' ? '1 beat' : r + (r.includes('/') ? ' beat' : ' beats')}, deck ${deck}, momentary`,
      pressed: state === 'roll' && r === roll, on: () => emit('roll', { roll: r }),
    })));

    // ---- beat jump row ----
    const jumpRow = h('div', { class: 'loop__row loop__row--jump', role: 'group', 'aria-label': `Beat jump, deck ${deck}` }, [
      btn({ text: `−${jump}`, ic: 'chevron-left', cls: 'loop__btn--jump', name: `Beat jump back ${jump} ${jump === 1 ? 'beat' : 'beats'}, deck ${deck}`, on: () => emit('jump', { beats: -jump }) }),
      btn({ text: `${jump} ${jump === 1 ? 'beat' : 'beats'}`, ic: 'beatjump', cls: 'loop__btn--size', name: `Beat jump size, ${jump} ${jump === 1 ? 'beat' : 'beats'}, deck ${deck}; activates to change to ${nextJump(jump)}`, on: () => emit('jump-size', { beats: nextJump(jump) }) }),
      btn({ text: `+${jump}`, ic: 'chevron-right', cls: 'loop__btn--jump loop__btn--jump-fwd', name: `Beat jump forward ${jump} ${jump === 1 ? 'beat' : 'beats'}, deck ${deck}`, on: () => emit('jump', { beats: jump }) }),
    ]);

    this.replaceChildren(
      h('div', { class: 'loop__group' }, [h('span', { class: 'label loop__rowlabel', text: `Loop · deck ${deck}` }), main]),
      h('div', { class: 'loop__group' }, [h('span', { class: 'label loop__rowlabel', text: 'Roll · hold' }), rollRow]),
      h('div', { class: 'loop__group' }, [h('span', { class: 'label loop__rowlabel', text: 'Beat jump' }), jumpRow]),
    );
  }

  readout({ deck, state, lenText, lenBeats, roll, quantized }) {
    const status = state === 'active' ? 'Looping' : state === 'pending' ? `Q · ${quantized}` : state === 'roll' ? 'Roll · slip' : 'No loop';
    const spoken = state === 'roll' ? 'roll, returns on release (slip)' : status;
    const shown = state === 'roll' ? roll : lenText;
    const unit = (state === 'roll' ? toBeats(roll, 1) : lenBeats) <= 1 ? 'beat' : 'beats';
    return h('div', { class: 'loop__readout brass-rim', role: 'status', 'aria-label': `Loop length ${shown} ${unit}, deck ${deck}, ${spoken}` }, [
      h('div', { class: 'loop__window' }, [
        h('span', { class: 'loop__len numeral', 'aria-hidden': 'true', text: shown }),
        h('span', { class: 'loop__meta', 'aria-hidden': 'true' }, [
          h('span', { class: 'loop__unit label', text: unit }),
          h('span', { class: 'loop__status', text: status }),
        ]),
      ]),
    ]);
  }
}

function toBeats(text, def) {
  const t = String(text).trim();
  if (/^\d+\/\d+$/.test(t)) { const [a, b] = t.split('/').map(Number); return b ? a / b : def; }
  const v = parseFloat(t);
  return Number.isFinite(v) && v > 0 ? v : def;
}
function fmtBeats(b) {
  if (b >= 1) return Number.isInteger(b) ? String(b) : b.toFixed(2);
  const den = Math.round(1 / b);
  return `1/${den}`;
}
function nextJump(j) { const i = JUMPS.indexOf(j); return JUMPS[(i + 1) % JUMPS.length]; }

define(MdjLoopControls);

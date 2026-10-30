// <mdj-sample-slot n="1..16" name="Clap" trigger="one-shot|loop|gate" level="0..1" choke="1..4|none"
//                  bank="1|2" quantized="1 bar" reason="…" size="56|64"
//                  state="empty|loaded|playing|choked|missing|edit|pending">
//
// Engine binding: a tap issues EngineCommand(sampler.trigger, { bank, slot, velocity, quantize });
// gate slots send trigger-down / trigger-up under one touch id; loop slots toggle. The slot draws
// the ACKNOWLEDGED voice state from the snapshot: playing, or choked (the voice was stopped by a
// sibling in the same choke group). The sampler is separate from the four music decks (AE-06), so a
// slot uses ink, not a deck colour, and the small control radius rather than the pad radius: a slot
// is never read as a deck pad.
// Units / range: n 1..16 (bank 1 holds 1–8, bank 2 holds 9–16), level 0..1 is the slot's USER gain
// shown as a percentage in the name — it is a setting, not a meter, so there is no FIXTURE mark;
// choke group 1..4 or none; trigger one-shot, loop or gate.
// Gesture: tap (one-shot; loop toggles) or press-and-hold (gate). No long-press shortcut:
// assignment and clearing happen in the bank's explicit Edit state with labelled actions.
// Pending vs acknowledged: `pending` = quantized trigger admitted, waiting for the grid point
// (dashed ink ring, "Q · <quantize>" chip); `playing` = voice acknowledged (filled ink face);
// `choked` = stopped by its choke group (struck ring, "Choked"). None of them share a visual and
// nothing animates to claim a trigger landed.
// Cancellation: pointer-cancel, app background, route loss and rotation release a held gate
// (trigger-up); a pending trigger is cancelled by tapping again before the grid point. Voice
// stealing follows the engine order, never a UI timer.
// Accessible: a real <button> named "Sample 3 'Clap', bank 1, one-shot, choke group 1, level 80 %,
// loaded"; one activation is one engine action. Missing slots stay in the tab order and say why.
import { MdjElement, define, h, icon } from './base.js';
import { clampInt } from './mdj-pad.js';

const TRIGGERS = { 'one-shot': { word: '1-shot', icon: 'play', name: 'one-shot' }, loop: { word: 'Loop', icon: 'loop', name: 'loop' }, gate: { word: 'Gate', icon: 'hand', name: 'gate, hold to play' } };
const STATE_WORD = { empty: 'empty', loaded: 'loaded', playing: 'playing', choked: 'choked', missing: 'missing', edit: 'editing', pending: 'pending' };

export class MdjSampleSlot extends MdjElement {
  static tag = 'mdj-sample-slot';
  static states = ['empty', 'loaded', 'playing', 'choked', 'missing', 'edit', 'pending'];
  static fr = ['FR-027'];
  static hit = 56;
  static fixture = false;
  static observed = ['n', 'name', 'trigger', 'level', 'choke', 'bank', 'quantized', 'reason', 'size'];
  static samples = {
    default: { n: 3, name: 'Clap', trigger: 'one-shot', level: 0.8, choke: 1, bank: 1 },
    variants: [{}, { n: 4, name: 'Riser', trigger: 'loop', choke: 3, level: 0.6 }, { n: 5, name: 'Vox hit', trigger: 'gate', choke: 2, level: 1, size: 64 }],
    empty: { name: '' },
    missing: { name: 'Crash', reason: 'File moved' },
    pending: { quantized: '1 bar' },
  };

  render() {
    const n = clampInt(this.num('n', 1), 1, 16);
    const bank = this.hasAttribute('bank') ? clampInt(this.num('bank', 1), 1, 2) : (n > 8 ? 2 : 1);
    const name = this.attr('name', '').trim();
    const trigAttr = this.attr('trigger', 'one-shot');
    const trigger = TRIGGERS[trigAttr] ? trigAttr : 'one-shot';
    const trig = TRIGGERS[trigger];
    const level = Math.min(1, Math.max(0, this.num('level', 1)));
    const chokeAttr = this.attr('choke', 'none');
    const choke = /^[1-4]$/.test(chokeAttr) ? chokeAttr : 'none';
    const size = this.num('size', 56) >= 64 ? 64 : 56;
    const state = this.state;
    const quantized = this.attr('quantized', '');
    const reason = this.attr('reason', '') || (state === 'missing' ? 'Missing' : '');
    this.className = `slot slot--${trigger} slot--${size}`;
    this.style.setProperty('--slot-size', `${size}px`);

    const parts = [`Sample ${n}${name ? ` '${name}'` : ''}`, `bank ${bank}`, trig.name];
    if (choke !== 'none') parts.push(`choke group ${choke}`);
    if (state !== 'empty') parts.push(`level ${Math.round(level * 100)} %`);
    parts.push(STATE_WORD[state] || state);
    if (state === 'pending') parts.push(`waiting for ${quantized || 'next bar'}`);
    if (state === 'missing' && reason) parts.push(reason.toLowerCase());
    const inert = state === 'missing' || state === 'empty';

    const btn = h('button', {
      type: 'button', class: 'slot__btn', 'aria-label': parts.join(', '), 'aria-disabled': inert ? 'true' : undefined,
      'aria-pressed': trigger === 'loop' && (state === 'loaded' || state === 'playing') ? String(state === 'playing') : undefined,
      dataset: { hit: String(size) },
      on: { click: () => { if (!inert) this.emit('mdj:sample', { n, bank, trigger, state }); } },
    });
    btn.appendChild(h('span', { class: 'slot__face', 'aria-hidden': 'true' }));
    btn.appendChild(h('span', { class: 'slot__ring', 'aria-hidden': 'true' }));
    btn.appendChild(h('span', { class: 'slot__head', 'aria-hidden': 'true' }, [
      h('span', { class: 'slot__n numeral', text: String(n) }),
      choke !== 'none' ? h('span', { class: 'slot__choke label', text: `CH${choke}` }) : h('span', { class: 'slot__choke slot__choke--none label', text: '—' }),
    ]));
    btn.appendChild(h('span', { class: 'slot__mid', 'aria-hidden': 'true' }, [midWord(state, trig, name, quantized)]));
    btn.appendChild(h('span', { class: 'slot__name truncate', 'aria-hidden': 'true', text: name ? name.toUpperCase() : (state === 'empty' ? 'EMPTY' : '—') }));
    this.replaceChildren(btn);
  }
}

function midWord(state, trig, name, quantized) {
  const word = (ic, text, cls) => h('span', { class: `slot__word slot__word--${cls}${text ? ' slot__word--text' : ''}` }, [ic ? icon(ic, { size: 14 }) : null, text ? h('span', { class: 'slot__word-text', text }) : null]);
  switch (state) {
    case 'pending': return word('quantize', `Q ${quantized || 'bar'}`, 'pending');
    case 'playing': return word(trig.icon, 'On', 'playing');
    case 'choked': return word('x', 'Choked', 'choked');
    case 'missing': return word('warning', 'Missing', 'missing'); // the reason (e.g. "File moved") is in the accessible name
    case 'edit': return word('edit', name ? 'Edit' : 'Assign', 'edit');
    case 'loaded': return word(trig.icon, trig.word, 'loaded');
    default: return null;
  }
}

define(MdjSampleSlot);

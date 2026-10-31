// <mdj-time-display elapsed="92" remaining="280" mode="elapsed|remaining" deck="A" size="sm|md|lg" secondary
//                   state="idle|unknown">
//
// Engine binding: none for the readout — elapsed / remaining come from the engine snapshot's
// acknowledged deck position (FR-010). The tap changes a VIEW preference (which value leads) and emits
// mdj:time-mode { deck, mode }; it never sends an EngineCommand. Both values are always in the
// accessible name, so a screen reader never depends on the visible mode.
// Units / range: seconds ≥ 0; the remaining value prints with a leading minus (−4:40) per DJ
// convention, tabular numerals so the readout never jumps (Document 04 §5). `secondary` also prints
// the other value small beside the leading one (used by the full deck summary).
// Gesture: tap (48 dp real <button>). Pending vs acknowledged: the mode flips at once because it is
// a local view setting, not a command; the numerals only follow acknowledged positions.
// Cancellation: n/a. `unknown` (no track, or the position is not known) prints dashes, disables the
// button and says "position unknown".
// Accessible: "Time, deck A: elapsed 1:32, remaining 4:40. Showing elapsed; tap to show remaining".
import { MdjElement, define, h, fmt } from './base.js';

export class MdjTimeDisplay extends MdjElement {
  static tag = 'mdj-time-display';
  static states = ['idle', 'unknown'];
  static fr = ['FR-010'];
  static hit = 48;
  static fixture = false;
  static observed = ['elapsed', 'remaining', 'mode', 'deck', 'size', 'secondary'];
  static samples = {
    default: { elapsed: 92, remaining: 280, deck: 'A', mode: 'elapsed' },
    variants: [{ mode: 'elapsed' }, { mode: 'remaining', deck: 'B' }, { size: 'lg', secondary: true, deck: 'C', elapsed: 3542, remaining: 61 }],
    unknown: { elapsed: null, remaining: null },
  };

  render() {
    const deck = this.attr('deck', '').toUpperCase();
    const mode = this.attr('mode', 'elapsed') === 'remaining' ? 'remaining' : 'elapsed';
    const sizeAttr = this.attr('size', 'md');
    const size = ['sm', 'md', 'lg'].includes(sizeAttr) ? sizeAttr : 'md';
    const secondary = this.bool('secondary');
    const hasE = this.hasAttribute('elapsed') && Number.isFinite(parseFloat(this.getAttribute('elapsed')));
    const hasR = this.hasAttribute('remaining') && Number.isFinite(parseFloat(this.getAttribute('remaining')));
    const state = this.state === 'unknown' || (!hasE && !hasR) ? 'unknown' : 'idle';
    const elapsed = hasE ? Math.max(0, this.num('elapsed', 0)) : null;
    const remaining = hasR ? Math.max(0, this.num('remaining', 0)) : null;
    this.className = `time-display time-display--${mode} time-display--${size} time-display--${state}${deck ? ` deck-${deck.toLowerCase()}` : ''}`;
    const text = (v, rem) => (v == null ? (rem ? '−:––' : '–:––') : fmt.time(v, { remaining: rem }).replace(/^-/, '−'));
    const lead = mode === 'elapsed' ? text(elapsed, false) : text(remaining, true);
    const other = mode === 'elapsed' ? text(remaining, true) : text(elapsed, false);
    const deckWord = deck ? `, deck ${deck}` : '';
    const name = state === 'unknown'
      ? `Time${deckWord}: position unknown`
      : `Time${deckWord}: elapsed ${elapsed == null ? 'unknown' : fmt.time(elapsed)}, remaining ${remaining == null ? 'unknown' : fmt.time(remaining)}. Showing ${mode}; tap to show ${mode === 'elapsed' ? 'remaining' : 'elapsed'}`;
    const btn = h('button', {
      type: 'button', class: 'time-display__btn', 'aria-label': name, disabled: state === 'unknown' ? true : null, dataset: { hit: '48' },
      on: { click: () => { const next = mode === 'elapsed' ? 'remaining' : 'elapsed'; this.setAttribute('mode', next); this.emit('mdj:time-mode', { deck, mode: next }); } },
    }, [
      h('span', { class: 'time-display__label label', text: mode === 'elapsed' ? 'Elapsed' : 'Remaining', 'aria-hidden': 'true' }),
      h('span', { class: 'time-display__value numeral', text: lead, 'aria-hidden': 'true' }),
      secondary ? h('span', { class: 'time-display__alt numeral', text: other, 'aria-hidden': 'true' }) : null,
    ]);
    this.replaceChildren(btn);
  }
}
define(MdjTimeDisplay);

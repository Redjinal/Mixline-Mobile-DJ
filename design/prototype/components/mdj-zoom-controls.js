// <mdj-zoom-controls zoom="8" min="1" max="64" fit="16" deck="A" state="idle|min|max|disabled">
//
// Engine binding: none. Zoom is VIEW state of the detailed waveform (FR-009 "explicit zoom"); the
// buttons change the number of bars visible and emit mdj:zoom { deck, bars, phase: 'end' } for the
// screen to pass to <mdj-waveform zoom>. No EngineCommand, no revision, no audible effect, so the
// value applies immediately (Document 03 §5: performance controls apply immediately).
// Units / range: bars visible, min..max (1..64 by default), halved / doubled per tap; "Fit" sets the
// `fit` value (16 bars = one phrase at 4/4 by default). Fewer bars = closer.
// Gesture: taps on three real 48 dp <button>s plus a live readout; this is the accessible alternative to
// the detailed waveform's pinch (Document 03 §4). Keyboard: the buttons are ordinary buttons.
// Pending vs acknowledged: n/a (view state). At the bounds the matching button is disabled and the
// readout says "closest" / "widest"; `disabled` (no track) greys all three with the reason (`reason` attribute, default "no track").
// Cancellation: n/a. Accessible: "Zoom in, deck A waveform, now 8 bars" / "Fit 16 bars".
import { MdjElement, define, h, icon } from './base.js';

const pow2 = (v) => Math.pow(2, Math.round(Math.log2(Math.max(1, v))));

export class MdjZoomControls extends MdjElement {
  static tag = 'mdj-zoom-controls';
  static states = ['idle', 'min', 'max', 'disabled'];
  static fr = ['FR-009'];
  static hit = 48;
  static fixture = false;
  static observed = ['zoom', 'min', 'max', 'fit', 'deck', 'reason'];
  static samples = {
    default: { zoom: 8, min: 1, max: 64, fit: 16, deck: 'A' },
    variants: [{}],
    min: { zoom: 1 },
    max: { zoom: 64 },
    disabled: { zoom: 8 },
  };

  render() {
    const deck = this.attr('deck', '').toUpperCase();
    const min = Math.max(1, this.num('min', 1)), max = Math.max(min, this.num('max', 64));
    const fit = Math.min(max, Math.max(min, this.num('fit', 16)));
    const zoom = Math.min(max, Math.max(min, pow2(this.num('zoom', 8))));
    const disabled = this.state === 'disabled';
    const state = disabled ? 'disabled' : zoom <= min ? 'min' : zoom >= max ? 'max' : 'idle';
    this.className = `zoom zoom--${state}${deck ? ` deck-${deck.toLowerCase()}` : ''}`;
    const deckWord = deck ? `deck ${deck} waveform` : 'waveform';
    const bars = (n) => `${n} bar${n === 1 ? '' : 's'}`;
    const set = (next, source) => {
      const v = Math.min(max, Math.max(min, next));
      this.setAttribute('zoom', String(v));
      this.emit('mdj:zoom', { kind: 'zoom', deck, bars: v, phase: 'end', source });
    };
    const btn = (label, ic, cls, off, fn, text = null) => h('button', {
      type: 'button', class: `zoom__btn ${cls}`.trim(), 'aria-label': label, disabled: off ? true : null, dataset: { hit: '48' }, on: { click: fn },
    }, [icon(ic, { size: 18 }), text ? h('span', { class: 'zoom__btn-text label', text }) : null]);
    const reason = disabled ? ` (${this.attr('reason', 'no track')})` : '';
    const outBtn = btn(`Zoom out, ${deckWord}, now ${bars(zoom)}${state === 'max' ? ', widest' : ''}${reason}`, 'minus', 'zoom__out', disabled || zoom >= max, () => set(zoom * 2, 'button'));
    const inBtn = btn(`Zoom in, ${deckWord}, now ${bars(zoom)}${state === 'min' ? ', closest' : ''}${reason}`, 'plus', 'zoom__in', disabled || zoom <= min, () => set(zoom / 2, 'button'));
    const fitBtn = btn(`Fit ${bars(fit)}, ${deckWord}${zoom === fit ? ', current' : ''}${reason}`, 'grid', 'zoom__fit', disabled, () => set(fit, 'fit'), 'Fit');
    if (zoom === fit) fitBtn.setAttribute('aria-pressed', 'true');
    const readout = h('span', { class: 'zoom__readout numeral ink-backing', 'aria-live': 'polite', 'aria-atomic': 'true' }, [
      h('span', { class: 'zoom__value', text: disabled ? '—' : String(zoom) }),
      h('span', { class: 'zoom__unit label', text: disabled ? this.attr('reason', 'no track') : `bar${zoom === 1 ? '' : 's'}${state === 'min' ? ' · closest' : state === 'max' ? ' · widest' : ''}` }),
    ]);
    const group = h('div', { class: 'zoom__group', role: 'group', 'aria-label': `Zoom, ${deckWord}` }, [outBtn, readout, inBtn, fitBtn]);
    this.replaceChildren(group);
  }
}
define(MdjZoomControls);

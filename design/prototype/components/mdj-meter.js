// <mdj-meter l="0.6" r="0.58" peak="0.71" clip orientation="horizontal|vertical" scale="compact|full" label="Master" state="idle|active|clipping|muted">
//
// Shows the fixture level the scenario supplies. Real meters read the engine snapshot's
// post-limiter master tap (Document 06, AE-04); ballistics and the exact tap are a DSP
// contract decision, so this component documents units only: 0..1 of full scale, with
// marks at the -12 / -6 / -3 / 0 dBFS equivalents. Always renders a FIXTURE mark.
// Accessible: role=meter with aria-valuetext "Master -6 dB, peak -3 dB, clipping".
import { MdjElement, define, h } from './base.js';

const MARKS = [[0.25, '-12'], [0.5, '-6'], [0.71, '-3'], [1, '0']];

export class MdjMeter extends MdjElement {
  static tag = 'mdj-meter';
  static states = ['idle', 'active', 'clipping', 'muted'];
  static fr = ['FR-021'];
  static hit = 0;
  static fixture = true;
  static observed = ['l', 'r', 'peak', 'clip', 'orientation', 'scale', 'label', 'gr'];
  static samples = { default: { l: 0.6, r: 0.57, peak: 0.71, label: 'Master', scale: 'full', style: 'width:220px' }, variants: [{ orientation: 'horizontal' }, { orientation: 'vertical', style: 'height:120px' }], idle: { l: 0, r: 0, peak: null }, clipping: { l: 1, r: 1, peak: 1, clip: true, gr: -4.2 }, muted: { l: 0, r: 0 } };

  render() {
    const l = clamp(this.num('l', 0)), r = clamp(this.num('r', 0));
    const peak = this.hasAttribute('peak') ? clamp(this.num('peak', 0)) : null;
    const clip = this.bool('clip');
    const orientation = this.attr('orientation', 'horizontal');
    const scale = this.attr('scale', 'compact');
    const label = this.attr('label', 'Master');
    const gr = this.hasAttribute('gr') ? this.num('gr', 0) : null;
    const state = clip ? 'clipping' : this.state;
    this.className = `meter meter--${orientation} meter--${scale} meter--${state}`;
    const db = (x) => (x <= 0 ? '−∞' : (20 * Math.log10(x)).toFixed(0));
    const valuetext = `${label} left ${db(l)} dB, right ${db(r)} dB${peak != null ? `, peak ${db(peak)} dB` : ''}${clip ? ', clipping' : ''}${gr != null ? `, limiter ${gr.toFixed(1)} dB` : ''}`;
    const wrap = h('div', { class: 'meter__wrap', role: 'meter', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(Math.max(l, r) * 100), 'aria-valuetext': valuetext });
    for (const [ch, val] of [['L', l], ['R', r]]) {
      const bar = h('div', { class: 'meter__bar sunken', 'aria-hidden': 'true' });
      // Full-width gradient clipped to the level, so colour maps to position rather than scaling with the fill.
      bar.appendChild(h('span', { class: 'meter__fill', style: { clipPath: orientation === 'horizontal' ? `inset(0 ${(1 - val) * 100}% 0 0)` : `inset(${(1 - val) * 100}% 0 0 0)` } }));
      if (peak != null) bar.appendChild(h('span', { class: 'meter__peak', style: { [orientation === 'horizontal' ? 'left' : 'bottom']: `${peak * 100}%` } }));
      if (scale === 'full') for (const [pos, text] of MARKS) bar.appendChild(h('span', { class: 'meter__mark', style: { [orientation === 'horizontal' ? 'left' : 'bottom']: `${pos * 100}%` }, dataset: { text } }));
      wrap.appendChild(h('div', { class: 'meter__channel' }, [h('span', { class: 'meter__ch label', text: ch }), bar]));
    }
    const flags = h('div', { class: 'meter__flags' }, [
      clip ? h('span', { class: 'meter__clip tone-critical label', text: 'CLIP' }) : null,
      gr != null ? h('span', { class: 'meter__gr tone-warning label', text: `LIM ${gr.toFixed(1)} dB` }) : null,
      state === 'muted' ? h('span', { class: 'meter__muted tone-neutral label', text: 'MUTED' }) : null,
    ]);
    this.replaceChildren(h('span', { class: 'meter__label label', text: label }), wrap, flags);
  }
}
function clamp(x) { return Math.min(1, Math.max(0, x)); }
define(MdjMeter);

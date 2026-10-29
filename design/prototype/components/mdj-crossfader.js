// <mdj-crossfader value="0.5" assign-a="A" assign-b="B" curve="equal-power" state="idle|held|disabled|pending" bypass>
//
// Engine binding: EngineCommand(crossfader, value 0..1) with the master-control revision;
// the thumb shows the acknowledged value. Units: position 0 (full A side) .. 1 (full B side).
// Pickup: default pickup on the thumb; an incidental tap away from the thumb does not jump.
// Jump-to-touch is an advanced preference, off by default.
// Cancellation: pointer-cancel leaves the last acknowledged value.
// Accessible alternative: role=slider with arrow keys (±0.02) and Home/End; value announced as "A 58 % B".
import { MdjElement, define, h } from './base.js';

export class MdjCrossfader extends MdjElement {
  static tag = 'mdj-crossfader';
  static states = ['idle', 'held', 'disabled', 'pending'];
  static fr = ['FR-020'];
  static hit = 48;
  static observed = ['value', 'assign-a', 'assign-b', 'curve', 'bypass', 'compact'];
  static samples = { default: { value: 0.58, 'assign-a': 'A', 'assign-b': 'B', curve: 'equal-power', style: 'width:300px' }, pending: { value: 0.2 } };

  render() {
    const v = Math.min(1, Math.max(0, this.num('value', 0.5)));
    const a = this.attr('assign-a', 'A'), b = this.attr('assign-b', 'B');
    const curve = this.attr('curve', 'equal-power');
    const bypass = this.bool('bypass');
    const compact = this.bool('compact');
    this.className = `crossfader ${compact ? 'crossfader--compact' : ''} ${bypass ? 'crossfader--bypass' : ''}`.trim();
    const pct = Math.round(v * 100);
    const slider = h('div', {
      class: 'crossfader__rail', role: 'slider', tabindex: this.state === 'disabled' ? -1 : 0,
      'aria-label': `Crossfader, ${a} to ${b}${bypass ? ', bypassed' : ''}, ${curve} curve`,
      'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct, 'aria-valuetext': `${100 - pct} % ${a}, ${pct} % ${b}`,
      'aria-disabled': this.state === 'disabled' ? 'true' : undefined, dataset: { hit: '48' },
    });
    slider.appendChild(h('span', { class: 'crossfader__guide brass', 'aria-hidden': 'true' }));
    slider.appendChild(h('span', { class: 'crossfader__fill-a', style: { width: `${(1 - v) * 100}%` }, 'aria-hidden': 'true' }));
    slider.appendChild(h('span', { class: 'crossfader__fill-b', style: { width: `${v * 100}%` }, 'aria-hidden': 'true' }));
    slider.appendChild(h('span', { class: 'crossfader__centre index-mark', 'aria-hidden': 'true' }));
    slider.appendChild(h('span', { class: 'crossfader__thumb brass-rim', style: { left: `${v * 100}%` }, 'aria-hidden': 'true' }, [
      h('span', { class: 'crossfader__face titanium' }, [h('span', { class: 'crossfader__grip' })]),
    ]));
    const left = h('span', { class: `crossfader__end label label-strong deck-${a.toLowerCase()}`, text: a });
    const right = h('span', { class: `crossfader__end label label-strong deck-${b.toLowerCase()}`, text: b });
    const meta = compact ? null : h('span', { class: 'crossfader__meta label', text: `${bypass ? 'BYPASS · ' : ''}${curve.replace('-', ' ')}` });
    this.replaceChildren(...[left, slider, right, meta].filter(Boolean));
  }
}
define(MdjCrossfader);

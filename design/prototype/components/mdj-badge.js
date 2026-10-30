// <mdj-badge count="3|0|240|unknown" label="proposals" max="99">
//
// Document 04 §4 "Badges": count actionable items only; hide a known zero; show 1–99 then 99+; an
// unknown count stays unknown ("?" with the accessible text "unknown count"). Geometry is stable:
// the pill keeps its height and minimum width whatever it prints, and a hidden badge keeps its box
// (visibility, not display) so neighbouring controls never shift.
// Engine binding: none — counts come from the owning screen (queue readiness, proposals, filters).
// Units / range: non-negative integer or unknown. Gesture: none (hit 0); the parent control is the target.
// Pending vs acknowledged: n/a. Cancellation: n/a.
// Accessible: role=status with the exact count in the name ("3 proposals", "more than 99 proposals",
// "unknown count of proposals"); a hidden badge is aria-hidden.
import { MdjElement, define, h } from './base.js';

export class MdjBadge extends MdjElement {
  static tag = 'mdj-badge';
  static states = ['visible', 'hidden', 'overflow', 'unknown'];
  static fr = ['FR-038'];
  static hit = 0;
  static observed = ['count', 'label', 'max'];
  static samples = {
    default: { count: 3, label: 'proposals' },
    variants: [{}],
    visible: { count: 3 },
    hidden: { count: 0 },
    overflow: { count: 240 },
    unknown: { count: 'unknown' },
  };

  render() {
    const raw = this.getAttribute('count');
    const label = this.attr('label', 'items');
    const max = Math.max(1, this.num('max', 99));
    let state, text, name;
    if (raw === null || raw === '') { state = 'hidden'; text = ''; name = `no ${label}`; }
    else if (raw === 'unknown' || raw === '?' || !Number.isFinite(Number(raw))) { state = 'unknown'; text = '?'; name = `unknown count of ${label}`; }
    else {
      const n = Math.max(0, Math.round(Number(raw)));
      if (n === 0) { state = 'hidden'; text = ''; name = `no ${label}`; }
      else if (n > max) { state = 'overflow'; text = `${max}+`; name = `more than ${max} ${label}`; }
      else { state = 'visible'; text = String(n); name = `${n} ${label}`; }
    }
    this.dataset.state = state;
    this.className = `badge-c badge-c--${state}`;
    this.replaceChildren(h('span', {
      class: 'badge-c__pill numeral', role: state === 'hidden' ? undefined : 'status', 'aria-label': state === 'hidden' ? undefined : name,
      'aria-hidden': state === 'hidden' ? 'true' : undefined, text,
    }));
  }
}
define(MdjBadge);

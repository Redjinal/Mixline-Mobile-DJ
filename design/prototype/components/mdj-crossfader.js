// <mdj-crossfader value="0.58" pending-value assign-a="A" assign-b="B" curve="linear|equal-power|cut" reverse
//                 detents bypass compact state="idle|held|disabled|pending">
//
// Engine binding: EngineCommand(crossfader, { value }) with the master-control revision; curve, reverse,
// assignment and bypass are mixer settings (FR-020) sent as EngineCommand(set_crossfader_config) and
// shown here only once acknowledged. `value` is the ACKNOWLEDGED thumb position; `pending-value` is the
// last SENT, unacknowledged position (dashed ghost thumb, SENT badge).
// Units: physical thumb position 0 (left end) .. 1 (right end). assign-a names the left deck and
// assign-b the right deck; `reverse` swaps the ends (hamster) and the printed letters swap with it, so
// the letters — not the colours — say which deck is where. `bypass` prints BYPASS and dims the guide.
// Curve: linear | equal-power (default) | cut; the meta line prints the curve name with a glyph and the
// REVERSE / DETENTS flags. The real curve law and cut-in width are DSP contracts (Document 06).
// Gesture: PICKUP ON THE THUMB — a drag starts only on the thumb (or within 12 px); an incidental tap
// elsewhere does nothing. Jump-to-touch is an advanced preference, off by default. Detents (`detents`)
// are marks and haptic ticks at the ends and the centre; they never resist an intentional fast cut.
// Pending vs acknowledged: held → HELD badge and the thumb follows the finger; release → `pending`
// with pending-value and mdj:value { phase: 'end' } until the screen (standing in for the engine)
// acknowledges by setting `value` and clearing `state`. Nothing animates to imply success.
// Cancellation: pointer-cancel, capture loss, app background or rotation drop the dragged position,
// keep the acknowledged thumb and emit mdj:value { phase: 'cancel' }. Route loss → `disabled`.
// Accessible alternative: role=slider "Crossfader, A to B, equal power curve" with arrow keys (±0.02),
// PageUp/PageDown (±0.1), Home/End (full left/right); aria-valuetext "42 % A, 58 % B".
// Public attributes and class names are unchanged from the foundation version (app/shell.js uses
// value, assign-a, assign-b, compact and state).
import { MdjElement, define, h, s } from './base.js';

const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const fmtAttr = (v) => String(Math.round(v * 1000) / 1000);
const setP = (el, p) => { el.style.setProperty('--p', String(p)); return el; };
const CURVES = { linear: 'Linear', 'equal-power': 'Equal power', cut: 'Cut' };
function curveGlyph(curve) {
  const svg = s('svg', { class: 'crossfader__glyph', viewBox: '0 0 24 14', width: 24, height: 14, 'aria-hidden': 'true', focusable: 'false' });
  const d = curve === 'cut' ? ['M1 1 H10 V13 H14 V1 H23', 'M1 13 H10', 'M14 13 H23']
    : curve === 'linear' ? ['M1 1 L23 13', 'M1 13 L23 1']
    : ['M1 1 C 9 1, 12 13, 23 13', 'M1 13 C 9 13, 12 1, 23 1'];
  for (const p of d) svg.appendChild(s('path', { d: p, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  return svg;
}

export class MdjCrossfader extends MdjElement {
  static tag = 'mdj-crossfader';
  static states = ['idle', 'held', 'disabled', 'pending'];
  static fr = ['FR-020'];
  static hit = 48;
  static observed = ['value', 'pending-value', 'assign-a', 'assign-b', 'curve', 'reverse', 'detents', 'bypass', 'compact'];
  static samples = {
    default: { value: 0.58, 'assign-a': 'A', 'assign-b': 'B', curve: 'equal-power', style: 'width:min(300px, 100%)' },
    variants: [
      { curve: 'equal-power', detents: true },
      { curve: 'cut', reverse: true, 'assign-a': 'C', 'assign-b': 'D', value: 0.12 },
      { compact: true, style: 'width:120px' },
    ],
    pending: { value: 0.3, 'pending-value': 0.46 },
  };

  constructor() { super(); this._drag = null; }

  model() {
    const value = clamp(this.num('value', 0.5));
    const pending = this.hasAttribute('pending-value') ? clamp(this.num('pending-value', value)) : null;
    const a = this.attr('assign-a', 'A').toUpperCase(), b = this.attr('assign-b', 'B').toUpperCase();
    const curveAttr = this.attr('curve', 'equal-power');
    const curve = CURVES[curveAttr] ? curveAttr : 'equal-power';
    const reverse = this.bool('reverse'), detents = this.bool('detents'), bypass = this.bool('bypass'), compact = this.bool('compact');
    const left = reverse ? b : a, right = reverse ? a : b;
    return { value, pending, a, b, left, right, curve, reverse, detents, bypass, compact, state: this.state };
  }

  render() {
    const m = this.model();
    const focusKey = this.contains(document.activeElement) ? '.crossfader__rail' : null;
    const shown = m.state === 'pending' && m.pending != null ? m.pending : m.value;
    const disabled = m.state === 'disabled';
    this.className = `crossfader ${m.compact ? 'crossfader--compact' : 'crossfader--full'} ${m.bypass ? 'crossfader--bypass' : ''} ${m.reverse ? 'crossfader--reverse' : ''} crossfader--${m.curve}`.replace(/\s+/g, ' ').trim();
    const pct = Math.round(shown * 100);
    const valuetext = `${100 - pct} % ${m.left}, ${pct} % ${m.right}${m.state === 'pending' ? ', sent, waiting for the engine' : ''}${disabled ? ', unavailable' : ''}`;
    const slider = h('div', {
      class: 'crossfader__rail', role: 'slider', tabindex: disabled ? -1 : 0,
      'aria-label': `Crossfader, ${m.left} to ${m.right}${m.reverse ? ', reversed' : ''}${m.bypass ? ', bypassed' : ''}, ${CURVES[m.curve].toLowerCase()} curve${m.detents ? ', detents' : ''}`,
      'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct, 'aria-valuetext': valuetext,
      'aria-disabled': disabled ? 'true' : undefined, dataset: { hit: '48' },
      on: {
        keydown: (e) => this.onKey(e, m, shown),
        pointerdown: (e) => this.onDown(e, m, shown),
        pointermove: (e) => this.onMove(e, m),
        pointerup: (e) => this.onUp(e, m),
        pointercancel: (e) => this.onCancel(e, m),
        lostpointercapture: (e) => this.onCancel(e, m),
      },
    });
    slider.appendChild(h('span', { class: 'crossfader__guide brass', 'aria-hidden': 'true' }));
    slider.appendChild(h('span', { class: `crossfader__fill-a deck-${m.left.toLowerCase()}`, style: { width: `${(1 - m.value) * 100}%` }, 'aria-hidden': 'true' }));
    slider.appendChild(h('span', { class: `crossfader__fill-b deck-${m.right.toLowerCase()}`, style: { width: `${m.value * 100}%` }, 'aria-hidden': 'true' }));
    if (m.detents) for (const p of [0, 1]) slider.appendChild(setP(h('span', { class: 'crossfader__detent brass', 'aria-hidden': 'true' }), p));
    slider.appendChild(h('span', { class: `crossfader__centre index-mark ${m.detents ? 'crossfader__centre--detent' : ''}`.trim(), 'aria-hidden': 'true' }));
    slider.appendChild(setP(h('span', { class: 'crossfader__ghost', hidden: m.state === 'pending' && m.pending != null ? null : true, 'aria-hidden': 'true' }), m.pending ?? m.value));
    slider.appendChild(setP(h('span', { class: 'crossfader__thumb brass-rim', 'aria-hidden': 'true' }, [
      h('span', { class: 'crossfader__face titanium' }, [h('span', { class: 'crossfader__grip' })]),
    ]), m.value));
    const badgeText = { held: 'HELD', pending: 'SENT' }[m.state] || '';
    slider.appendChild(h('span', { class: `crossfader__badge crossfader__badge--${m.state}`, hidden: badgeText ? null : true, text: badgeText, 'aria-hidden': 'true' }));

    const left = h('span', { class: `crossfader__end label label-strong deck-${m.left.toLowerCase()}`, text: m.left });
    const right = h('span', { class: `crossfader__end label label-strong deck-${m.right.toLowerCase()}`, text: m.right });
    const meta = m.compact ? null : h('span', { class: 'crossfader__meta label' }, [
      curveGlyph(m.curve),
      h('span', { text: CURVES[m.curve] }),
      m.reverse ? h('span', { class: 'crossfader__meta-flag', text: 'Reverse' }) : null,
      m.detents ? h('span', { class: 'crossfader__meta-flag', text: 'Detents' }) : null,
      m.bypass ? h('span', { class: 'crossfader__meta-flag crossfader__meta-flag--bypass', text: 'Bypass' }) : null,
    ]);
    this.replaceChildren(...[left, slider, right, meta].filter(Boolean));
    if (focusKey) this.querySelector(focusKey)?.focus({ preventScroll: true });
  }

  paint(m, v) {
    const thumb = this.querySelector('.crossfader__thumb'); if (thumb) thumb.style.setProperty('--p', String(v));
    const fa = this.querySelector('.crossfader__fill-a'); if (fa) fa.style.width = `${(1 - v) * 100}%`;
    const fb = this.querySelector('.crossfader__fill-b'); if (fb) fb.style.width = `${v * 100}%`;
    const pct = Math.round(v * 100);
    this.querySelector('.crossfader__rail')?.setAttribute('aria-valuetext', `${100 - pct} % ${m.left}, ${pct} % ${m.right}, held`);
  }
  setTransient(state, badge) {
    this.dataset.state = state;
    const b = this.querySelector('.crossfader__badge');
    if (b) { b.textContent = badge; b.hidden = !badge; b.className = `crossfader__badge crossfader__badge--${state}`; }
  }
  detail(m, value, phase, extra = {}) { return { kind: 'crossfader', value, left: m.left, right: m.right, phase, ...extra }; }
  travel(rail) { return Math.max(1, rail.getBoundingClientRect().width - 20); }

  onDown(e, m, shown) {
    if (m.state === 'disabled' || this._drag) return;
    const r = this.querySelector('.crossfader__thumb')?.getBoundingClientRect();
    if (!(r && e.clientX >= r.left - 12 && e.clientX <= r.right + 12)) return; // pickup on the thumb only
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    this._drag = { id: e.pointerId, x: e.clientX, start: shown, v: shown, moved: false };
    this.setTransient('held', 'HELD');
    this.emit('mdj:touch', this.detail(m, shown, 'start'));
  }
  onMove(e, m) {
    const d = this._drag; if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 2) d.moved = true;
    if (!d.moved) return;
    d.v = clamp(d.start + dx / this.travel(e.currentTarget));
    this.paint(m, d.v);
    this.emit('mdj:value', this.detail(m, d.v, 'move'));
  }
  onUp(e, m) {
    const d = this._drag; if (!d || e.pointerId !== d.id) return;
    this._drag = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    if (!d.moved) { this.syncState(); this.render(); return; }
    this.setAttribute('pending-value', fmtAttr(d.v));
    this.setAttribute('state', 'pending');
    this.emit('mdj:value', this.detail(m, d.v, 'end'));
  }
  onCancel(e, m) {
    const d = this._drag; if (!d) return;
    this._drag = null;
    this.syncState(); this.render();
    this.emit('mdj:value', this.detail(m, m.value, 'cancel'));
  }
  onKey(e, m, shown) {
    if (m.state === 'disabled') return;
    const delta = { ArrowRight: 0.02, ArrowUp: 0.02, ArrowLeft: -0.02, ArrowDown: -0.02, PageUp: 0.1, PageDown: -0.1 }[e.key];
    let v;
    if (delta != null) v = clamp(shown + delta);
    else if (e.key === 'Home') v = 0;
    else if (e.key === 'End') v = 1;
    else return;
    e.preventDefault();
    this.setAttribute('pending-value', fmtAttr(v));
    this.setAttribute('state', 'pending');
    this.emit('mdj:value', this.detail(m, v, 'end', { source: 'keyboard' }));
  }
}
define(MdjCrossfader);

// <mdj-dial kind="gain|eq-hi|eq-mid|eq-lo|filter|generic" deck="A" value="0" min="-12" max="12" unit="dB"
//           default="0" step="0.5" size="48|64|80" label="Gain" pending-value="3"
//           state="idle|touched|pending|disabled|reset">
//
// Engine binding: EngineCommand(set_parameter, { deck, parameter: kind, value }) carrying the deck
// generation and the mixer revision (master/generic dials carry the master-control revision).
// `value` is the ACKNOWLEDGED engine value: solid index line, solid value arc. `pending-value` is the
// last SENT value the engine has not acknowledged: hollow deck-coloured index, dashed arc, SENT badge.
// Visual rotation follows the acknowledged value; a sent value never pretends to be applied.
// Units / legal range (fixture proposals; real tapers are a DSP contract, Document 06):
//   gain −12..+12 dB (default 0) · eq-hi/mid/lo −12..+12 dB (default 0; the kill taper is DSP) ·
//   filter −100..+100 (0 = off, negative = low-pass, positive = high-pass; the unit slot reads LP/HP/OFF) ·
//   generic 0..100 % (default 0, unipolar). The unit is always visible next to the numeral.
// Gesture: relative vertical drag. The drag starts from the existing value — no jump on first contact;
// the full range spans about 200 px of travel. A tap without movement changes nothing.
// Pending vs acknowledged: while the finger is down the dial is `touched` (HELD badge) and draws the
// dragged value as a hollow index; on release it enters `pending` with pending-value and emits
// mdj:value { phase: 'end' }. The screen (standing in for the engine) acknowledges by setting `value`
// and clearing `state`. Nothing animates to imply success. `reset` shows the value back at `default`
// after an explicit Reset (RESET badge, index on the detent).
// Cancellation: pointer-cancel, pointer-capture loss, app background, route loss or rotation discard the
// dragged value, keep the acknowledged value and emit mdj:value { phase: 'cancel' }. Route loss sets
// `disabled` (aria-disabled, value kept, readout dimmed).
// Accessible alternative: role=slider named "<label>, deck <X>" with aria-valuetext "Filter, deck B, +2.0";
// Arrow keys ±step, PageUp/PageDown ±10 steps, Home/End = min/max, Delete/Backspace = reset to default.
// The readout + label is a real button that emits mdj:inspect so the screen opens <mdj-value-inspector>
// (enlarged numeral, fine −/+, numeric entry, Reset). Deck identity is the letter in the accessible name
// and the label, never the colour alone.
import { MdjElement, define, h, s } from './base.js';

const KINDS = {
  gain: { min: -12, max: 12, def: 0, unit: 'dB', label: 'Gain' },
  'eq-hi': { min: -12, max: 12, def: 0, unit: 'dB', label: 'EQ Hi' },
  'eq-mid': { min: -12, max: 12, def: 0, unit: 'dB', label: 'EQ Mid' },
  'eq-lo': { min: -12, max: 12, def: 0, unit: 'dB', label: 'EQ Lo' },
  filter: { min: -100, max: 100, def: 0, unit: '', label: 'Filter' },
  generic: { min: 0, max: 100, def: 0, unit: '%', label: 'Level' },
};
const SWEEP = 270, START = -135;
const C = 60; // viewBox centre (0 0 120 120)
let uid = 0;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
function polar(r, deg) { const rad = ((deg - 90) * Math.PI) / 180; return [C + r * Math.cos(rad), C + r * Math.sin(rad)]; }
function arc(r, a1, a2) {
  if (a2 < a1) [a1, a2] = [a2, a1];
  if (a2 - a1 < 0.01) return '';
  const [x1, y1] = polar(r, a1), [x2, y2] = polar(r, a2);
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}
function fmtAttr(v) { return String(Math.round(v * 1000) / 1000); }
// Display text: typographic minus for the readout, ASCII for aria-valuetext.
function display(v, unit, bipolar, ascii = false) {
  const a = Math.abs(v);
  const digits = unit === 'Hz' ? 0 : a >= 100 ? 0 : 1;
  const body = unit === 'Hz' && a >= 1000 ? `${(a / 1000).toFixed(1)}k` : a.toFixed(digits);
  const zero = Number(body) === 0;
  const sign = zero ? '' : v < 0 ? (ascii ? '-' : '−') : bipolar ? '+' : '';
  return sign + body;
}

export class MdjDial extends MdjElement {
  static tag = 'mdj-dial';
  static states = ['idle', 'touched', 'pending', 'disabled', 'reset'];
  static fr = ['FR-020'];
  static hit = 48;
  static observed = ['kind', 'deck', 'value', 'min', 'max', 'unit', 'default', 'step', 'size', 'label', 'pending-value'];
  static samples = {
    default: { kind: 'gain', deck: 'A', value: 0, size: 48 },
    variants: [
      { kind: 'gain', deck: 'A', value: 1.5, size: 48 },
      { kind: 'eq-hi', deck: 'B', value: -3, size: 64 },
      { kind: 'filter', deck: 'B', value: 24, size: 80 },
    ],
    pending: { 'pending-value': 6 },
    reset: { value: 0 },
  };

  constructor() { super(); this._uid = ++uid; this._drag = null; }

  model() {
    const kind = KINDS[this.attr('kind', 'generic')] ? this.attr('kind', 'generic') : 'generic';
    const def = KINDS[kind];
    const deck = this.attr('deck', '').toUpperCase();
    const min = this.num('min', def.min), max = Math.max(this.num('max', def.max), this.num('min', def.min) + 0.001);
    const unitAttr = this.hasAttribute('unit') ? this.attr('unit') : def.unit;
    const dflt = clamp(this.hasAttribute('default') ? this.num('default', def.def) : def.def, min, max);
    const value = clamp(this.num('value', dflt), min, max);
    const pending = this.hasAttribute('pending-value') ? clamp(this.num('pending-value', value), min, max) : null;
    const state = this.state;
    const bipolar = dflt > min && dflt < max;
    const step = this.num('step', unitAttr === 'dB' ? 0.5 : (max - min) / 100);
    const size = clamp(this.num('size', 48), 40, 160);
    const label = this.attr('label', def.label);
    return { kind, deck, min, max, unitAttr, dflt, value, pending, state, bipolar, step, size, label };
  }
  unitText(m, v) {
    if (m.kind === 'filter' && !this.hasAttribute('unit')) return v < -0.5 ? 'LP' : v > 0.5 ? 'HP' : 'OFF';
    return m.unitAttr;
  }
  angle(m, v) { return START + (SWEEP * (v - m.min)) / (m.max - m.min); }

  render() {
    const m = this.model();
    const focusKey = this.contains(document.activeElement) ? (document.activeElement.classList.contains('dial__inspect') ? '.dial__inspect' : '.dial__slider') : null;
    const shown = m.state === 'pending' && m.pending != null ? m.pending : m.value;
    this.className = `dial dial--${m.kind} ${m.deck ? `deck-${m.deck.toLowerCase()}` : 'deck-none'}`;
    this.style.setProperty('--size', `${m.size}px`);
    const where = m.deck ? `deck ${m.deck}` : 'master';
    const name = `${m.label}, ${where}`;
    const unitSpoken = this.unitText(m, shown);
    const valuetext = `${m.label}, ${where}, ${display(shown, m.unitAttr, m.bipolar, true)}${unitSpoken ? ' ' + unitSpoken : ''}${m.state === 'pending' ? ', sent, waiting for the engine' : ''}${m.state === 'disabled' ? ', unavailable' : ''}`;
    const disabled = m.state === 'disabled';

    const slider = h('div', {
      class: 'dial__slider', role: 'slider', tabindex: disabled ? -1 : 0, 'aria-label': name,
      'aria-valuemin': m.min, 'aria-valuemax': m.max, 'aria-valuenow': Math.round(shown * 100) / 100, 'aria-valuetext': valuetext,
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
    slider.appendChild(this.buildSvg(m, shown));
    slider.appendChild(h('span', { class: 'dial__face titanium-radial', 'aria-hidden': 'true' }));
    const badgeText = { touched: 'HELD', pending: 'SENT', reset: 'RESET' }[m.state] || '';
    slider.appendChild(h('span', { class: `dial__badge dial__badge--${m.state}`, hidden: badgeText ? null : true, text: badgeText, 'aria-hidden': 'true' }));

    const unit = this.unitText(m, shown);
    const inspect = h('button', {
      type: 'button', class: 'dial__inspect', dataset: { hit: '48' }, disabled: disabled ? true : null,
      'aria-label': `Inspect ${m.label}, ${where}: fine adjust, numeric entry and reset`,
      on: { click: () => this.emit('mdj:inspect', this.inspectDetail(m, shown)) },
    }, [
      h('span', { class: 'dial__readout ink-backing' }, [
        h('span', { class: 'dial__value numeral', text: disabled ? '—' : display(shown, m.unitAttr, m.bipolar) }),
        unit ? h('span', { class: 'dial__unit label', text: unit }) : null,
      ]),
      h('span', { class: 'dial__label label', text: m.label }),
    ]);
    this.replaceChildren(slider, inspect);
    if (focusKey) this.querySelector(focusKey)?.focus({ preventScroll: true });
  }

  buildSvg(m, shown) {
    const id = `dial-brass-${this._uid}`;
    const svg = s('svg', { class: 'dial__svg', viewBox: '0 0 120 120', 'aria-hidden': 'true', focusable: 'false' });
    const defs = s('defs');
    const grad = s('linearGradient', { id, x1: '0', y1: '0', x2: '1', y2: '1' });
    for (const [o, c] of [['0', 'var(--brass-hi)'], ['0.55', 'var(--brass)'], ['1', 'var(--brass-lo)']]) grad.appendChild(s('stop', { offset: o, style: { stopColor: c } }));
    defs.appendChild(grad);
    svg.appendChild(defs);
    // Scale ticks around 270°: five majors, minors from size 64 up.
    const ticks = s('g', { class: 'dial__ticks' });
    const n = m.size >= 64 ? 20 : 8;
    for (let i = 0; i <= n; i++) {
      const a = START + (SWEEP * i) / n;
      const major = m.size >= 64 ? i % 5 === 0 : i % 2 === 0;
      const [x1, y1] = polar(major ? 50.5 : 53, a), [x2, y2] = polar(56.5, a);
      ticks.appendChild(s('line', { x1: x1.toFixed(2), y1: y1.toFixed(2), x2: x2.toFixed(2), y2: y2.toFixed(2), class: major ? 'dial__tick dial__tick--major' : 'dial__tick' }));
    }
    svg.appendChild(ticks);
    if (m.bipolar) {
      const a = this.angle(m, m.dflt);
      const [x1, y1] = polar(49, a), [x2, y2] = polar(59, a);
      svg.appendChild(s('line', { class: 'dial__detent', x1: x1.toFixed(2), y1: y1.toFixed(2), x2: x2.toFixed(2), y2: y2.toFixed(2) }));
    }
    // Arc: track, acknowledged value, dashed pending extension.
    svg.appendChild(s('path', { class: 'dial__track', d: arc(45, START, START + SWEEP) }));
    const from = this.angle(m, m.bipolar ? m.dflt : m.min);
    const ackAngle = this.angle(m, m.value);
    svg.appendChild(s('path', { class: 'dial__arc', d: arc(45, from, ackAngle) }));
    const ghost = s('path', { class: 'dial__arc dial__arc--ghost', d: m.state === 'pending' && m.pending != null ? arc(45, ackAngle, this.angle(m, m.pending)) : '' });
    svg.appendChild(ghost);
    // Brass chamfer ring, then the index line (the titanium face is a CSS element beneath the SVG).
    svg.appendChild(s('circle', { class: 'dial__rim', cx: C, cy: C, r: 40, fill: 'none', stroke: `url(#${id})` }));
    svg.appendChild(s('circle', { class: 'dial__edge', cx: C, cy: C, r: 37, fill: 'none' }));
    const idx = s('line', { class: 'dial__index', x1: C, y1: C - 33, x2: C, y2: C - 17, transform: `rotate(${ackAngle.toFixed(2)} ${C} ${C})` });
    svg.appendChild(idx);
    const gIdx = s('line', { class: 'dial__index dial__index--ghost', x1: C, y1: C - 33, x2: C, y2: C - 17, transform: `rotate(${this.angle(m, shown).toFixed(2)} ${C} ${C})`, visibility: m.state === 'pending' && m.pending != null ? 'visible' : 'hidden' });
    svg.appendChild(gIdx);
    return svg;
  }

  // In-place update during a drag (no re-render: the captured slider must survive).
  paintGhost(m, v) {
    const ghostIdx = this.querySelector('.dial__index--ghost');
    const ghostArc = this.querySelector('.dial__arc--ghost');
    if (ghostIdx) { ghostIdx.setAttribute('transform', `rotate(${this.angle(m, v).toFixed(2)} ${C} ${C})`); ghostIdx.setAttribute('visibility', 'visible'); }
    if (ghostArc) ghostArc.setAttribute('d', arc(45, this.angle(m, m.value), this.angle(m, v)));
    const val = this.querySelector('.dial__value'); if (val) val.textContent = display(v, m.unitAttr, m.bipolar);
    const unit = this.querySelector('.dial__unit'); if (unit) unit.textContent = this.unitText(m, v);
    this.querySelector('.dial__slider')?.setAttribute('aria-valuetext', `${m.label}, ${m.deck ? `deck ${m.deck}` : 'master'}, ${display(v, m.unitAttr, m.bipolar, true)} ${this.unitText(m, v)}, held`);
  }
  setTransient(state, badge) {
    this.dataset.state = state;
    const b = this.querySelector('.dial__badge');
    if (b) { b.textContent = badge; b.hidden = !badge; b.className = `dial__badge dial__badge--${state}`; }
  }
  detail(m, value, phase, extra = {}) { return { deck: m.deck, kind: m.kind, label: m.label, value, unit: m.unitAttr, phase, ...extra }; }
  inspectDetail(m, value) { return { deck: m.deck, kind: m.kind, label: m.label, value, unit: m.unitAttr, min: m.min, max: m.max, step: m.step, default: m.dflt }; }

  onDown(e, m, shown) {
    if (m.state === 'disabled' || this._drag) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    this._drag = { id: e.pointerId, y: e.clientY, start: shown, v: shown, moved: false };
    this.setTransient('touched', 'HELD');
    this.emit('mdj:touch', this.detail(m, shown, 'start'));
  }
  onMove(e, m) {
    const d = this._drag; if (!d || e.pointerId !== d.id) return;
    const dy = e.clientY - d.y;
    if (Math.abs(dy) > 2) d.moved = true;
    if (!d.moved) return;
    d.v = clamp(d.start - (dy / 200) * (m.max - m.min), m.min, m.max);
    this.paintGhost(m, d.v);
    this.emit('mdj:value', this.detail(m, d.v, 'move'));
  }
  onUp(e, m) {
    const d = this._drag; if (!d || e.pointerId !== d.id) return;
    this._drag = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    if (!d.moved) { this.syncState(); this.render(); return; } // a tap changes nothing
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
    const delta = { ArrowUp: m.step, ArrowRight: m.step, ArrowDown: -m.step, ArrowLeft: -m.step, PageUp: m.step * 10, PageDown: -m.step * 10 }[e.key];
    let v;
    if (delta != null) v = clamp(shown + delta, m.min, m.max);
    else if (e.key === 'Home') v = m.min;
    else if (e.key === 'End') v = m.max;
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); this.emit('mdj:reset', this.detail(m, m.dflt, 'end', { source: 'keyboard' })); v = m.dflt; }
    else return;
    e.preventDefault();
    this.setAttribute('pending-value', fmtAttr(v));
    this.setAttribute('state', 'pending');
    this.emit('mdj:value', this.detail(m, v, 'end', { source: 'keyboard' }));
  }
}
define(MdjDial);

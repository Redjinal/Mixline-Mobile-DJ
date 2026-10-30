// <mdj-pitch-rail deck="A" value="1.2" pending-value range="8|16|50" keylock height="160|200|240"
//                 bend="+|-" state="idle|held|pending|disabled|bent">
//
// Engine binding: EngineCommand(set_tempo, { deck, percent }) carrying the deck generation; key lock is
// EngineCommand(set_keylock, { deck, on }); pitch bend is EngineCommand(bend, { deck, direction }),
// momentary while held. `value` is the ACKNOWLEDGED tempo offset; `pending-value` is the last SENT,
// unacknowledged offset (dashed ghost thumb, SENT badge).
// Units / legal range: percent of original tempo, −range..+range in 0.1 % steps (fixture resolution);
// ranges ±8 / ±16 / ±50 % (FR-015). The range label is always printed. The signed numeral readout is
// always visible ("+1.2 %"); 0 reads "0.0 %" with the thumb grip on the detent.
// Geometry: CDJ convention — minus at the top, plus at the bottom; a centre detent at 0 % (brass notch
// pair and an ink line across the rail). The detent is a mark and a haptic tick only; it never resists a
// deliberate move.
// Gesture: pickup on the thumb, relative drag; a pointer-down away from the thumb does nothing. Bend is
// momentary: `bent` with bend="+"/"-" shows the direction (chevron + BEND text) while the bend is held;
// the thumb does not move and release returns to the fader tempo.
// Pending vs acknowledged: held → HELD badge and the thumb follows the finger; release → `pending` with
// pending-value and mdj:value { phase: 'end' } until the screen (standing in for the engine) acknowledges
// by setting `value` and clearing `state`. Key lock shows its acknowledged `keylock` attribute only; the
// toggle emits mdj:keylock and does not flip itself. Nothing animates to imply success.
// Cancellation: pointer-cancel, capture loss, app background or rotation drop the dragged tempo, release a
// held bend, keep the acknowledged value and emit mdj:value { phase: 'cancel' }. Route loss → `disabled`.
// Accessible alternative: role=slider "Tempo, deck A, range ±8 %" with aria-valuetext "+1.2 %, key lock on";
// Arrow keys ±0.1 %, PageUp/PageDown ±1 %, Home/End = −range/+range, Delete/Backspace = reset to 0 %.
// Key lock is a real toggle button (aria-pressed, icon + text). The readout + range is a real button
// emitting mdj:inspect (numeric entry, fine ±, Reset, range choice in the inspector sheet).
import { MdjElement, define, h, icon } from './base.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const fmtAttr = (v) => String(Math.round(v * 100) / 100);
const setP = (el, p) => { el.style.setProperty('--p', String(p)); return el; };
function pctText(v, ascii = false) {
  const a = Math.abs(v).toFixed(1);
  const sign = Number(a) === 0 ? '' : v < 0 ? (ascii ? '-' : '−') : '+';
  return `${sign}${a} %`;
}

export class MdjPitchRail extends MdjElement {
  static tag = 'mdj-pitch-rail';
  static states = ['idle', 'held', 'pending', 'disabled', 'bent'];
  static fr = ['FR-015'];
  static hit = 48;
  static observed = ['deck', 'value', 'pending-value', 'range', 'keylock', 'height', 'bend'];
  static samples = {
    default: { deck: 'A', value: 1.2, range: 8, keylock: true, height: 160 },
    variants: [{}, { deck: 'B', value: -3.4, range: 16, keylock: false, height: 200 }],
    pending: { 'pending-value': 2.0 },
    bent: { bend: '+' },
  };

  constructor() { super(); this._drag = null; }

  model() {
    const deck = this.attr('deck', 'A').toUpperCase();
    const rangeAttr = this.num('range', 8);
    const range = [8, 16, 50].includes(rangeAttr) ? rangeAttr : clamp(rangeAttr, 1, 100);
    const value = clamp(this.num('value', 0), -range, range);
    const pending = this.hasAttribute('pending-value') ? clamp(this.num('pending-value', value), -range, range) : null;
    const keylock = this.bool('keylock');
    const height = clamp(this.num('height', 160), 120, 320);
    const bend = this.attr('bend', '+') === '-' ? '-' : '+';
    return { deck, range, value, pending, keylock, height, bend, state: this.state };
  }
  pos(m, v) { return (v + m.range) / (2 * m.range); } // 0 = top (minus), 1 = bottom (plus)

  render() {
    const m = this.model();
    const active = document.activeElement;
    const focusKey = this.contains(active) ? (active.classList.contains('pitch__inspect') ? '.pitch__inspect' : active.classList.contains('pitch__keylock') ? '.pitch__keylock' : '.pitch__slider') : null;
    const shown = m.state === 'pending' && m.pending != null ? m.pending : m.value;
    const disabled = m.state === 'disabled';
    this.className = `pitch deck-${m.deck.toLowerCase()} ${m.state === 'bent' ? `pitch--bend-${m.bend === '-' ? 'minus' : 'plus'}` : ''}`.trim();
    this.style.setProperty('--h', `${m.height}px`);
    const name = `Tempo, deck ${m.deck}, range plus or minus ${m.range} %`;
    const valuetext = `${pctText(shown, true)}, key lock ${m.keylock ? 'on' : 'off'}${m.state === 'bent' ? `, bending ${m.bend === '-' ? 'down' : 'up'}` : ''}${m.state === 'pending' ? ', sent, waiting for the engine' : ''}${disabled ? ', unavailable' : ''}`;

    const head = h('div', { class: 'pitch__head' }, [
      h('span', { class: 'pitch__title label label-strong', text: 'Tempo' }),
      h('span', { class: 'pitch__range numeral', text: `±${m.range} %` }),
    ]);

    const scale = h('div', { class: 'pitch__scale', 'aria-hidden': 'true' });
    const marks = [[-1, `−${m.range}`], [-0.5, `−${m.range / 2}`], [0, '0'], [0.5, `+${m.range / 2}`], [1, `+${m.range}`]];
    for (const [f, t] of marks) scale.appendChild(setP(h('span', { class: `pitch__mark numeral ${f === 0 ? 'pitch__mark--zero' : ''}`.trim(), text: t }), (f + 1) / 2));

    const slider = h('div', {
      class: 'pitch__slider sunken', role: 'slider', tabindex: disabled ? -1 : 0, 'aria-label': name,
      'aria-valuemin': -m.range, 'aria-valuemax': m.range, 'aria-valuenow': Math.round(shown * 10) / 10, 'aria-valuetext': valuetext,
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
    slider.appendChild(h('span', { class: 'pitch__guide brass', 'aria-hidden': 'true' }));
    for (const [f] of marks) slider.appendChild(setP(h('span', { class: `pitch__tick index-mark ${f === 0 ? 'pitch__tick--zero' : ''}`.trim(), 'aria-hidden': 'true' }), (f + 1) / 2));
    slider.appendChild(h('span', { class: 'pitch__detent pitch__detent--l brass', 'aria-hidden': 'true' }));
    slider.appendChild(h('span', { class: 'pitch__detent pitch__detent--r brass', 'aria-hidden': 'true' }));
    slider.appendChild(h('span', { class: 'pitch__bend pitch__bend--minus', 'aria-hidden': 'true' }, [icon('chevron-up', { size: 14 })]));
    slider.appendChild(h('span', { class: 'pitch__bend pitch__bend--plus', 'aria-hidden': 'true' }, [icon('chevron-down', { size: 14 })]));
    slider.appendChild(setP(h('span', { class: 'pitch__ghost', hidden: m.state === 'pending' && m.pending != null ? null : true, 'aria-hidden': 'true' }), this.pos(m, m.pending ?? m.value)));
    slider.appendChild(setP(h('span', { class: `pitch__thumb brass-rim ${Math.abs(m.value) < 0.05 ? 'pitch__thumb--detent' : ''}`.trim(), 'aria-hidden': 'true' }, [
      h('span', { class: 'pitch__thumb-face titanium' }, [h('span', { class: 'pitch__grip index-mark' })]),
    ]), this.pos(m, m.value)));
    const badgeText = { held: 'HELD', pending: 'SENT', bent: `BEND ${m.bend === '-' ? '−' : '+'}` }[m.state] || '';
    slider.appendChild(h('span', { class: `pitch__badge pitch__badge--${m.state}`, hidden: badgeText ? null : true, text: badgeText, 'aria-hidden': 'true' }));

    const inspect = h('button', {
      type: 'button', class: 'pitch__inspect', dataset: { hit: '48' }, disabled: disabled ? true : null,
      'aria-label': `Inspect tempo, deck ${m.deck}: numeric entry, fine adjust, reset and range`,
      on: { click: () => this.emit('mdj:inspect', { deck: m.deck, kind: 'tempo', label: 'Tempo', value: shown, unit: '%', min: -m.range, max: m.range, step: 0.1, default: 0 }) },
    }, [
      h('span', { class: 'pitch__readout ink-backing' }, [
        h('span', { class: 'pitch__value numeral', text: disabled ? '—' : pctText(shown) }),
        m.state === 'bent' ? h('span', { class: 'pitch__flag label', text: `BEND ${m.bend === '-' ? '−' : '+'}` }) : null,
      ]),
      h('span', { class: 'pitch__label label', text: `Pitch · ${m.deck}` }),
    ]);
    const keylock = h('button', {
      type: 'button', class: `pitch__keylock ${m.keylock ? 'pitch__keylock--on' : ''}`.trim(), dataset: { hit: '48' }, 'aria-pressed': String(m.keylock),
      'aria-label': `Key lock, deck ${m.deck}`, disabled: disabled ? true : null,
      on: { click: () => this.emit('mdj:keylock', { deck: m.deck, on: !m.keylock }) },
    }, [
      icon(m.keylock ? 'keylock' : 'unlock', { size: 18 }),
      h('span', { class: 'pitch__keylock-text label', text: m.keylock ? 'Key lock on' : 'Key lock off' }),
    ]);
    this.replaceChildren(head, h('div', { class: 'pitch__body' }, [scale, slider]), inspect, keylock);
    if (focusKey) this.querySelector(focusKey)?.focus({ preventScroll: true });
  }

  paint(m, v) {
    const thumb = this.querySelector('.pitch__thumb');
    if (thumb) { thumb.style.setProperty('--p', String(this.pos(m, v))); thumb.classList.toggle('pitch__thumb--detent', Math.abs(v) < 0.05); }
    const val = this.querySelector('.pitch__value'); if (val) val.textContent = pctText(v);
    this.querySelector('.pitch__slider')?.setAttribute('aria-valuetext', `${pctText(v, true)}, held`);
  }
  setTransient(state, badge) {
    this.dataset.state = state;
    const b = this.querySelector('.pitch__badge');
    if (b) { b.textContent = badge; b.hidden = !badge; b.className = `pitch__badge pitch__badge--${state}`; }
  }
  detail(m, value, phase, extra = {}) { return { deck: m.deck, kind: 'tempo', label: 'Tempo', value, unit: '%', range: m.range, phase, ...extra }; }
  travel() { return Math.max(1, this.model().height - 32); }

  onDown(e, m, shown) {
    if (m.state === 'disabled' || this._drag) return;
    const r = this.querySelector('.pitch__thumb')?.getBoundingClientRect();
    if (!(r && e.clientY >= r.top - 12 && e.clientY <= r.bottom + 12)) return; // pickup on the thumb only
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    this._drag = { id: e.pointerId, y: e.clientY, start: shown, v: shown, moved: false };
    this.setTransient('held', 'HELD');
    this.emit('mdj:touch', this.detail(m, shown, 'start'));
  }
  onMove(e, m) {
    const d = this._drag; if (!d || e.pointerId !== d.id) return;
    const dy = e.clientY - d.y;
    if (Math.abs(dy) > 2) d.moved = true;
    if (!d.moved) return;
    d.v = clamp(d.start + (dy / this.travel()) * 2 * m.range, -m.range, m.range); // plus is at the bottom
    d.v = Math.round(d.v * 10) / 10;
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
    const delta = { ArrowUp: -0.1, ArrowLeft: -0.1, ArrowDown: 0.1, ArrowRight: 0.1, PageUp: -1, PageDown: 1 }[e.key];
    let v;
    if (delta != null) v = clamp(Math.round((shown + delta) * 10) / 10, -m.range, m.range);
    else if (e.key === 'Home') v = -m.range;
    else if (e.key === 'End') v = m.range;
    else if (e.key === 'Delete' || e.key === 'Backspace') { v = 0; this.emit('mdj:reset', this.detail(m, 0, 'end', { source: 'keyboard' })); }
    else return;
    e.preventDefault();
    this.setAttribute('pending-value', fmtAttr(v));
    this.setAttribute('state', 'pending');
    this.emit('mdj:value', this.detail(m, v, 'end', { source: 'keyboard' }));
  }
}
define(MdjPitchRail);

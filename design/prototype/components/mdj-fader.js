// <mdj-fader deck="A" value="0.75" pending-value="0.6" label="CH A" height="160|200" scale="on|off"
//            jump-to-touch state="idle|held|pending|disabled|muted">
//
// Engine binding: EngineCommand(set_parameter, { deck, parameter: 'channel_fader', value }) carrying
// the mixer revision and the deck generation. `value` is the ACKNOWLEDGED thumb position (0 = closed,
// 1 = fully open); `pending-value` is the last SENT, unacknowledged position (dashed ghost thumb, SENT).
// Units: position 0..1 of fader travel. The dB readout uses a FIXTURE fader law
// (1 → 0 dB, 0.75 → −6, 0.5 → −12, 0.25 → −30, 0 → −∞); the real law is a DSP contract (Document 06).
// Scale marks 0 / −6 / −12 / −∞ are printed beside the rail on opaque backing.
// Gesture: PICKUP ON THE THUMB. A drag that starts on the thumb (or within 12 px of it) moves it
// relatively from the current value. A pointer-down anywhere else on the rail does nothing, so an
// incidental tap can never make a far-away jump. `jump-to-touch` is an advanced preference, off by
// default. Detents are not modelled; a deliberate fast cut is never resisted.
// Pending vs acknowledged: while held the thumb follows the finger (HELD badge); release enters
// `pending` with pending-value and emits mdj:value { phase: 'end' }. The screen (standing in for the
// engine) acknowledges by setting `value` and clearing `state`. `muted` keeps the thumb where it is and
// prints MUTED in the readout; the mute itself is a separate command. Nothing animates to imply success.
// Cancellation: pointer-cancel, capture loss, app background or rotation drop the dragged position,
// keep the acknowledged thumb and emit mdj:value { phase: 'cancel' }. Route loss → `disabled`.
// Accessible alternative: role=slider "Channel fader, deck A" with aria-valuetext "-6.0 dB, 75 %";
// Arrow keys ±0.02, PageUp/PageDown ±0.1, Home/End = closed/open (set actions). The readout + label is
// a real button emitting mdj:inspect so the screen opens <mdj-value-inspector> (−/+ increments, numeric
// entry in %, Reset to 0 dB). Deck identity is the letter in the name and label, never colour alone.
import { MdjElement, define, h } from './base.js';

const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const MARKS = [[1, '0'], [0.75, '−6'], [0.5, '−12'], [0, '−∞']];
export function faderDb(v) {
  if (v <= 0.001) return -Infinity;
  if (v >= 0.5) return -24 * (1 - v);
  return -12 - (0.5 - v) * 72;
}
function dbText(v, ascii = false) {
  const db = faderDb(v);
  if (db === -Infinity) return ascii ? '-inf dB' : '−∞ dB';
  const a = Math.abs(db).toFixed(1);
  return (Number(a) === 0 ? '' : ascii ? '-' : '−') + a + ' dB';
}
const fmtAttr = (v) => String(Math.round(v * 1000) / 1000);
const setP = (el, p) => { el.style.setProperty('--p', String(p)); return el; };

export class MdjFader extends MdjElement {
  static tag = 'mdj-fader';
  static states = ['idle', 'held', 'pending', 'disabled', 'muted'];
  static fr = ['FR-020'];
  static hit = 48;
  static observed = ['deck', 'value', 'pending-value', 'label', 'height', 'scale', 'jump-to-touch'];
  static samples = {
    default: { deck: 'A', value: 0.75, label: 'CH A', height: 160 },
    variants: [{ height: 160 }, { deck: 'B', label: 'CH B', value: 1, height: 200 }],
    pending: { 'pending-value': 0.55 },
    muted: { value: 0.75 },
  };

  constructor() { super(); this._drag = null; }

  model() {
    const deck = this.attr('deck', 'A').toUpperCase();
    const value = clamp(this.num('value', 0.75));
    const pending = this.hasAttribute('pending-value') ? clamp(this.num('pending-value', value)) : null;
    const height = clamp(this.num('height', 160), 96, 320);
    const label = this.attr('label', `CH ${deck}`);
    const scale = this.attr('scale', 'on') !== 'off';
    const jump = this.bool('jump-to-touch');
    return { deck, value, pending, height, label, scale, jump, state: this.state };
  }

  render() {
    const m = this.model();
    const focusKey = this.contains(document.activeElement) ? (document.activeElement.classList.contains('fader__inspect') ? '.fader__inspect' : '.fader__slider') : null;
    const shown = m.state === 'pending' && m.pending != null ? m.pending : m.value;
    const disabled = m.state === 'disabled';
    this.className = `fader deck-${m.deck.toLowerCase()} ${m.scale ? '' : 'fader--noscale'}`.trim();
    this.style.setProperty('--h', `${m.height}px`);
    const name = `Channel fader, deck ${m.deck}`;
    const valuetext = `${dbText(shown, true)}, ${Math.round(shown * 100)} %${m.state === 'muted' ? ', muted' : ''}${m.state === 'pending' ? ', sent, waiting for the engine' : ''}${disabled ? ', unavailable' : ''}`;

    const scale = h('div', { class: 'fader__scale', 'aria-hidden': 'true' });
    for (const [p, t] of MARKS) scale.appendChild(setP(h('span', { class: 'fader__mark numeral', text: t }), p));

    const slider = h('div', {
      class: 'fader__slider sunken', role: 'slider', tabindex: disabled ? -1 : 0, 'aria-label': name,
      'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(shown * 100), 'aria-valuetext': valuetext,
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
    slider.appendChild(h('span', { class: 'fader__guide brass', 'aria-hidden': 'true' }));
    for (const [p] of MARKS) slider.appendChild(setP(h('span', { class: 'fader__tick index-mark', 'aria-hidden': 'true' }), p));
    slider.appendChild(setP(h('span', { class: 'fader__ghost', hidden: m.state === 'pending' && m.pending != null ? null : true, 'aria-hidden': 'true' }), m.pending ?? m.value));
    slider.appendChild(setP(h('span', { class: 'fader__thumb brass-rim', 'aria-hidden': 'true' }, [
      h('span', { class: 'fader__thumb-face titanium' }, [h('span', { class: 'fader__grip index-mark' })]),
    ]), m.value));
    const badgeText = { held: 'HELD', pending: 'SENT' }[m.state] || '';
    slider.appendChild(h('span', { class: `fader__badge fader__badge--${m.state}`, hidden: badgeText ? null : true, text: badgeText, 'aria-hidden': 'true' }));

    const inspect = h('button', {
      type: 'button', class: 'fader__inspect', dataset: { hit: '48' }, disabled: disabled ? true : null,
      'aria-label': `Inspect channel fader, deck ${m.deck}: set, increment and reset`,
      on: { click: () => this.emit('mdj:inspect', { deck: m.deck, kind: 'channel_fader', label: m.label, value: Math.round(shown * 100), unit: '%', min: 0, max: 100, step: 1, default: 100 }) },
    }, [
      h('span', { class: 'fader__readout ink-backing' }, [
        h('span', { class: 'fader__value numeral', text: disabled ? '—' : dbText(shown) }),
        m.state === 'muted' ? h('span', { class: 'fader__flag tone-neutral label', text: 'MUTED' }) : null,
      ]),
      h('span', { class: 'fader__label label', text: m.label }),
    ]);
    this.replaceChildren(h('div', { class: 'fader__body' }, [scale, slider]), inspect);
    if (focusKey) this.querySelector(focusKey)?.focus({ preventScroll: true });
  }

  paint(m, v) {
    const thumb = this.querySelector('.fader__thumb'); if (thumb) thumb.style.setProperty('--p', String(v));
    const val = this.querySelector('.fader__value'); if (val) val.textContent = dbText(v);
    this.querySelector('.fader__slider')?.setAttribute('aria-valuetext', `${dbText(v, true)}, ${Math.round(v * 100)} %, held`);
  }
  setTransient(state, badge) {
    this.dataset.state = state;
    const b = this.querySelector('.fader__badge');
    if (b) { b.textContent = badge; b.hidden = !badge; b.className = `fader__badge fader__badge--${state}`; }
  }
  detail(m, value, phase, extra = {}) { return { deck: m.deck, kind: 'channel_fader', label: m.label, value, phase, ...extra }; }
  travel() { return Math.max(1, this.model().height - 32); }

  onDown(e, m, shown) {
    if (m.state === 'disabled' || this._drag) return;
    const thumb = this.querySelector('.fader__thumb');
    const r = thumb?.getBoundingClientRect();
    const onThumb = r && e.clientY >= r.top - 12 && e.clientY <= r.bottom + 12;
    if (!onThumb && !m.jump) return; // pickup on the thumb only: an incidental tap does nothing
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    let start = shown;
    if (!onThumb && m.jump) { const rr = e.currentTarget.getBoundingClientRect(); start = clamp(1 - (e.clientY - rr.top - 16) / this.travel()); this.paint(m, start); }
    this._drag = { id: e.pointerId, y: e.clientY, start, v: start, moved: !onThumb };
    this.setTransient('held', 'HELD');
    this.emit('mdj:touch', this.detail(m, start, 'start'));
  }
  onMove(e, m) {
    const d = this._drag; if (!d || e.pointerId !== d.id) return;
    const dy = e.clientY - d.y;
    if (Math.abs(dy) > 2) d.moved = true;
    if (!d.moved) return;
    d.v = clamp(d.start - dy / this.travel());
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
    const delta = { ArrowUp: 0.02, ArrowRight: 0.02, ArrowDown: -0.02, ArrowLeft: -0.02, PageUp: 0.1, PageDown: -0.1 }[e.key];
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
define(MdjFader);

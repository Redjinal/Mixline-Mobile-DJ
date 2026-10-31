// <mdj-mic-strip input="headset" gain="0" pending-gain level="0.56" mute monitor talkover duck assign="master,recording"
//                route="usbc-stereo" state="off|armed|live|denied|feedback-risk|route-change">
//
// The microphone channel strip (Document 15 §4, FR-030): selected input / channel, a gain rail, a FIXTURE meter
// (the shared <mdj-meter>, which prints its own mark), Mute (56 dp, the frequent action), Monitor, Talkover
// (momentary) and Duck (toggle with its declared threshold / envelope), and the assignment chips Master /
// Broadcast / Recording. Feedback risk is explained AT ROUTING TIME (when monitoring meets a speaker route),
// a denied permission is explained with the action that fixes it, and a device change applies the route-loss
// rules before monitoring is re-enabled.
// Engine binding: EngineCommand(mic.gain | mic.mute | mic.monitor | mic.talkover | mic.duck | mic.assign, { input,
// routeEpoch }). `gain` is the ACKNOWLEDGED value; `pending-gain` is the last SENT value (dashed ghost index,
// SENT stamp). Mute / Monitor / Duck print acknowledged pressed state (aria-pressed); Talkover is momentary:
// pressed while the finger is down, released on pointer-up / pointer-cancel. Microphone permission is separate
// in meaning from sending the mic to master, broadcast or ParDay; nothing here routes the mic to ParDay.
// Units / range: gain −20..+20 dB (0 dB index mark, step 0.5); level 0..1 full scale (fixture) printed by the
// meter in dBFS; duck threshold −24 dBFS, attack 40 ms, release 600 ms, depth −9 dB (fixture envelope).
// Gesture: taps; the gain rail is a horizontal 48 dp slider with pickup on the thumb (no jump from an
// incidental tap). Pending vs acknowledged: see above; nothing animates to imply success.
// Cancellation: pointer-cancel on the rail keeps the acknowledged gain; a held Talkover releases safely on
// pointer-cancel, background or rotation; route loss sets `route-change` (monitoring off until verified).
// Accessible: group "Microphone, USB-C headset mic"; rail role=slider "Mic gain" with aria-valuetext "+3.0 dB";
// buttons aria-pressed and named with the input ("Mute microphone, USB-C headset mic"); notices are role=alert.
import { MdjElement, define, h, icon } from './base.js';
import { fixtures, load } from '../app/fixtures.js';

const STATES = ['off', 'armed', 'live', 'denied', 'feedback-risk', 'route-change'];
const ASSIGN = { master: 'Master', broadcast: 'Broadcast', recording: 'Recording' };
const GAIN_MIN = -20, GAIN_MAX = 20, STEP = 0.5;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const fmtDb = (v, ascii = false) => `${v > 0 ? '+' : v < 0 ? (ascii ? '-' : '−') : ''}${Math.abs(v).toFixed(1)} dB`;
let avPromise = null;
const av = () => (avPromise ||= load('av').catch(() => null));

export class MdjMicStrip extends MdjElement {
  static tag = 'mdj-mic-strip';
  static states = STATES;
  static fr = ['FR-030', 'FR-022'];
  static hit = 0; // container: Mute (56), rail / toggles / chips (48) carry data-hit
  static fixture = false; // the embedded <mdj-meter> prints the FIXTURE mark for the level
  static observed = ['input', 'gain', 'pending-gain', 'level', 'mute', 'monitor', 'talkover', 'duck', 'assign', 'route'];
  static samples = {
    default: { input: 'headset', gain: 0, level: 0.56, assign: 'master,recording', route: 'usbc-stereo', style: 'width:min(100%, 380px)' },
    variants: [{}],
    off: { level: 0, assign: '' },
    armed: { level: 0.18, monitor: true },
    live: { level: 0.56, gain: 3, assign: 'master,broadcast,recording', duck: true },
    denied: { level: 0, input: 'builtin', assign: '' },
    'feedback-risk': { input: 'builtin', route: 'speaker', monitor: true, level: 0.86 },
    'route-change': { input: 'quadra-in2', route: 'usb-4ch', level: 0 },
  };

  constructor() { super(); this._drag = null; this._fx = null; }
  connectedCallback() { av().then((fx) => { this._fx = fx; if (this.isConnected) this.render(); }); super.connectedCallback(); }

  model() {
    const state = STATES.includes(this.state) ? this.state : 'off';
    const inputId = this.attr('input', 'headset');
    const input = this._fx?.mic?.inputs?.find((i) => i.id === inputId) || { id: inputId, name: inputId === 'builtin' ? 'Phone microphone' : inputId === 'quadra-in2' ? 'Quadra 4 — input 2' : 'USB-C headset mic', channel: '1', device: '' };
    const route = fixtures.route(this.attr('route', input.routeId || 'usbc-stereo'));
    const gain = clamp(this.num('gain', 0), GAIN_MIN, GAIN_MAX);
    const pending = this.hasAttribute('pending-gain') ? clamp(this.num('pending-gain', gain), GAIN_MIN, GAIN_MAX) : null;
    const level = clamp(this.num('level', 0), 0, 1);
    const assign = (this.attr('assign', '') || '').split(',').map((a) => a.trim()).filter((a) => ASSIGN[a]);
    const duckDef = this._fx?.mic?.duck || { thresholdDb: -24, attackMs: 40, releaseMs: 600, depthDb: -9 };
    const denied = state === 'denied';
    const inert = denied || state === 'route-change';
    return { state, input, route, gain, pending, level, mute: this.bool('mute'), monitor: this.bool('monitor') && state !== 'route-change', talkover: this.bool('talkover'), duck: this.bool('duck'), assign, duckDef, denied, inert };
  }

  toggle(m, label, key, pressed, { ic, hit = 48, cls = '', extra = null, disabled = m.inert, why = '' } = {}) {
    return h('button', {
      type: 'button', class: `mic__toggle ${cls}`.trim(), dataset: { hit: String(hit) }, 'aria-pressed': String(pressed),
      'aria-label': `${label} microphone, ${m.input.name}${disabled && why ? ` (unavailable: ${why})` : ''}`, 'aria-disabled': disabled ? 'true' : undefined,
      on: { click: () => { if (!disabled) this.emit('mdj:mic', { control: key, value: !pressed, input: m.input.id }); } },
    }, [h('span', { class: 'mic__toggle-face' }, [icon(ic, { size: 18 }), h('span', { class: 'mic__toggle-text label', text: label })]), extra]);
  }

  render() {
    const m = this.model();
    const focusRail = this.contains(document.activeElement) && document.activeElement.classList.contains('mic__rail');
    this.className = `mic raised mic--${m.state}${m.mute ? ' mic--muted' : ''}`;
    this.setAttribute('role', 'group');
    this.setAttribute('aria-label', `Microphone, ${m.input.name}, ${m.state.replace('-', ' ')}`);
    delete this.dataset.hit;

    const word = { off: 'Off', armed: 'Armed', live: 'Live', denied: 'Permission denied', 'feedback-risk': 'Feedback risk', 'route-change': 'Route changed' }[m.state];
    const head = h('div', { class: 'mic__head' }, [
      h('span', { class: 'mic__icon' }, [icon('mic', { size: 18 })]),
      h('button', {
        type: 'button', class: 'mic__input', dataset: { hit: '48' }, 'aria-label': `Input: ${m.input.name}, channel ${m.input.channel}. Change input`, 'aria-haspopup': 'dialog',
        'aria-disabled': m.denied ? 'true' : undefined, on: { click: () => { if (!m.denied) this.emit('mdj:mic-input', { input: m.input.id }); } },
      }, [
        h('span', { class: 'mic__input-text' }, [h('span', { class: 'mic__input-name truncate', text: m.input.name }), h('span', { class: 'mic__input-meta label', text: `ch ${m.input.channel}${m.input.device ? ` · ${m.input.device}` : ''}` })]),
        icon('chevron-down', { size: 16 }),
      ]),
      h('span', { class: `mic__word label mic__word--${m.state}` }, [m.state === 'live' ? h('span', { class: 'mic__dot', 'aria-hidden': 'true' }) : null, h('span', { text: word })]),
    ]);

    // Gain rail: role=slider, pickup on the thumb, brass 0 dB index, titanium thumb; pending ghost index.
    const shown = m.pending != null ? m.pending : m.gain;
    const p = (v) => (v - GAIN_MIN) / (GAIN_MAX - GAIN_MIN);
    const rail = h('div', {
      class: 'mic__rail', role: 'slider', tabindex: m.inert ? -1 : 0, 'aria-label': `Mic gain, ${m.input.name}`, 'aria-valuemin': GAIN_MIN, 'aria-valuemax': GAIN_MAX, 'aria-valuenow': shown,
      'aria-valuetext': `${fmtDb(shown, true)}${m.pending != null ? ', sent, waiting for the engine' : ''}`, 'aria-disabled': m.inert ? 'true' : undefined, dataset: { hit: '48' },
      on: { keydown: (e) => this.onKey(e, m, shown), pointerdown: (e) => this.onDown(e, m, shown), pointermove: (e) => this.onMove(e, m), pointerup: (e) => this.onUp(e, m), pointercancel: () => this.onCancel(m), lostpointercapture: () => this.onCancel(m) },
    }, [
      h('span', { class: 'mic__rail-track sunken', 'aria-hidden': 'true' }, [
        ...[-20, -10, 10, 20].map((v) => h('span', { class: 'mic__tick', style: { left: `${p(v) * 100}%` } })),
        h('span', { class: 'mic__zero brass', style: { left: `${p(0) * 100}%` } }),
      ]),
      m.pending != null ? h('span', { class: 'mic__ghost', style: { left: `${p(m.pending) * 100}%` }, 'aria-hidden': 'true' }) : null,
      h('span', { class: 'mic__thumb brass-rim', style: { left: `${p(m.gain) * 100}%` }, 'aria-hidden': 'true' }, [h('span', { class: 'mic__thumb-face titanium' }, [h('span', { class: 'mic__grip' })])]),
    ]);
    const gainRow = h('div', { class: 'mic__gain' }, [
      h('span', { class: 'mic__gain-label label', text: 'Gain' }),
      rail,
      h('span', { class: 'mic__readout numeral ink-backing', text: fmtDb(shown) }),
      m.pending != null ? h('span', { class: 'mic__sent', text: 'SENT' }) : null,
    ]);

    const meter = document.createElement('mdj-meter');
    meter.setAttribute('kind', 'channel'); meter.setAttribute('label', 'Mic'); meter.setAttribute('scale', 'compact'); meter.setAttribute('orientation', 'horizontal');
    meter.setAttribute('l', String(m.level)); meter.setAttribute('r', String(Math.max(0, m.level - 0.04)));
    if (m.level >= 0.98) meter.setAttribute('clip', '');
    meter.setAttribute('state', m.state === 'off' || m.denied ? 'idle' : m.mute ? 'muted' : 'active');
    meter.setAttribute('fixture', 'mic level');
    const meterRow = h('div', { class: 'mic__meter' }, [meter]);

    const buttons = h('div', { class: 'mic__buttons' }, [
      this.toggle(m, 'Mute', 'mute', m.mute, { ic: 'mute', hit: 56, cls: 'mic__toggle--mute', disabled: m.denied, why: 'permission denied' }),
      this.toggle(m, 'Monitor', 'monitor', m.monitor, { ic: 'headphones', cls: 'mic__toggle--monitor', disabled: m.inert, why: m.state === 'route-change' ? 'verify the new route first' : 'permission denied' }),
      h('button', {
        type: 'button', class: `mic__toggle mic__toggle--talkover${m.talkover ? ' mic__toggle--held' : ''}`, dataset: { hit: '48' }, 'aria-pressed': String(m.talkover),
        'aria-label': `Talkover microphone, ${m.input.name}, hold to duck the music${m.inert ? ' (unavailable)' : ''}`, 'aria-disabled': m.inert ? 'true' : undefined,
        on: {
          pointerdown: (e) => { if (m.inert) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); this.setAttribute('talkover', ''); this.emit('mdj:mic', { control: 'talkover', value: true, input: m.input.id, phase: 'start' }); },
          pointerup: () => { if (!this.hasAttribute('talkover')) return; this.removeAttribute('talkover'); this.emit('mdj:mic', { control: 'talkover', value: false, input: m.input.id, phase: 'end' }); },
          pointercancel: () => { if (!this.hasAttribute('talkover')) return; this.removeAttribute('talkover'); this.emit('mdj:mic', { control: 'talkover', value: false, input: m.input.id, phase: 'cancel' }); },
          keydown: (e) => { if ((e.key === ' ' || e.key === 'Enter') && !m.inert && !e.repeat) { e.preventDefault(); this.setAttribute('talkover', ''); this.emit('mdj:mic', { control: 'talkover', value: true, input: m.input.id, phase: 'start' }); } },
          keyup: (e) => { if ((e.key === ' ' || e.key === 'Enter') && this.hasAttribute('talkover')) { this.removeAttribute('talkover'); this.emit('mdj:mic', { control: 'talkover', value: false, input: m.input.id, phase: 'end' }); } },
        },
      }, [h('span', { class: 'mic__toggle-face' }, [icon('talkover', { size: 18 }), h('span', { class: 'mic__toggle-text label', text: m.talkover ? 'Talk · held' : 'Talkover' })])]),
      this.toggle(m, 'Duck', 'duck', m.duck, { ic: 'duck', cls: 'mic__toggle--duck', disabled: m.inert, why: 'permission denied' }),
    ]);
    const duckLine = h('p', { class: 'mic__duck-line label' }, [h('span', { text: 'Duck: ' }), h('span', { class: 'numeral', text: `${m.duckDef.thresholdDb} dBFS · ${m.duckDef.attackMs} / ${m.duckDef.releaseMs} ms · ${m.duckDef.depthDb} dB` }), h('span', { text: m.duck ? ' · automatic' : ' · off, manual talkover available' })]);

    const chips = h('div', { class: 'mic__assign' }, [
      h('span', { class: 'label mic__assign-label', text: 'Send to' }),
      ...Object.entries(ASSIGN).map(([id, label]) => {
        const on = m.assign.includes(id);
        return h('button', {
          type: 'button', class: `mic__chip${on ? ' mic__chip--on' : ''}`, dataset: { hit: '48' }, 'aria-pressed': String(on), 'aria-label': `Send microphone to ${label}, ${on ? 'on' : 'off'}${m.inert ? ' (unavailable)' : ''}`,
          'aria-disabled': m.inert ? 'true' : undefined, on: { click: () => { if (!m.inert) this.emit('mdj:mic', { control: 'assign', bus: id, value: !on, input: m.input.id }); } },
        }, [h('span', { class: 'mic__chip-face' }, [icon(on ? 'check' : 'plus', { size: 12 }), h('span', { text: label })])]);
      }),
      h('span', { class: 'mic__assign-note label', text: 'Never to ParDay' }),
    ]);

    const notices = [];
    if (m.state === 'feedback-risk') notices.push(h('div', { class: 'mic__notice tone-warning', role: 'alert' }, [icon('warning', { size: 16 }), h('span', { class: 'body' }, [h('strong', { text: 'Feedback risk. ' }), h('span', { text: `Monitoring is on while the output route is ${m.route?.name || 'the phone speaker'}: the microphone and the speaker share the room. Use headphones for monitoring or turn Monitor off.` })])]));
    if (m.state === 'denied') notices.push(h('div', { class: 'mic__notice tone-critical', role: 'alert' }, [icon('lock', { size: 16 }), h('div', { class: 'mic__notice-body' }, [h('span', { class: 'body' }, [h('strong', { text: 'Microphone permission denied. ' }), h('span', { text: 'The input stays closed and nothing is sent anywhere. Granting it opens the input only; sending to master, broadcast or recording is still your choice here.' })]), h('button', { type: 'button', class: 'btn btn--primary mic__fix', dataset: { hit: '48' }, 'aria-label': 'Open system settings to allow the microphone', on: { click: () => this.emit('mdj:mic', { control: 'permission', input: m.input.id }) } }, [icon('settings', { size: 16 }), h('span', { class: 'btn-label', text: 'Open system settings' })])])]));
    if (m.state === 'route-change') notices.push(h('div', { class: 'mic__notice tone-warning', role: 'alert' }, [icon('route', { size: 16 }), h('div', { class: 'mic__notice-body' }, [h('span', { class: 'body' }, [h('strong', { text: 'Headset / USB device changed. ' }), h('span', { text: 'Monitoring is off until the new route is verified (route-loss rules apply); the mic input is held closed, not rerouted.' })]), h('button', { type: 'button', class: 'btn btn--secondary mic__fix', dataset: { hit: '48' }, 'aria-label': `Verify route, ${m.route?.name || 'new device'}`, on: { click: () => this.emit('mdj:mic', { control: 'verify-route', input: m.input.id }) } }, [icon('isolation-check', { size: 16 }), h('span', { class: 'btn-label', text: 'Verify route' })])])]));
    if (m.state === 'off') notices.push(h('p', { class: 'mic__hint body muted', text: 'Input closed. Arm the microphone to open it; assignment decides where it is heard.' }));

    this.replaceChildren(head, gainRow, meterRow, buttons, duckLine, chips, ...notices);
    if (focusRail) this.querySelector('.mic__rail')?.focus({ preventScroll: true });
  }

  // ---- rail interaction ----
  travel(rail) { return Math.max(1, rail.getBoundingClientRect().width - 24); }
  paint(v) {
    const t = this.querySelector('.mic__thumb'); if (t) t.style.left = `${((v - GAIN_MIN) / (GAIN_MAX - GAIN_MIN)) * 100}%`;
    const r = this.querySelector('.mic__readout'); if (r) r.textContent = fmtDb(v);
    this.querySelector('.mic__rail')?.setAttribute('aria-valuetext', `${fmtDb(v, true)}, held`);
  }
  onDown(e, m, shown) {
    if (m.inert || this._drag) return;
    const r = this.querySelector('.mic__thumb')?.getBoundingClientRect();
    if (!(r && e.clientX >= r.left - 12 && e.clientX <= r.right + 12)) return; // pickup on the thumb only
    e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId);
    this._drag = { id: e.pointerId, x: e.clientX, start: shown, v: shown, moved: false };
    this.dataset.state = 'held';
  }
  onMove(e, m) {
    const d = this._drag; if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x; if (Math.abs(dx) > 2) d.moved = true; if (!d.moved) return;
    d.v = Math.round(clamp(d.start + (dx / this.travel(e.currentTarget)) * (GAIN_MAX - GAIN_MIN), GAIN_MIN, GAIN_MAX) / STEP) * STEP;
    this.paint(d.v); this.emit('mdj:value', { kind: 'mic-gain', value: d.v, phase: 'move', input: m.input.id });
  }
  onUp(e, m) {
    const d = this._drag; if (!d || e.pointerId !== d.id) return; this._drag = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* released */ }
    this.syncState();
    if (!d.moved) { this.render(); return; }
    this.setAttribute('pending-gain', String(d.v)); this.emit('mdj:value', { kind: 'mic-gain', value: d.v, phase: 'end', input: m.input.id });
  }
  onCancel(m) { const d = this._drag; if (!d) return; this._drag = null; this.syncState(); this.render(); this.emit('mdj:value', { kind: 'mic-gain', value: m.gain, phase: 'cancel', input: m.input.id }); }
  onKey(e, m, shown) {
    if (m.inert) return;
    const delta = { ArrowRight: STEP, ArrowUp: STEP, ArrowLeft: -STEP, ArrowDown: -STEP, PageUp: 10 * STEP, PageDown: -10 * STEP }[e.key];
    let v; if (delta != null) v = clamp(shown + delta, GAIN_MIN, GAIN_MAX); else if (e.key === 'Home') v = GAIN_MIN; else if (e.key === 'End') v = GAIN_MAX; else if (e.key === 'Delete' || e.key === 'Backspace') v = 0; else return;
    e.preventDefault(); this.setAttribute('pending-gain', String(v)); this.emit('mdj:value', { kind: 'mic-gain', value: v, phase: 'end', source: 'keyboard', input: m.input.id });
  }
}
define(MdjMicStrip);

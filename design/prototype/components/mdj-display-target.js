// <mdj-display-target name="…" detail="…" compact state="none|wired-connected|wired-disconnected|wireless-unverified|verifying">
//
// External display status for the program output (Document 03 §7, Document 15 §3, FR-045). A display is a
// capability, not a guarantee: the card prints what is connected (reported resolution and rate are fixtures,
// so they are labelled as reported), whether it has been VERIFIED, and the rule that nothing is presented as
// live before verification. Wireless displays carry their own latency profile and are never equated with a
// verified wired route. A disconnect hides the program output and never exposes private UI, cue controls,
// stream keys or the singer's notes; a reconnect needs a valid display configuration again.
// Engine binding: NONE (display routing is an Android Presentation lifecycle, not the audio engine). Buttons emit
// mdj:display { action: 'verify' | 'present' | 'cancel' | 'stop' }; the screen reflects the reported state.
//   none                 — no external display; program stays on this device
//   wired-connected      — connected, not yet verified: Verify display available, Present program disabled (why printed)
//   wired-disconnected   — program hidden; private UI never exposed
//   wireless-unverified  — found, latency profile not measured; Verify available, equality with wired never claimed
//   verifying            — test pattern / colour range / resolution check running: VERIFYING stamp, Cancel
// Units / range: resolution px, refresh Hz (reported, fixture). Gesture: tap. Pending vs acknowledged:
// `verifying` is the sent state; "verified" is only ever printed by the owning screen after the check reports.
// Cancellation: Cancel verification; Stop presenting.
// Accessible: role=group "External display, wired display connected, not verified"; the status line is
// role=status; disabled buttons say why.
import { MdjElement, define, h, s, icon } from './base.js';
import { load } from '../app/fixtures.js';

const STATES = ['none', 'wired-connected', 'wired-disconnected', 'wireless-unverified', 'verifying'];
const FALLBACK = {
  none: { label: 'No external display', detail: 'Program output stays on this device until a display is connected and verified.' },
  'wired-connected': { label: 'Wired display connected · 1920 × 1080 · 60 Hz (reported, fixture)', detail: 'A clean program surface is ready to verify. Controls, cue, stream keys and singer notes stay on the phone.' },
  'wired-disconnected': { label: 'Wired display disconnected', detail: 'Program output hidden. Nothing private was exposed; a reconnect needs a valid display configuration before it is live again.' },
  'wireless-unverified': { label: 'Wireless display found · latency profile not measured', detail: 'Wireless display latency has its own profile and is not advertised as equal to a verified wired route.' },
  verifying: { label: 'Verifying display', detail: 'Checking resolution, colour range and a test pattern on the program surface.' },
};
const TONE = { none: 'neutral', 'wired-connected': 'info', 'wired-disconnected': 'critical', 'wireless-unverified': 'warning', verifying: 'info' };
let avPromise = null;
const av = () => (avPromise ||= load('av').catch(() => null));

function glyph(state) {
  const svg = s('svg', { class: 'display-target__glyph', viewBox: '0 0 64 44', width: 64, height: 44, 'aria-hidden': 'true', focusable: 'false' });
  const add = (e) => svg.appendChild(e);
  add(s('rect', { x: 2, y: 2, width: 60, height: 36, rx: 3, class: `dt-screen${state === 'none' || state === 'wired-disconnected' ? ' dt-screen--off' : ''}` }));
  add(s('rect', { x: 2, y: 2, width: 60, height: 36, rx: 3, class: 'dt-rim' }));
  add(s('rect', { x: 24, y: 39, width: 16, height: 3, rx: 1, class: 'dt-stand' }));
  if (state === 'wired-connected' || state === 'verifying') {
    // test-pattern bars (verifying) or a clean program surface (connected)
    if (state === 'verifying') for (let i = 0; i < 6; i++) add(s('rect', { x: 6 + i * 9, y: 6, width: 8, height: 28, class: `dt-bar dt-bar--${i}` }));
    else add(s('rect', { x: 8, y: 8, width: 48, height: 24, rx: 1, class: 'dt-program' }));
  }
  if (state === 'wireless-unverified') for (const r of [6, 11, 16]) add(s('path', { d: `M${32 - r} 26 A ${r} ${r} 0 0 1 ${32 + r} 26`, class: 'dt-wave' }));
  if (state === 'wired-disconnected') add(s('path', { d: 'M22 10 L42 30 M42 10 L22 30', class: 'dt-cross' }));
  if (state === 'none') add(s('path', { d: 'M20 20 H44', class: 'dt-dash' }));
  if (state === 'wireless-unverified' || state === 'wired-connected') add(s('text', { x: 32, y: 36, class: 'dt-q', 'text-anchor': 'middle' }, ['?']));
  return svg;
}

export class MdjDisplayTarget extends MdjElement {
  static tag = 'mdj-display-target';
  static states = STATES;
  static fr = ['FR-045'];
  static hit = 0; // container: Verify / Present / Cancel buttons carry data-hit="48"
  static fixture = false; // the reported resolution / rate is labelled "(reported, fixture)" in its text
  static observed = ['name', 'detail', 'compact'];
  static samples = { default: { style: 'width:min(100%, 380px)' }, variants: [{}] };

  constructor() { super(); this._fx = null; }
  connectedCallback() { av().then((fx) => { this._fx = fx; if (this.isConnected) this.render(); }); super.connectedCallback(); }

  btn(label, { ic = null, cls = 'btn--secondary', disabled = false, why = '', on }) {
    return h('button', {
      type: 'button', class: `btn ${cls} display-target__btn`, dataset: { hit: '48' }, 'aria-label': `${label}${disabled && why ? ` (unavailable: ${why})` : ''}`,
      'aria-disabled': disabled ? 'true' : undefined, on: { click: () => { if (!disabled) on(); } },
    }, [ic ? icon(ic, { size: 16 }) : null, h('span', { class: 'btn-label', text: label })]);
  }

  render() {
    const state = STATES.includes(this.state) ? this.state : 'none';
    const def = this._fx?.displays?.[state] || FALLBACK[state];
    const label = this.attr('name', '') || def.label;
    const detail = this.attr('detail', '') || def.detail;
    const compact = this.bool('compact');
    const verified = false; // this component never prints "verified": the owning screen does, after the check reports
    this.className = `display-target raised display-target--${state}${compact ? ' display-target--compact' : ''}`;
    this.setAttribute('role', 'group');
    this.setAttribute('aria-label', `External display, ${label}${state === 'wired-connected' || state === 'wireless-unverified' ? ', not verified' : ''}`);
    delete this.dataset.hit;

    const head = h('div', { class: 'display-target__head' }, [
      glyph(state),
      h('div', { class: 'display-target__titles' }, [
        h('span', { class: 'display-target__kicker label' }, [icon('display', { size: 11 }), h('span', { text: 'External display' })]),
        h('span', { class: `display-target__status tone-${TONE[state]} body`, role: 'status', text: label }),
      ]),
      state === 'verifying' ? h('span', { class: 'display-target__stamp', text: 'VERIFYING' }) : null,
    ]);
    const detailEl = compact ? null : h('p', { class: 'display-target__detail body muted', text: detail });
    const rule = h('p', { class: 'display-target__rule label' }, [icon('lock', { size: 10 }), h('span', { text: ' Verified before live: nothing is presented as program output until the display check passes.' })]);

    const act = (action) => () => this.emit('mdj:display', { action, state });
    const actions = [];
    if (state === 'wired-connected' || state === 'wireless-unverified') {
      actions.push(this.btn('Verify display', { ic: 'validate', cls: 'btn--primary', on: act('verify') }));
      actions.push(this.btn('Present program', { ic: 'external', disabled: !verified, why: 'display not verified yet', on: act('present') }));
    } else if (state === 'verifying') {
      actions.push(this.btn('Cancel verification', { ic: 'x', on: act('cancel') }));
      actions.push(this.btn('Present program', { ic: 'external', disabled: true, why: 'verification in progress', on: act('present') }));
    } else if (state === 'wired-disconnected') {
      actions.push(this.btn('Present program', { ic: 'external', disabled: true, why: 'no display connected; reconnect needs a valid configuration', on: act('present') }));
      actions.push(this.btn('Keep program on this device', { ic: 'video', on: act('local') }));
    } else {
      actions.push(this.btn('Present program', { ic: 'external', disabled: true, why: 'no external display', on: act('present') }));
    }
    const extra = state === 'wireless-unverified' && !compact ? h('p', { class: 'display-target__note tone-warning body', text: 'Wireless latency is measured separately and shown as its own profile; it is never reported as equal to a verified wired route.' }) : state === 'wired-disconnected' && !compact ? h('p', { class: 'display-target__note tone-critical body', text: 'Private UI, cue controls, stream keys and singer notes were never on this surface, so nothing was exposed when it went away.' }) : null;
    this.replaceChildren(...[head, detailEl, rule, extra, h('div', { class: 'display-target__actions' }, actions)].filter(Boolean));
  }
}
define(MdjDisplayTarget);

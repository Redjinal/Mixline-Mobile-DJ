// <mdj-broadcast-state destination="fixture-rtmps" buses="master,mic,video" rate="2480" delay="640" dropped="0"
//                      reconnects="0" acknowledged profile="720p30 · 2.5 Mb/s"
//                      state="private|connecting|connected|acknowledged|reconnecting|disconnected|stopped|congested">
//
// The broadcast panel's state block (Document 03 §7, Document 15 §5, FR-046, FR-036). Before Start it shows the
// destination / account, the selected buses, source eligibility and the quality profile; while running it prints
// connection state as a WORD plus a SHAPE, the encoded rate, queue delay, dropped frames, reconnect attempts and
// whether the destination acknowledged reception. Every numeral is a fixture → FIXTURE mark. "Connected" is
// not proof the audience hears the mix; the card says so under the state line.
// Engine binding: NONE. Start / Stop emit mdj:broadcast { action: 'start' | 'stop' | 'test' } and the screen
// sends BroadcastCommand(start | stop) to the capture / encoder / network pipeline; the state printed here is the
// pipeline's REPORTED state. Start and Stop are separate 56 dp controls with distinct looks (brass-rimmed Start,
// square critical-outlined Stop); the one that does not apply stays visible but disabled so nothing moves.
// Buses: master, mic and video are selectable chips; cue and ParDay speech are EXCLUDED BY DEFAULT and printed
// as excluded. A recording indicator is not a broadcast indicator; this block never implies one.
// Units / range: rate kb/s, delay ms, dropped frames (integer), reconnects (integer); unknown prints "—".
// Gesture: tap. Pending vs acknowledged: `connecting` is the sent state; `connected` is a transport ack without
// receiver confirmation; `acknowledged` adds the destination's confirmation. Cancellation: Stop releases
// transmission promptly without muting the room mix (the remote end state is reported, not assumed).
// Stream key: stored securely, shown only redacted, never in URLs, logs, screenshots or to a model.
// Accessible: role=group "Broadcast, Fixture RTMPS receiver, connected, not yet acknowledged"; the state line is
// role=status; Start / Stop name the destination.
import { MdjElement, define, h, s, icon } from './base.js';
import { load } from '../app/fixtures.js';

const STATES = ['private', 'connecting', 'connected', 'acknowledged', 'reconnecting', 'disconnected', 'stopped', 'congested'];
const BUS_LABEL = { master: 'Master', mic: 'Microphone', video: 'Program video' };
const SHAPE = { private: 'square-hollow', connecting: 'ring-dashed', connected: 'circle', acknowledged: 'circle-check', reconnecting: 'ring-dashed', disconnected: 'cross', stopped: 'square', congested: 'triangle' };
const TONE = { private: 'neutral', connecting: 'info', connected: 'info', acknowledged: 'ok', reconnecting: 'warning', disconnected: 'critical', stopped: 'neutral', congested: 'warning' };
let avPromise = null;
const av = () => (avPromise ||= load('av').catch(() => null));

function shapeSvg(kind) {
  const svg = s('svg', { class: 'bcast__shape', viewBox: '0 0 20 20', width: 14, height: 14, 'aria-hidden': 'true', focusable: 'false' });
  const add = (el) => svg.appendChild(el);
  switch (kind) {
    case 'circle': add(s('circle', { cx: 10, cy: 10, r: 7, class: 'bcast__shape-fill' })); break;
    case 'circle-check': add(s('circle', { cx: 10, cy: 10, r: 7, class: 'bcast__shape-fill' })); add(s('path', { d: 'M6.5 10.5 L9 13 L13.5 7.5', class: 'bcast__shape-mark' })); break;
    case 'ring-dashed': add(s('circle', { cx: 10, cy: 10, r: 7, class: 'bcast__shape-ring bcast__shape-ring--dashed' })); break;
    case 'square': add(s('rect', { x: 4, y: 4, width: 12, height: 12, rx: 1.5, class: 'bcast__shape-fill' })); break;
    case 'square-hollow': add(s('rect', { x: 4, y: 4, width: 12, height: 12, rx: 1.5, class: 'bcast__shape-ring' })); break;
    case 'triangle': add(s('path', { d: 'M10 3 L18 17 H2 Z', class: 'bcast__shape-fill' })); break;
    default: add(s('path', { d: 'M5 5 L15 15 M15 5 L5 15', class: 'bcast__shape-x' }));
  }
  return svg;
}

export class MdjBroadcastState extends MdjElement {
  static tag = 'mdj-broadcast-state';
  static states = STATES;
  static fr = ['FR-046', 'FR-036'];
  static hit = 0; // container: Start / Stop (56) and bus chips (48) carry data-hit
  static fixture = true; // rate, delay, dropped frames and reconnect counts are fixtures
  static observed = ['destination', 'buses', 'rate', 'delay', 'dropped', 'reconnects', 'acknowledged', 'profile', 'eligibility'];
  static samples = {
    default: { destination: 'fixture-rtmps', buses: 'master,mic,video', style: 'width:min(100%, 380px)' },
    variants: [{}],
    private: {},
    connecting: { dropped: 0 },
    connected: { rate: 2480, delay: 640, dropped: 0, reconnects: 0 },
    acknowledged: { rate: 2510, delay: 580, dropped: 2, reconnects: 0, acknowledged: true },
    reconnecting: { rate: 0, delay: 3200, dropped: 48, reconnects: 2 },
    disconnected: { rate: 0, dropped: 48, reconnects: 5 },
    stopped: { rate: 0, dropped: 2, reconnects: 0 },
    congested: { rate: 1180, delay: 2100, dropped: 31, reconnects: 0, acknowledged: true, buses: 'master,video' },
  };

  constructor() { super(); this._fx = null; }
  connectedCallback() { av().then((fx) => { this._fx = fx; if (this.isConnected) { this.render(); this.ensureFixtureMark(); } }); super.connectedCallback(); }

  render() {
    const state = STATES.includes(this.state) ? this.state : 'private';
    const destId = this.attr('destination', 'fixture-rtmps');
    const fx = this._fx || null;
    const dest = fx?.broadcast?.destinations?.find((d) => d.id === destId) || { id: destId, name: destId, account: 'account unknown', protocol: '—', profile: this.attr('profile', '—'), streamKeyRedacted: '••••••••••••', testReceiver: false };
    const stDef = fx?.broadcast?.states?.[state] || null;
    const buses = (this.attr('buses', 'master,mic,video') || '').split(',').map((b) => b.trim()).filter((b) => BUS_LABEL[b]);
    const n = (name, fallback) => (this.hasAttribute(name) && this.getAttribute(name) !== 'null' && this.getAttribute(name) !== '' ? this.num(name, 0) : fallback);
    const rate = n('rate', stDef?.rateKbps ?? null), delay = n('delay', stDef?.delayMs ?? null), dropped = n('dropped', stDef?.dropped ?? null), reconnects = n('reconnects', stDef?.reconnects ?? 0);
    const acknowledged = this.hasAttribute('acknowledged') ? this.bool('acknowledged') : !!stDef?.acknowledged;
    const profile = this.attr('profile', '') || dest.profile || '—';
    const eligibility = this.attr('eligibility', 'Master: local files, all eligible · Microphone: permitted · Program video: authorized local video (fixture)');
    const running = ['connecting', 'connected', 'acknowledged', 'reconnecting', 'congested'].includes(state);
    this.className = `bcast raised bcast--${state}${running ? ' bcast--running' : ''}`;
    this.setAttribute('role', 'group');
    const stateLabel = stDef?.label || { private: 'Private — not transmitting', connecting: 'Connecting', connected: 'Connected — not yet acknowledged', acknowledged: 'Connected — destination acknowledged reception', reconnecting: 'Reconnecting', disconnected: 'Disconnected', stopped: 'Stopped — transmission released', congested: 'Congested — bitrate reduced within the profile' }[state];
    this.setAttribute('aria-label', `Broadcast, ${dest.name}, ${stateLabel}`);
    delete this.dataset.hit;

    const head = h('div', { class: 'bcast__head' }, [
      h('span', { class: 'bcast__icon' }, [icon('broadcast', { size: 18 })]),
      h('div', { class: 'bcast__dest' }, [
        h('span', { class: 'bcast__name title truncate', text: dest.name }),
        h('span', { class: 'bcast__account label truncate', text: `${dest.account} · ${dest.protocol}${dest.testReceiver ? ' · test receiver' : ''}` }),
      ]),
      running ? h('span', { class: 'bcast__live label', text: state === 'acknowledged' ? 'ON AIR' : 'SENDING' }) : h('span', { class: 'bcast__live bcast__live--off label', text: state === 'stopped' ? 'ENDED' : state === 'disconnected' ? 'LOST' : 'PRIVATE' }),
    ]);

    const stateLine = h('div', { class: `bcast__state tone-${TONE[state]}`, role: 'status' }, [shapeSvg(SHAPE[state]), h('span', { class: 'bcast__state-text body', text: stateLabel })]);
    const proof = h('p', { class: 'bcast__proof body muted' }, [icon('info', { size: 12 }), h('span', { text: ' Connected is not proof the audience hears the mix. Only the destination’s acknowledgement and a test receiver check say what arrives.' })]);

    const busChip = (id, included) => h('button', {
      type: 'button', class: `bcast__bus${included ? ' bcast__bus--on' : ''}`, dataset: { hit: '48' }, 'aria-pressed': String(included), 'aria-label': `${BUS_LABEL[id]} bus, ${included ? 'included' : 'excluded'}`,
      'aria-disabled': running ? 'true' : undefined, on: { click: () => { if (!running) this.emit('mdj:broadcast-bus', { bus: id, included: !included }); } },
    }, [h('span', { class: 'bcast__bus-face' }, [icon(included ? 'check' : 'plus', { size: 12 }), h('span', { text: BUS_LABEL[id] })])]);
    const busRow = h('div', { class: 'bcast__buses' }, [
      h('span', { class: 'label bcast__buses-label', text: 'Buses' }),
      ...Object.keys(BUS_LABEL).map((id) => busChip(id, buses.includes(id))),
      h('span', { class: 'bcast__excluded label' }, [icon('unavailable', { size: 10 }), h('span', { text: 'Cue · ParDay speech — excluded by default' })]),
    ]);

    const num = (v, unit) => (v == null ? '—' : `${Math.round(v).toLocaleString('en-US')}${unit ? ` ${unit}` : ''}`);
    const metric = (label, value, extra = '', name = label) => h('div', { class: `bcast__metric${extra}`, role: 'group', 'aria-label': `${name}: ${value}` }, [h('span', { class: 'label', text: label, 'aria-hidden': 'true' }), h('span', { class: 'numeral bcast__value', text: value, 'aria-hidden': 'true' })]);
    const metrics = h('div', { class: 'bcast__metrics', 'aria-label': 'Stream metrics (fixture)' }, [
      metric('Encoded', rate == null ? '—' : `${num(rate, 'kb/s')}`),
      metric('Queue delay', delay == null ? '—' : num(delay, 'ms'), delay != null && delay > 1500 ? ' bcast__metric--warn' : ''),
      metric('Dropped', dropped == null ? '—' : `${num(dropped)} fr`, dropped ? ' bcast__metric--warn' : ''),
      metric('Retries', num(reconnects), '', 'Reconnect attempts'),
      metric('Ack', acknowledged ? 'yes' : 'no', acknowledged ? ' bcast__metric--ok' : ''),
    ]);

    const details = h('dl', { class: 'bcast__details' }, [
      h('div', {}, [h('dt', { class: 'label', text: 'Profile' }), h('dd', { class: 'body', text: profile })]),
      h('div', {}, [h('dt', { class: 'label', text: 'Eligibility' }), h('dd', { class: 'body', text: eligibility })]),
      h('div', {}, [h('dt', { class: 'label', text: 'Stream key' }), h('dd', { class: 'bcast__key numeral' }, [icon('lock', { size: 11 }), h('span', { text: ` ${dest.streamKeyRedacted || '••••••••••••'}` }), h('span', { class: 'bcast__key-note label', text: 'redacted · never logged · never sent to ParDay' })])]),
    ]);

    const notes = [];
    if (state === 'congested') notes.push(h('p', { class: 'bcast__note tone-warning body', text: stDef?.policy || 'Bounded congestion policy: reduce video bitrate, then frames, then reconnect, then stop with an alert. Latency never grows without limit.' }));
    if (state === 'reconnecting') notes.push(h('p', { class: 'bcast__note tone-warning body', text: 'Audience may have a gap. Local audio continues; nothing is delayed to catch up later.' }));
    if (state === 'disconnected') notes.push(h('p', { class: 'bcast__note tone-critical body', text: 'Reconnect attempts exhausted. The room mix is unaffected. Local fallback recording is a separate option that needs its own permission — it was not switched on because the stream failed.' }));
    if (state === 'stopped') notes.push(h('p', { class: 'bcast__note tone-neutral body', text: stDef?.remote ? `Remote end: ${stDef.remote}.` : 'Remote end state reported when the receiver answers.' }));
    if (state === 'private') notes.push(h('p', { class: 'bcast__note tone-neutral body', text: 'Nothing is sent until you start. ParDay can prepare this panel but cannot start transmission.' }));

    const startDisabled = running;
    const stopDisabled = !running;
    const start = h('button', {
      type: 'button', class: 'bcast__start', dataset: { hit: '56' }, 'aria-label': `Start broadcast to ${dest.name}${startDisabled ? ' (unavailable: already transmitting)' : ''}`,
      'aria-disabled': startDisabled ? 'true' : undefined, on: { click: () => { if (!startDisabled) this.emit('mdj:broadcast', { action: 'start', destination: dest.id, buses }); } },
    }, [h('span', { class: 'bcast__start-rim brass-rim' }, [h('span', { class: 'bcast__start-face' }, [icon('broadcast', { size: 20 }), h('span', { class: 'bcast__start-text', text: 'Start' })])])]);
    const stop = h('button', {
      type: 'button', class: 'bcast__stop', dataset: { hit: '56' }, 'aria-label': `Stop broadcast to ${dest.name}${stopDisabled ? ' (unavailable: not transmitting)' : ''}`,
      'aria-disabled': stopDisabled ? 'true' : undefined, on: { click: () => { if (!stopDisabled) this.emit('mdj:broadcast', { action: 'stop', destination: dest.id }); } },
    }, [h('span', { class: 'bcast__stop-face' }, [icon('stop', { size: 20 }), h('span', { class: 'bcast__stop-text', text: 'Stop' })])]);
    const test = h('button', {
      type: 'button', class: 'btn btn--secondary bcast__test', dataset: { hit: '48' }, 'aria-label': `Test receiver check, ${dest.name}${running ? ' (unavailable while transmitting)' : ''}`, 'aria-disabled': running ? 'true' : undefined,
      on: { click: () => { if (!running) this.emit('mdj:broadcast', { action: 'test', destination: dest.id }); } },
    }, [icon('validate', { size: 16 }), h('span', { class: 'btn-label', text: 'Test receiver' })]);
    const controls = h('div', { class: 'bcast__controls' }, [start, stop, test]);

    this.replaceChildren(head, stateLine, proof, busRow, metrics, details, ...notes, controls);
  }
}
define(MdjBroadcastState);

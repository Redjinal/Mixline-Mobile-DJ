// av/mic — microphone workspace (Document 03 §6–§7, Document 15 §4, FR-030 / FR-022; AV-006).
//
// A shell screen reached through the labelled workspace switcher. Composition: the microphone strip
// (<mdj-mic-strip>: input, gain rail, fixture meter, Mute 56 dp, Monitor, Talkover momentary, Duck with its
// declared threshold / envelope, Send to Master / Broadcast / Recording), the state's deliberate actions,
// then input selection, what each send means, permission (separate in meaning from ParDay voice) and the
// feedback rule explained at routing time.
//
// Honesty: no microphone, permission dialog or engine exists. Levels are fixtures (the embedded meter prints
// its FIXTURE mark); gain changes are shown SENT, then acknowledged by this screen standing in for the
// engine. The mic is never sent to ParDay. A device change applies the route-loss rules before monitoring.
//
// Exercised: Enable microphone → armed; Unmute → live; Mute and disable microphone → off (and the strip's
// own Mute toggles live ↔ armed).
import { register } from '../../app/registry.js';
import { load } from '../../app/fixtures.js';
import { h, button, icon } from '../../components/base.js';
import { avLayout, avStatus, avSection, avNote, avRadios } from './video.js';

const AV = await load('av');
const AVS = await load('av-screens');
const FR = ['FR-030'];

// Prototype view state: the chosen input for off / armed / live.
const view = { input: AVS.mic.armedInput };

const STATES = {
  off: { strip: 'off', input: null, level: 0, assign: '', mute: false, monitor: false, duck: false, gain: 0 },
  'permission-denied': { strip: 'denied', input: 'builtin', level: 0, assign: '', mute: false, monitor: false, duck: false, gain: 0 },
  armed: { strip: 'armed', input: null, level: AVS.mic.levels.armed, assign: 'master,recording', mute: true, monitor: true, duck: false, gain: 0 },
  live: { strip: 'live', input: null, level: AVS.mic.levels.live, assign: 'master,recording', mute: false, monitor: true, duck: true, gain: 3 },
  'feedback-risk': { strip: 'feedback-risk', input: 'builtin', route: 'speaker', level: AVS.mic.levels.feedback, assign: 'master', mute: false, monitor: true, duck: false, gain: 6 },
  'route-changed': { strip: 'route-change', input: 'quadra-in2', route: 'usb-4ch', level: 0, assign: 'master,recording', mute: true, monitor: false, duck: false, gain: 3 },
};

const STATUS = {
  off: ['Off · input closed', 'neutral', 'mic'],
  'permission-denied': ['Permission denied · music unaffected', 'critical', 'lock'],
  armed: ['Armed · muted, ready', 'info', 'mute'],
  live: ['Live · sending', 'critical', 'mic'],
  'feedback-risk': ['Feedback risk · speaker route', 'warning', 'warning'],
  'route-changed': ['Route changed · monitoring off', 'warning', 'route'],
};

const LEAD = {
  off: 'The microphone input is closed. Enabling it opens the input muted; nothing is sent anywhere until you unmute.',
  'permission-denied': 'Microphone permission denied — music playback unaffected. Granting it opens the input only; where the mic goes is still your choice here.',
  armed: 'The input is open and muted. Check the level and your headphone monitor, then unmute when the singer or MC is ready.',
  live: 'The microphone is live on the sends shown. Talkover ducks the music while held; Duck does it automatically above its threshold.',
  'feedback-risk': 'Monitoring is on while the output is the phone speaker: the mic and the speaker share the room. Feedback is likely — fix the route before raising the gain.',
  'route-changed': 'The USB interface changed. Route-loss rules were applied: the input is held closed and monitoring is off until the new route is verified.',
};

function inputFor(state) { return STATES[state].input || view.input; }
function routeFor(state, inputId) {
  if (STATES[state].route) return STATES[state].route;
  return AV.mic.inputs.find((i) => i.id === inputId)?.routeId || 'usb-4ch';
}

function strip(ctx) {
  const st = STATES[ctx.state] || STATES.off;
  const inputId = inputFor(ctx.state);
  const el = h('mdj-mic-strip', {
    input: inputId, route: routeFor(ctx.state, inputId), state: st.strip, level: String(st.level), gain: String(st.gain), assign: st.assign,
    mute: st.mute ? true : null, monitor: st.monitor ? true : null, duck: st.duck ? true : null,
  });
  const flag = (name, on) => (on ? el.setAttribute(name, '') : el.removeAttribute(name));
  el.addEventListener('mdj:mic', (e) => {
    const { control, value, bus } = e.detail || {};
    if (control === 'mute') {
      if (ctx.state === 'armed' && value === false) return ctx.setState('live');
      if (ctx.state === 'live' && value === true) return ctx.setState('armed');
      flag('mute', value);
    } else if (control === 'monitor') {
      flag('monitor', value);
      if (ctx.state === 'feedback-risk' && value === false) { el.setAttribute('state', 'live'); notice.hidden = false; }
    } else if (control === 'duck') flag('duck', value);
    else if (control === 'assign') {
      const cur = (el.getAttribute('assign') || '').split(',').filter(Boolean);
      el.setAttribute('assign', (value ? [...new Set([...cur, bus])] : cur.filter((b) => b !== bus)).join(','));
    } else if (control === 'permission') { notice.hidden = false; notice.querySelector('span').textContent = 'Opening Android settings for microphone permission (outside this app). Music keeps playing.'; }
    else if (control === 'verify-route') ctx.navigate('route/check', { state: 'disconnected' });
  });
  el.addEventListener('mdj:mic-input', () => { const list = el.closest('.av-screen')?.querySelector('.av-inputs [role="radio"][aria-checked="true"]'); list?.focus(); list?.scrollIntoView({ block: 'nearest' }); });
  el.addEventListener('mdj:value', (e) => {
    if (e.detail?.kind !== 'mic-gain' || e.detail.phase !== 'end') return;
    const v = e.detail.value;
    setTimeout(() => { if (!el.isConnected) return; el.setAttribute('gain', String(v)); el.removeAttribute('pending-gain'); }, AVS.mic.gainAckMs);
  });
  const notice = h('p', { class: 'av-inline-alert tone-info', role: 'status', hidden: true }, [icon('check', { size: 16 }), h('span', { class: 'body', text: 'Monitor off — acknowledged (fixture). The feedback loop through the speaker is broken; the mic still reaches the master.' })]);
  return [el, notice];
}

function actions(ctx) {
  switch (ctx.state) {
    case 'off': return [button({ label: 'Enable microphone', icon: 'mic', hit: 56, cls: 'btn--primary av-cta', fr: FR, on: { click: () => ctx.setState('armed') } })];
    case 'armed': return [
      button({ label: 'Unmute', icon: 'mic', hit: 56, cls: 'btn--primary av-cta', fr: FR, on: { click: () => ctx.setState('live') } }),
      button({ label: 'Disable microphone', icon: 'x', hit: 48, cls: 'btn--secondary', fr: FR, on: { click: () => ctx.setState('off') } }),
    ];
    case 'live': return [button({ label: 'Mute and disable microphone', icon: 'mute', hit: 56, cls: 'btn--primary av-cta av-cta--stop', fr: FR, on: { click: () => ctx.setState('off') } })];
    case 'feedback-risk': return [
      button({ label: 'Check output route', icon: 'route', hit: 48, cls: 'btn--primary', fr: ['FR-030', 'FR-022'], on: { click: () => ctx.navigate('route/check', { state: 'speaker' }) } }),
      button({ label: 'Mute and disable microphone', icon: 'mute', hit: 48, cls: 'btn--secondary', fr: FR, on: { click: () => ctx.setState('off') } }),
    ];
    case 'permission-denied': return [];
    case 'route-changed': return [];
    default: return [];
  }
}

function inputs(ctx) {
  const fixed = ['permission-denied', 'route-changed', 'feedback-risk'].includes(ctx.state);
  const why = { 'permission-denied': 'permission denied', 'route-changed': 'verify the new route first', 'feedback-risk': 'fix the output route first' }[ctx.state];
  const current = inputFor(ctx.state);
  const opts = AV.mic.inputs.map((i) => ({ id: i.id, text: i.name, detail: `${i.device} · channel ${i.channel}`, name: `Microphone input: ${i.name}`, disabled: fixed && i.id !== current, why }));
  const group = avRadios({
    label: 'Microphone input', options: opts, value: current, fr: FR, cls: 'av-radios--stack av-inputs',
    onPick: (id) => {
      view.input = id;
      const el = group.closest('.av-screen')?.querySelector('mdj-mic-strip');
      if (el) { el.setAttribute('input', id); el.setAttribute('route', routeFor(ctx.state, id)); }
      for (const b of group.querySelectorAll('[role="radio"]')) { const on = b.dataset.value === id; b.setAttribute('aria-checked', String(on)); b.classList.toggle('av-radio--on', on); }
    },
  });
  return avSection('Input', [group, h('p', { class: 'av-small muted', text: 'Changing the input closes the old one first. Monitoring is re-enabled only after the new route is checked.' })]);
}

function sends() {
  return avSection('Where the mic goes', [
    h('dl', { class: 'av-kv' }, [
      h('dt', { class: 'label', text: 'Master' }), h('dd', { class: 'body', text: 'Into the room mix, after the mic gain and before the limiter.' }),
      h('dt', { class: 'label', text: 'Broadcast' }), h('dd', { class: 'body', text: 'Into the stream only while a broadcast you started is running.' }),
      h('dt', { class: 'label', text: 'Recording' }), h('dd', { class: 'body', text: 'Into the mix recording on this phone.' }),
      h('dt', { class: 'label', text: 'ParDay' }), h('dd', { class: 'body', text: 'Never. Enabling the karaoke or MC mic does not route it to the assistant.' }),
    ]),
  ]);
}

function permission(ctx) {
  const denied = ctx.state === 'permission-denied';
  return avSection('Permission', [
    h('p', { class: 'body' }, [h('span', { class: 'label', text: 'Android microphone permission · ' }), h('strong', { text: denied ? 'Denied' : 'Granted (fixture)' })]),
    h('p', { class: 'av-small muted', text: `${AV.mic.permission.note} ParDay voice has its own separate request, is off in Perform and never hears this input.` }),
  ], { tone: denied ? 'critical' : null });
}

function feedbackRule(ctx) {
  const risk = ctx.state === 'feedback-risk';
  return avSection('Feedback', [
    avNote(risk ? 'Monitor + phone speaker = feedback risk. Monitor on headphones (USB interface outputs 3–4 or a splitter) or turn Monitor off.' : 'Monitoring through headphones is safe. On the phone speaker or a Bluetooth speaker, Monitor shows a feedback warning when you turn it on.', risk ? 'warning' : 'headphones', risk ? 'warning' : null),
    h('p', { class: 'av-small muted', text: `Duck (automatic): ${AV.mic.duck.thresholdDb} dBFS threshold, ${AV.mic.duck.attackMs} ms attack, ${AV.mic.duck.releaseMs} ms release, ${AV.mic.duck.depthDb} dB depth. Talkover stays available as a held button.` }),
  ], { tone: risk ? 'warning' : null });
}

function links(ctx) {
  return h('div', { class: 'av-row' }, [
    button({ label: 'Karaoke queue', icon: 'karaoke', hit: 48, cls: 'btn--ghost', fr: ['FR-046'], on: { click: () => ctx.navigate('av/karaoke') } }),
    button({ label: 'Broadcast buses', icon: 'broadcast', hit: 48, cls: 'btn--ghost', fr: ['FR-046'], on: { click: () => ctx.navigate('av/broadcast') } }),
  ]);
}

function render(ctx) {
  const state = ctx.state in STATES ? ctx.state : 'off';
  const [word, tone, ic] = STATUS[state];
  const main = state === 'permission-denied' ? [permission(ctx), inputs(ctx), sends(), links(ctx)]
    : state === 'feedback-risk' ? [feedbackRule(ctx), inputs(ctx), sends(), permission(ctx), links(ctx)]
      : [inputs(ctx), sends(), feedbackRule(ctx), permission(ctx), links(ctx)];
  return avLayout(ctx, { screen: 'mic', current: 'mic', title: 'Microphone', status: avStatus(word, tone, ic), lead: LEAD[state], hero: strip(ctx), actions: actions(ctx), main });
}

register({
  id: 'av/mic',
  family: 'av',
  title: 'Microphone',
  order: 4,
  fr: ['FR-030', 'FR-022', 'FR-046'],
  shell: true,
  dock: { portrait: true, landscape: true },
  states: {
    off: { label: 'Off — input closed', exercised: true, scenario: 'four-deck', via: { from: 'live', control: 'Mute and disable microphone' } },
    'permission-denied': { label: 'Permission denied — music unaffected', exercised: false, scenario: 'a-playing' },
    armed: { label: 'Armed — open, muted, monitoring on headphones', exercised: true, scenario: 'four-deck', via: { from: 'off', control: 'Enable microphone' } },
    live: { label: 'Live — sending to master and recording', exercised: true, scenario: 'four-deck', via: { from: 'armed', control: 'Unmute' } },
    'feedback-risk': { label: 'Feedback risk — speaker route with mic monitoring', exercised: false, scenario: 'a-playing' },
    'route-changed': { label: 'Route changed — route-loss rules re-applied before monitoring', exercised: false, scenario: 'route-lost' },
  },
  defaultState: 'off',
  render,
});

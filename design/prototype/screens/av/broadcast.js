// av/broadcast — broadcast workspace (Document 03 §7, Document 15 §5, FR-046 / FR-036; AV-007…009).
//
// A shell screen reached through the labelled workspace switcher. Composition: the broadcast state block
// (<mdj-broadcast-state>: destination / account, buses, connection word + shape, fixture metrics, Start /
// Stop 56 dp, Test receiver), a "recording is not broadcasting" strip that sets the shell's REC indicator
// against the broadcast word, then destination and audience, source eligibility for every source that
// reaches the program bus, the test receiver report, the bounded congestion policy and the separate local
// fallback recording option.
//
// Honesty: no encoder, network or receiver exists. Every rate, delay, dropped-frame count, reconnect count,
// acknowledgement and test-receiver report is a fixture (fixtures/av.json + fixtures/av-screens.json) and is
// marked. "Connected" never claims the audience hears the mix. The stream key is only ever shown redacted.
// ParDay can prepare this panel but cannot start transmission; a rehearsal is never published.
//
// The screen stands in for the pipeline in exercised states: Test receiver → private-monitoring; Start →
// connecting; "Fixture: destination acknowledges" → connected (destination acknowledged); Stop → stopped.
import { register } from '../../app/registry.js';
import { load } from '../../app/fixtures.js';
import { h, button, icon, fmt } from '../../components/base.js';
import { avLayout, avStatus, avSection, avNote, avSentButton, avRadios, avDeck } from './video.js';

const AV = await load('av');
const AVS = await load('av-screens');
const FR = ['FR-046', 'FR-036'];

// Prototype view state: destination and bus choice before Start, the fallback-recording switch.
const view = { dest: AV.broadcast.destinations[0].id, buses: ['master', 'mic', 'video'], fallback: false };

const COMPONENT_STATE = {
  setup: 'private', 'private-monitoring': 'private', connecting: 'connecting', connected: 'acknowledged', congested: 'congested',
  'disconnected-reconnecting': 'reconnecting', stopped: 'stopped', 'restricted-source-blocked': 'acknowledged', 'rehearsal-not-published': 'private',
};
const RUNNING = ['connecting', 'connected', 'congested', 'disconnected-reconnecting', 'restricted-source-blocked'];

const STATUS = {
  setup: ['Private · not transmitting', 'neutral', 'lock'],
  'private-monitoring': ['Private monitoring · test receiver', 'info', 'headphones'],
  connecting: ['Connecting · sent', 'info', 'loader'],
  connected: ['On air · destination acknowledged', 'ok', 'broadcast'],
  congested: ['Congested · bitrate reduced', 'warning', 'warning'],
  'disconnected-reconnecting': ['Reconnecting · audience may have a gap', 'warning', 'refresh'],
  stopped: ['Stopped · transmission released', 'neutral', 'stop'],
  'restricted-source-blocked': ['Next track not eligible for broadcast', 'critical', 'blocked'],
  'rehearsal-not-published': ['Rehearsal · nothing is transmitted', 'neutral', 'lock'],
};

const LEAD = {
  setup: 'Nothing leaves this phone until you press Start. Check the destination, what goes out and a test receiver first.',
  'private-monitoring': 'The test receiver heard the selected buses. This is still private: the audience destination has received nothing.',
  connecting: 'Start was sent. The pipeline is opening the connection; nothing is on air until the destination answers.',
  connected: 'The destination acknowledged reception. Connected does not prove the audience hears the right mix — the test receiver report is your evidence.',
  congested: 'The network cannot carry the full profile. The bounded policy reduced video bitrate; latency is not allowed to grow without limit. Room audio is unaffected.',
  'disconnected-reconnecting': 'The connection dropped. Reconnecting within the policy; the audience may have a gap. Local audio continues and nothing is delayed to catch up later.',
  stopped: 'Transmission was released. The room mix kept playing; the receiver confirmed the end of the stream.',
  'restricted-source-blocked': 'Next track not eligible for broadcast — resolve before transition. It may play to the room; it may not be sent to the stream.',
  'rehearsal-not-published': 'Rehearsal is private — nothing is transmitted. Practising a broadcast never publishes it; a real broadcast starts only from the normal panel.',
};

const SCENARIO = 'recording';

function destName(id) { return AV.broadcast.destinations.find((d) => d.id === id)?.name || id; }

function stateBlock(ctx) {
  const state = COMPONENT_STATE[ctx.state] || 'private';
  const attrs = { destination: view.dest, buses: view.buses.join(','), state };
  if (ctx.state === 'restricted-source-blocked') attrs.eligibility = 'Master: next track SODA LIGHTS (Radio Edit) — broadcast unknown, blocked · Microphone: permitted · Program video: authorized local video (fixture)';
  if (ctx.state === 'rehearsal-not-published') attrs.eligibility = 'Rehearsal session — practice only, never published';
  const el = h('mdj-broadcast-state', attrs);
  el.addEventListener('mdj:broadcast', (e) => {
    const a = e.detail?.action;
    if (ctx.state === 'rehearsal-not-published' && a === 'start') { blocked.hidden = false; blocked.focus?.(); return; }
    if (a === 'test') ctx.setState('private-monitoring');
    else if (a === 'start') ctx.setState('connecting');
    else if (a === 'stop') ctx.setState('stopped');
  });
  el.addEventListener('mdj:broadcast-bus', (e) => {
    const { bus, included } = e.detail || {};
    view.buses = included ? [...new Set([...view.buses, bus])] : view.buses.filter((b) => b !== bus);
    el.setAttribute('buses', view.buses.join(','));
  });
  const blocked = h('div', { class: 'av-inline-alert tone-warning', role: 'alert', tabindex: '-1', hidden: true }, [
    icon('lock', { size: 16 }),
    h('span', { class: 'body', text: 'Rehearsal is private. Leave rehearsal to start a real broadcast; the rehearsal itself is never published.' }),
  ]);
  return [el, blocked];
}

function recVsBroadcast(ctx) {
  const r = ctx.session.recording || { state: 'idle' };
  const recWord = r.state === 'recording' ? `Recording ${fmt.time(r.elapsedSec)}` : 'Not recording';
  const running = RUNNING.includes(ctx.state);
  const bWord = { connected: 'On air', 'restricted-source-blocked': 'On air', congested: 'On air · reduced', connecting: 'Connecting', 'disconnected-reconnecting': 'Reconnecting', stopped: 'Ended' }[ctx.state] || 'Private';
  return h('div', { class: 'av-recvs raised', role: 'group', 'aria-label': `Recording indicator: ${recWord}. Broadcast: ${bWord}. A recording indicator is not a broadcast indicator.` }, [
    h('div', { class: 'av-recvs__cell' }, [h('span', { class: 'label', text: 'REC (top bar)' }), h('span', { class: 'av-recvs__word body' }, [icon('rec', { size: 14 }), h('span', { text: recWord })]), h('span', { class: 'av-small muted', text: 'A file on this phone' })]),
    h('div', { class: `av-recvs__cell${running ? ' av-recvs__cell--live' : ''}` }, [h('span', { class: 'label', text: 'Broadcast' }), h('span', { class: 'av-recvs__word body' }, [icon('broadcast', { size: 14 }), h('span', { text: bWord })]), h('span', { class: 'av-small muted', text: running ? 'Leaving this phone' : 'Nothing leaves this phone' })]),
    h('p', { class: 'av-recvs__rule label', text: 'A recording indicator is not a broadcast indicator.' }),
  ]);
}

function destination(ctx) {
  const running = RUNNING.includes(ctx.state);
  const opts = AV.broadcast.destinations.map((d) => ({
    id: d.id, text: d.name, name: `Destination: ${d.name}`, detail: `${d.account} · ${d.protocol} · ${d.profile}${d.testReceiver ? ' · test receiver available' : ' · no test receiver'}`,
    disabled: running, why: 'change the destination after stopping',
  }));
  const group = avRadios({ label: 'Broadcast destination', options: opts, value: view.dest, fr: ['FR-046'], cls: 'av-radios--stack', onPick: (id) => {
    view.dest = id;
    group.closest('.av-screen')?.querySelector('mdj-broadcast-state')?.setAttribute('destination', id);
    for (const b of group.querySelectorAll('[role="radio"]')) { const on = b.dataset.value === id; b.setAttribute('aria-checked', String(on)); b.classList.toggle('av-radio--on', on); }
  } });
  return avSection('Destination and audience', [
    group,
    h('dl', { class: 'av-kv' }, [
      h('dt', { class: 'label', text: 'Audience' }), h('dd', { class: 'body', text: AVS.broadcast.audienceLabel }),
      h('dt', { class: 'label', text: 'Not included' }), h('dd', { class: 'body', text: 'Cue and ParDay speech — excluded by default and not selectable here' }),
    ]),
  ]);
}

function eligibility(ctx) {
  const s = ctx.session;
  const decks = ['A', 'B'].map((L) => s.decks[L]).filter((d) => d?.enabled && d.track);
  const restricted = ctx.fixtures.track(AVS.broadcast.restricted.trackId);
  const rows = decks.map((d) => h('li', { class: `av-elig deck-${d.letter.toLowerCase()}` }, [
    avDeck(d.letter),
    h('span', { class: 'av-elig__title' }, [h('span', { class: 'title wrap-2', text: d.track.title }), h('span', { class: 'av-small muted', text: `Deck ${d.letter} · imported local file` })]),
    h('mdj-chip', { kind: 'capability', label: 'Broadcast', value: 'allowed', size: 'sm' }),
  ]));
  rows.push(h('li', { class: 'av-elig av-elig--next' }, [
    h('span', { class: 'av-deck av-deck--queue', 'aria-hidden': 'true' }, [icon('queue', { size: 14 })]),
    h('span', { class: 'av-elig__title' }, [h('span', { class: 'title wrap-2', text: restricted?.title || 'SODA LIGHTS' }), h('span', { class: 'av-small muted', text: `${AVS.broadcast.restricted.position} · ${restricted?.actualSource || 'download'}` })]),
    h('mdj-chip', { kind: 'capability', label: 'Broadcast', value: 'unknown', size: 'sm' }),
  ]));
  rows.push(h('li', { class: 'av-elig' }, [
    h('span', { class: 'av-deck av-deck--queue', 'aria-hidden': 'true' }, [icon('mic', { size: 14 })]),
    h('span', { class: 'av-elig__title' }, [h('span', { class: 'title', text: 'Microphone' }), h('span', { class: 'av-small muted', text: 'Included only while the Broadcast send in Mic is on' })]),
    h('mdj-chip', { kind: 'capability', label: 'Broadcast', value: 'allowed', size: 'sm' }),
  ]));
  return avSection('Source eligibility', [
    h('ul', { class: 'av-eligs' }, rows),
    h('p', { class: 'av-small muted', text: 'Every source that reaches the program bus is checked. Unknown permission fails closed for the stream only; samples follow the same rule.' }),
  ]);
}

function testReport() {
  const t = AVS.broadcast.testReceiver;
  return avSection(`Test receiver · ${t.checkedAt}`, [
    h('dl', { class: 'av-kv' }, [
      h('dt', { class: 'label', text: 'Heard' }), h('dd', { class: 'body', text: t.heard.join(' · ') }),
      h('dt', { class: 'label', text: 'Absent' }), h('dd', { class: 'body', text: `${t.absent.join(' · ')} (as intended)` }),
      h('dt', { class: 'label', text: 'Video' }), h('dd', { class: 'body', text: t.videoFrames }),
      h('dt', { class: 'label', text: 'Round trip' }), h('dd', { class: 'numeral', text: `${t.roundTripMs} ms` }),
    ]),
    h('p', { class: 'av-small muted', text: t.note }),
  ], { fixture: 'test receiver report' });
}

function fallbackRecording(ctx) {
  const sw = h('button', {
    type: 'button', role: 'switch', class: 'av-switch', 'aria-checked': String(view.fallback), dataset: { hit: '48', fr: 'FR-031 FR-046' },
    'aria-label': 'Local fallback recording during broadcast',
    on: { click: () => { view.fallback = !view.fallback; sw.setAttribute('aria-checked', String(view.fallback)); word.textContent = view.fallback ? 'On' : 'Off'; } },
  }, [
    h('span', { class: 'av-switch__text' }, [h('span', { class: 'title', text: 'Local fallback recording' }), h('span', { class: 'av-small muted', text: AV.broadcast.localFallbackRecording.note })]),
    h('span', { class: 'av-switch__knob', 'aria-hidden': 'true' }),
  ]);
  const word = h('span', { class: 'label', text: view.fallback ? 'On' : 'Off' });
  sw.appendChild(word);
  return avSection('Separate option', [sw, h('button', { type: 'button', class: 'btn btn--ghost', dataset: { hit: '48', fr: 'FR-031' }, on: { click: () => ctx.navigate('rec/panel') } }, [icon('rec', { size: 20 }), h('span', { class: 'btn-label', text: 'Open recorder' })])]);
}

function stateExtras(ctx) {
  switch (ctx.state) {
    case 'connecting':
      return [avSection('Waiting for the destination', [
        h('p', { class: 'body', text: 'The prototype has no network. Use the fixture step below to stand in for the destination’s answer, or Stop to cancel.' }),
        button({ label: 'Fixture: destination acknowledges', icon: 'fixture', hit: 48, cls: 'btn--secondary', fr: ['FR-046'], on: { click: () => ctx.setState('connected') } }),
      ])];
    case 'congested':
      return [avSection('Bounded congestion policy', [
        h('ol', { class: 'av-steps body' }, [
          h('li', { class: 'av-step av-step--done', text: '1 · Reduce video bitrate within 720p30 — applied (fixture)' }),
          h('li', { class: 'av-step', text: '2 · Reduce video frame rate' }),
          h('li', { class: 'av-step', text: '3 · Reconnect' }),
          h('li', { class: 'av-step', text: '4 · Stop with an alert' }),
        ]),
        h('div', { class: 'av-row' }, [
          avSentButton({ label: 'Send audio only', sentText: 'Sent · waiting for the encoder', icon: 'music', hit: 48, cls: 'btn--secondary', fr: ['FR-046'] }),
          avSentButton({ label: 'Reconnect now', sentText: 'Reconnect sent', icon: 'refresh', hit: 48, cls: 'btn--secondary', fr: ['FR-046'] }),
        ]),
      ], { tone: 'warning' })];
    case 'disconnected-reconnecting':
      return [avSection('Network', [
        avNote('Attempt 2 of 5. Each attempt is bounded; after the last one the broadcast stops with an alert. Local fallback recording is not switched on because the stream failed.', 'refresh', 'warning'),
      ], { tone: 'warning' })];
    case 'restricted-source-blocked': {
      const t = ctx.fixtures.track(AVS.broadcast.restricted.trackId);
      return [avSection('Resolve before the transition', [
        h('p', { class: 'title av-strong', text: t?.title || 'SODA LIGHTS' }),
        h('p', { class: 'body', text: AVS.broadcast.restricted.reason }),
        h('p', { class: 'body av-fixture-box' }, [`Starts in about ${fmt.time(AVS.broadcast.restricted.startsInSec)} if nothing changes.`, h('mdj-fixture-mark', { for: 'queue timing', inline: true })]),
        h('div', { class: 'av-choices' }, [
          button({ label: 'Choose another next track', icon: 'library', hit: 56, cls: 'btn--primary', fr: FR, on: { click: () => ctx.navigate('launch/library') } }),
          avSentButton({ label: 'Skip it in the queue', sentText: 'Skip sent · waiting for the queue to confirm', icon: 'chevron-right', hit: 48, cls: 'btn--secondary', fr: FR }),
          avSentButton({ label: 'Mute the stream during that track', sentText: 'Sent · the pipeline confirms the gap before it starts', icon: 'mute', hit: 48, cls: 'btn--secondary', fr: FR }),
        ]),
        h('p', { class: 'av-small muted', text: 'The stream is never sent the restricted track. If nothing is chosen, the stream carries silence and a printed gap for its length.' }),
      ], { tone: 'critical' })];
    }
    case 'stopped':
      return [avSection('After stopping', [
        avNote('The room mix was not muted and the recording on this phone continues independently.', 'music'),
        button({ label: 'Set up another broadcast', icon: 'broadcast', hit: 48, cls: 'btn--secondary', fr: ['FR-046'], on: { click: () => ctx.setState('setup') } }),
      ])];
    case 'rehearsal-not-published':
      return [avSection('Rehearsal', [
        avNote('ParDay and Learning Engine can walk through this panel with you. Nothing here is published, and ParDay can never start a broadcast.', 'lock'),
        button({ label: 'Leave rehearsal', icon: 'chevron-left', hit: 48, cls: 'btn--secondary', fr: ['FR-046'], on: { click: () => ctx.setState('setup') } }),
      ])];
    default:
      return [];
  }
}

function render(ctx) {
  const state = ctx.state in COMPONENT_STATE ? ctx.state : 'setup';
  const [word, tone, ic] = STATUS[state];
  const tested = !['setup', 'rehearsal-not-published'].includes(state);
  const urgent = ['connecting', 'congested', 'disconnected-reconnecting', 'restricted-source-blocked'].includes(state);
  const extras = stateExtras(ctx);
  const main = [
    ...(urgent ? [] : extras),
    tested ? testReport() : null,
    destination(ctx),
    eligibility(ctx),
    state === 'setup' ? avNote(`Test receiver available for ${destName(view.dest)}. Run it before Start: it shows what actually arrives.`, 'validate') : null,
    fallbackRecording(ctx),
  ];
  return avLayout(ctx, {
    screen: 'broadcast', current: 'broadcast', title: 'Broadcast', status: avStatus(word, tone, ic), lead: LEAD[state],
    hero: [...(urgent ? extras : []), recVsBroadcast(ctx), ...stateBlock(ctx)], main,
  });
}

register({
  id: 'av/broadcast',
  family: 'av',
  title: 'Broadcast',
  order: 3,
  fr: ['FR-046', 'FR-036', 'FR-031'],
  shell: true,
  dock: { portrait: true, landscape: true },
  states: {
    setup: { label: 'Setup — destination, buses, eligibility, profile', exercised: true, scenario: SCENARIO },
    'private-monitoring': { label: 'Private monitoring — test receiver report', exercised: true, scenario: SCENARIO, via: { from: 'setup', control: 'Test receiver check, Fixture RTMPS receiver' } },
    connecting: { label: 'Connecting — Start sent', exercised: true, scenario: SCENARIO, via: { from: 'private-monitoring', control: 'Start broadcast to Fixture RTMPS receiver' } },
    connected: { label: 'Connected — destination acknowledged', exercised: true, scenario: SCENARIO, via: { from: 'connecting', control: 'Fixture: destination acknowledges' } },
    congested: { label: 'Congested — bounded policy', exercised: false, scenario: SCENARIO },
    'disconnected-reconnecting': { label: 'Disconnected — reconnecting', exercised: false, scenario: SCENARIO },
    stopped: { label: 'Stopped — transmission released', exercised: true, scenario: SCENARIO, via: { from: 'connected', control: 'Stop broadcast to Fixture RTMPS receiver' } },
    'restricted-source-blocked': { label: 'Restricted source — next track blocked from the stream', exercised: false, scenario: SCENARIO },
    'rehearsal-not-published': { label: 'Rehearsal — nothing is transmitted', exercised: false, scenario: SCENARIO },
  },
  defaultState: 'setup',
  render,
});

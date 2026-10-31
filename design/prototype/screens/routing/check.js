// route/check — the output check before and during a set (Document 19 §3 step 3 "Check output"; Document 03
// §2 "Readiness and routing"; Document 06 AE-07 incl. the route-loss table; Document 05 "Platform and output
// matrix"; FR-022 / FR-023 / FR-042; QA-06 / QA-10).
//
// Composition: a lead statement that names the route and its limit in plain words, the current route
// (<mdj-route-card compact current>), the exact arrangement (<mdj-route-diagram>), master / cue in words with
// the tradeoff, the negotiated format numerals (FIXTURE), the state's next actions and every other route the
// fixture offers, each a 48 dp row that applies that route.
//
// Honesty: no engine and no device exist. Route descriptors come from fixtures/routes.json; "verified" is what
// the app would show after a real channel-map check. The isolation check is drawn as SENT with unknown progress;
// it never reports a pass. Nothing here claims isolated headphones without route evidence: speaker, Bluetooth
// and USB-C stereo say "no cue"; the unknown 6-output device stays blocked until pairs are chosen and checked.
// Route loss (scenario route-lost) shows decks paused and muted, cue NOT rerouted to the speaker, Resume off.
//
// The screen stands in for the engine in exercised states: choosing a route row moves straight to that route's
// acknowledged state; Cancel check returns to the acknowledged four-output route; the splitter swap is shown
// as an acknowledged fixture state ("swapped").
import { register } from '../../app/registry.js';
import { h, button, icon, fmt } from '../../components/base.js';
import { load } from '../../app/fixtures.js';

const data = await load('routing'); // fixtures/routing.json (cached; main.js awaits screen modules)

const QUADRA = 'USB interface — Quadra 4 (fixture)';
const ROUTE_FOR_STATE = { speaker: 'speaker', bluetooth: 'bluetooth', 'usbc-stereo': 'usbc-stereo', splitter: 'splitter', swapped: 'splitter', 'usb-4ch': 'usb-4ch', unsupported: 'unsupported', disconnected: 'disconnected', checking: 'usb-4ch' };
const ROW_ORDER = ['speaker', 'bluetooth', 'usbc-stereo', 'splitter', 'usb-4ch', 'unsupported'];
const KIND_ICON = { builtin: 'speaker', bluetooth: 'bluetooth', usb: 'usb', none: 'route-lost' };

// Plain-language lead, master / cue words and tradeoff per state (Document 03 vocabulary).
const COPY = {
  speaker: {
    title: 'Phone speaker — master only. Not a cue route.',
    body: ['The phone speaker plays the master mix. Cue buttons still select a deck, but nothing is pre-listened: there is no second output for headphones.',
      'Master playback stays available — you can play the prepared set out loud now.'],
    master: 'Stereo, built-in speaker', cue: 'None — Cue selects a deck but does not monitor', tradeoff: 'No pre-listening. Fine for preparation and casual playback.',
  },
  bluetooth: {
    title: 'Bluetooth — master only, delay unknown. Not a scratch or cue route.',
    body: ['Bluetooth adds delay that the app cannot measure here, so beat-matching by ear and scratching will feel late.',
      'Use it for preparation and tolerant playback. Master playback stays available.'],
    master: 'Stereo, over Bluetooth', cue: 'None — no cue route', tradeoff: 'Added delay, unmeasured. Not certified for scratch or cue.',
  },
  'usbc-stereo': {
    title: 'USB-C headphones / DAC — stereo master, no independent cue.',
    body: ['Two channels only: both ears hear the master mix. There is no separate headphone cue on this route.',
      'For pre-listening, use a DJ splitter (mono + mono) or a 4-output USB interface (stereo + stereo).'],
    master: 'Stereo, L + R', cue: 'None — no independent cue', tradeoff: 'No pre-listening.',
  },
  splitter: {
    title: 'DJ splitter — mono master on the left, mono cue on the right.',
    body: ['The one stereo pair is split: the audience gets the master in mono, your headphones get the cue in mono.',
      'If the audience hears the cue, the splitter is wired the other way round — swap the sides.'],
    master: 'Mono, left side', cue: 'Mono, right side', tradeoff: 'Stereo given up for independent cueing.',
  },
  swapped: {
    title: 'DJ splitter — sides swapped: mono master on the right, mono cue on the left.',
    body: ['Swap acknowledged for this route (fixture). Run the cue isolation check so you hear the cue tone in your headphones, not the speakers.',
      'Stereo is still given up; only the sides changed.'],
    master: 'Mono, right side', cue: 'Mono, left side', tradeoff: 'Stereo given up for independent cueing.',
  },
  'usb-4ch': {
    title: 'Quadra 4 — stereo master on 1–2, stereo cue on 3–4.',
    body: ['Four outputs negotiated on one device clock: master and cue are independent stereo pairs.',
      'The channel map is marked checked in the fixture. Run the cue isolation check before the set to confirm it in your own headphones.'],
    master: 'Stereo, outputs 1–2', cue: 'Stereo, outputs 3–4', tradeoff: 'None for cueing. Needs the interface powered and connected.',
  },
  unsupported: {
    title: 'Unknown 6-output USB device — mapping unverified. Playback is blocked on this route.',
    body: ['The device reports six outputs but not which carry master and cue. A device name match is not a channel map.',
      'Choose the master and cue pairs yourself, then run the isolation check. Until it passes, nothing plays on this device.'],
    master: 'Unknown — not verified', cue: 'Unknown — not verified', tradeoff: 'Blocked until the mapping is verified.',
  },
  disconnected: {
    title: 'Output lost — decks paused and muted.',
    body: ['The output device disappeared mid-set. Nothing was rerouted: the cue mix was not sent to the phone speaker, and the master was not moved either.',
      'Resume stays off until a route is reopened and its channels are verified. Reconnect the device, or choose another route below.'],
    master: 'None — muted', cue: 'None — not rerouted', tradeoff: 'Silence until you resume deliberately.',
  },
  checking: {
    title: 'Cue isolation check running on the Quadra 4.',
    body: ['Sent to the engine; not acknowledged yet. Master playback on outputs 1–2 is not interrupted: the tone plays on the cue pair only.',
      'Cancel at any time; the route stays as it was.'],
    master: 'Stereo, outputs 1–2', cue: 'Stereo, outputs 3–4 — under check', tradeoff: 'None for cueing.',
  },
};

register({
  id: 'route/check', family: 'routing', title: 'Route check', order: 1,
  fr: ['FR-022', 'FR-023', 'FR-042'],
  shell: true,
  dock: { portrait: true, landscape: true },
  states: {
    speaker: { label: 'Phone speaker — master only, not a cue route', exercised: true, scenario: 'set-ready', via: { from: 'disconnected', control: 'Phone speaker' } },
    bluetooth: { label: 'Bluetooth — delay unknown, no cue', exercised: false, scenario: 'set-ready' },
    'usbc-stereo': { label: 'USB-C stereo — no independent cue', exercised: true, scenario: 'set-ready', via: { from: 'speaker', control: 'USB-C headphones / DAC' } },
    splitter: { label: 'Split mono — master left, cue right', exercised: true, scenario: 'set-ready', via: { from: 'swapped', control: 'Swap master/cue sides' } },
    swapped: { label: 'Split mono — sides swapped', exercised: true, scenario: 'set-ready', via: { from: 'splitter', control: 'Swap master/cue sides' } },
    'usb-4ch': { label: 'Four outputs — stereo master + stereo cue', exercised: true, scenario: 'set-ready', via: { from: 'checking', control: `Cancel check, ${QUADRA}` } },
    unsupported: { label: 'Unsupported route — mapping unverified', exercised: false, scenario: 'set-ready' },
    disconnected: { label: 'Disconnected — paused and muted, nothing rerouted', exercised: false, scenario: 'route-lost' },
    checking: { label: 'Isolation check running — progress unknown', exercised: true, scenario: 'set-ready', via: { from: 'usb-4ch', control: `Run isolation check, ${QUADRA}` } },
  },
  defaultState: 'speaker',
  render(ctx) {
    const state = ctx.state;
    const routeId = ROUTE_FOR_STATE[state] || 'speaker';
    const route = ctx.fixtures.route(routeId);
    // The shell's route chip reads the same session: show the route this state is about.
    ctx.session.route = route;
    const copy = COPY[state] || COPY.speaker;
    const landscape = ctx.orientation === 'landscape';

    const note = h('p', { class: 'routing-note body', role: 'status', 'aria-live': 'polite' });
    const say = (text) => { note.textContent = text; note.hidden = !text; };
    say('');

    const root = h('div', { class: `routing-check routing-check--${state} routing-check--${ctx.orientation}`, dataset: { state } });

    // ---- lead ----
    const tone = { speaker: 'warning', bluetooth: 'warning', 'usbc-stereo': 'neutral', splitter: 'ok', swapped: 'ok', 'usb-4ch': 'ok', unsupported: 'warning', disconnected: 'critical', checking: 'info' }[state];
    const shape = { speaker: 'half', bluetooth: 'half', 'usbc-stereo': 'half', splitter: 'full', swapped: 'full', 'usb-4ch': 'full', unsupported: 'question', disconnected: 'cross', checking: 'ring' }[state];
    const lead = h('section', { class: `routing-lead raised routing-lead--${tone}`, 'aria-labelledby': 'routing-lead-title' }, [
      h('p', { class: 'routing-eyebrow label' }, [h('span', { class: `routing-shape routing-shape--${shape}`, 'aria-hidden': 'true' }), h('span', { text: state === 'disconnected' ? 'Route lost' : state === 'checking' ? 'Checking' : 'Current output' })]),
      h('h2', { id: 'routing-lead-title', class: 'routing-lead__title title', text: copy.title }),
      ...copy.body.map((t) => h('p', { class: 'routing-lead__body body', text: t })),
    ]);
    if (state === 'disconnected') lead.appendChild(pausedDecks(ctx));
    if (state === 'checking') lead.appendChild(isolationSteps());
    if (['speaker', 'bluetooth', 'usbc-stereo'].includes(state)) lead.appendChild(h('div', { class: 'routing-lead__actions' }, [button({ label: 'Continue with master only', icon: 'play', fr: ['FR-022'], cls: 'btn--primary', on: { click: () => ctx.navigate('perform/ab') } })]));

    // ---- current route card ----
    let card;
    if (state === 'swapped') card = swappedCard(route, () => say(`Isolation check sent for ${route.name}: waiting for the engine to acknowledge. No engine exists in this prototype, so it stays SENT.`));
    else {
      card = h('mdj-route-card', { route: routeId, current: true, compact: true, state: state === 'checking' ? 'checking' : null });
      card.addEventListener('mdj:route-action', (e) => {
        const { action } = e.detail || {};
        if (action === 'isolation-check') {
          if (routeId === 'usb-4ch') ctx.setState('checking');
          else if (routeId === 'unsupported') say(pairs.master && pairs.cue ? `Isolation check sent for master ${pairs.master} and cue ${pairs.cue}: not acknowledged. Playback stays blocked until it passes.` : 'Choose a master pair and a cue pair first; the check runs on the pairs you choose.');
          else say(`Isolation check sent for ${route.name}: waiting for the engine to acknowledge. No engine exists in this prototype, so it stays SENT.`);
        } else if (action === 'cancel-check') ctx.setState('usb-4ch');
        else if (action === 'choose') { const first = root.querySelector('.routing-row__btn'); first?.scrollIntoView({ block: 'nearest' }); first?.focus(); }
      });
    }

    // ---- arrangement: diagram + words ----
    const diagram = state === 'swapped' ? swappedDiagram(route) : h('mdj-route-diagram', { route: routeId });
    const words = h('section', { class: 'routing-panel raised', 'aria-labelledby': 'routing-words-title' }, [
      h('h3', { id: 'routing-words-title', class: 'routing-panel__title label', text: 'Master and cue' }),
      h('dl', { class: 'routing-words' }, [
        wordRow('Master', copy.master), wordRow('Cue', copy.cue), wordRow('Tradeoff', copy.tradeoff),
      ]),
    ]);

    // ---- format numerals (fixture) ----
    const format = formatPanel(route, state);

    // ---- next actions ----
    const pairs = { master: null, cue: null };
    const actions = h('section', { class: 'routing-panel raised routing-actions', 'aria-labelledby': 'routing-actions-title' }, [
      h('h3', { id: 'routing-actions-title', class: 'routing-panel__title label', text: state === 'unsupported' ? 'Choose master and cue pairs' : 'Next' }),
    ]);
    const row = h('div', { class: 'routing-actions__row' });
    if (state === 'splitter' || state === 'swapped') row.appendChild(button({ label: 'Swap master/cue sides', icon: 'split-mono', fr: ['FR-023'], cls: 'btn--primary', on: { click: () => ctx.setState(state === 'splitter' ? 'swapped' : 'splitter') } }));
    if (state === 'unsupported') actions.appendChild(pairPicker(pairs, say));
    if (['splitter', 'swapped', 'usb-4ch'].includes(state)) row.appendChild(button({ label: 'Go to Perform', icon: 'play', fr: ['FR-022'], cls: 'btn--secondary', on: { click: () => ctx.navigate('perform/ab') } }));
    row.appendChild(button({ label: 'Set readiness', icon: 'ready', fr: ['FR-042'], cls: 'btn--secondary', on: { click: () => ctx.navigate('route/readiness') } }));
    actions.appendChild(row);
    actions.appendChild(note);

    // ---- other routes ----
    const others = otherRoutes(ctx, routeId, state);
    const ways = state === 'speaker' ? cueWays(ctx) : null;

    if (landscape) {
      root.append(
        h('div', { class: 'routing-col routing-col--main' }, [lead, card, words]),
        h('div', { class: 'routing-col routing-col--side' }, (state === 'unsupported' ? [actions, diagram, others, format] : [diagram, ways, others, actions, format]).filter(Boolean)),
      );
    } else {
      const order = state === 'unsupported' ? [lead, card, actions, diagram, words, others, format] : [lead, card, diagram, words, ways, others, actions, format];
      root.append(...order.filter(Boolean));
    }
    return root;
  },
});

function wordRow(term, text) {
  return h('div', { class: 'routing-words__row' }, [h('dt', { class: 'label', text: term }), h('dd', { class: 'body', text })]);
}

// Speaker: the three ways to get a cue, as text (the route rows below are the actions).
function cueWays(ctx) {
  return h('section', { class: 'routing-panel raised routing-ways', 'aria-labelledby': 'routing-ways-title' }, [
    h('h3', { id: 'routing-ways-title', class: 'routing-panel__title label', text: 'To pre-listen, add one of' }),
    h('ol', { class: 'routing-ways__list' }, data.cueWays.map((w, i) => h('li', { class: 'routing-ways__item' }, [
      h('span', { class: 'routing-ways__n numeral', 'aria-hidden': 'true', text: String(i + 1) }),
      h('span', { class: 'routing-ways__text body' }, [h('strong', { text: `${w.label}: ` }), w.result]),
    ]))),
  ]);
}

// Route lost: what was kept — decks paused at their positions (fixture scenario).
function pausedDecks(ctx) {
  const decks = Object.values(ctx.session.decks).filter((d) => d.enabled && d.track);
  return h('ul', { class: 'routing-kept', 'aria-label': 'Session kept' }, decks.map((d) => h('li', { class: `routing-kept__deck deck-${d.letter.toLowerCase()}` }, [
    h('span', { class: 'routing-kept__letter numeral', text: d.letter }),
    h('span', { class: 'routing-kept__text body' }, [h('span', { class: 'routing-kept__title truncate', text: d.track.title }), h('span', { class: 'muted', text: ` · paused at ${fmt.time(d.positionSec)} · muted` })]),
  ])));
}

function isolationSteps() {
  const box = h('div', { class: 'routing-iso' }, [
    h('ol', { class: 'routing-iso__steps' }, data.isolation.steps.map((st, i) => h('li', { class: 'body', text: st.text }))),
    h('div', { class: 'routing-iso__progress' }, [
      h('span', { class: 'label', text: 'Progress' }),
      h('span', { class: 'numeral routing-iso__unknown', text: 'unknown' }),
      h('span', { class: 'routing-iso__bar', 'aria-hidden': 'true' }),
      h('mdj-fixture-mark', { for: 'isolation check progress — no engine' }),
    ]),
    h('p', { class: 'body muted routing-iso__note', text: 'The app cannot measure acoustic leakage here. Certified separation is a lab measurement (QA-06), not this check.' }),
  ]);
  return box;
}

function formatPanel(route, state) {
  const ms = route.bufferFrames && route.sampleRate ? ` · ${(route.bufferFrames / route.sampleRate * 1000).toFixed(1)} ms` : '';
  const rows = [
    ['Channels', route.channels ? String(route.channels) : 'none'],
    ['Sample rate', route.sampleRate ? `${(route.sampleRate / 1000).toFixed(1)} kHz` : 'unknown'],
    ['Buffer', route.bufferFrames ? `${route.bufferFrames} frames${ms}` : 'unknown'],
  ];
  if (route.kind === 'bluetooth') rows.push(['Delay', 'unknown — not measurable here']);
  return h('section', { class: 'routing-panel raised routing-format', 'aria-labelledby': 'routing-format-title' }, [
    h('h3', { id: 'routing-format-title', class: 'routing-panel__title label', text: state === 'disconnected' ? 'Last stream' : 'Negotiated format' }),
    h('dl', { class: 'routing-format__grid' }, rows.map(([k, v]) => h('div', { class: 'routing-format__cell' }, [h('dt', { class: 'label', text: k }), h('dd', { class: 'numeral', text: v })]))),
    h('p', { class: 'body muted routing-format__note', text: 'Fixture values. The app reads the negotiated configuration from the opened stream, never the requested one.' }),
    h('mdj-fixture-mark', { for: 'sample rate and buffer — not read from a device' }),
  ]);
}

function statusFor(r) {
  if (r.status === 'unsupported') return { word: 'Unverified · blocked', shape: 'question' };
  if (r.cue === 'none') return { word: (r.kind === 'builtin' || r.kind === 'bluetooth') ? 'Master only' : 'No cue', shape: 'half' };
  return { word: r.channels >= 4 ? 'Stereo master + stereo cue' : 'Mono master + mono cue', shape: 'full' };
}

function otherRoutes(ctx, currentId, state) {
  const lost = state === 'disconnected';
  const list = h('ul', { class: 'routing-rows', role: 'list' });
  for (const id of ROW_ORDER) {
    if (id === currentId) continue;
    const r = ctx.fixtures.route(id);
    if (!r) continue;
    const st = statusFor(r);
    const descId = `routing-row-${id}-desc`;
    list.appendChild(h('li', { class: 'routing-row' }, [
      h('button', {
        type: 'button', class: 'routing-row__btn', dataset: { hit: '48', fr: 'FR-023' }, 'aria-label': r.name, 'aria-describedby': descId,
        on: { click: () => ctx.setState(id) },
      }, [
        h('span', { class: 'routing-row__disc brass-rim', 'aria-hidden': 'true' }, [h('span', { class: 'routing-row__face titanium-radial' }, [icon(KIND_ICON[r.kind] || 'usb', { size: 16 })])]),
        h('span', { class: 'routing-row__text' }, [
          h('span', { class: 'routing-row__name body', text: r.name }),
          h('span', { id: descId, class: 'routing-row__meta' }, [
            h('span', { class: 'routing-row__status label' }, [h('span', { class: `routing-shape routing-shape--${st.shape}`, 'aria-hidden': 'true' }), h('span', { text: st.word })]),
            h('span', { class: 'routing-row__desc body muted', text: r.summary }),
          ]),
        ]),
        h('span', { class: 'routing-row__use label' }, [h('span', { text: 'Use' }), icon('chevron-right', { size: 16 })]),
      ]),
    ]));
  }
  return h('section', { class: 'routing-panel raised routing-others', 'aria-labelledby': 'routing-others-title' }, [
    h('h3', { id: 'routing-others-title', class: 'routing-panel__title label', text: lost ? 'Choose another route' : 'Other routes' }),
    h('p', { class: 'body muted routing-others__note', text: lost ? 'Choosing a route reopens the stream and verifies channels. It does not resume playback.' : 'Fixture devices. Choosing one reopens the stream off-thread and checks the channels before any audio.' }),
    list,
  ]);
}

// Splitter with sides swapped. mdj-route-card / mdj-route-diagram print the descriptor's default wiring
// (left = master), so this state draws its own card and channel legend (componentsMissing: swapped split).
function swappedCard(route, onCheck) {
  return h('section', { class: 'routing-swapcard raised', role: 'group', 'aria-label': `${route.name}, Qualified · sides swapped, current route` }, [
    h('div', { class: 'routing-swapcard__head' }, [
      h('span', { class: 'routing-row__disc brass-rim', 'aria-hidden': 'true' }, [h('span', { class: 'routing-row__face titanium-radial' }, [icon('usb', { size: 18 })])]),
      h('span', { class: 'routing-swapcard__titles' }, [
        h('span', { class: 'title routing-swapcard__name', text: route.name }),
        h('span', { class: 'label routing-swapcard__meta', text: `${route.channels} ch · ${(route.sampleRate / 1000).toFixed(1)} kHz · ${route.bufferFrames} frames` }),
      ]),
      h('span', { class: 'routing-swapcard__flags' }, [
        h('span', { class: 'label routing-swapcard__current', text: 'Current' }),
        h('span', { class: 'label routing-swapcard__status tone-ok' }, [h('span', { class: 'routing-shape routing-shape--full', 'aria-hidden': 'true' }), h('span', { text: 'Sides swapped' })]),
      ]),
    ]),
    h('p', { class: 'body', text: 'Mono master (right) + mono cue (left).' }),
    h('div', { class: 'routing-swapcard__actions' }, [
      h('button', { type: 'button', class: 'btn btn--secondary', dataset: { hit: '48', fr: 'FR-022' }, 'aria-label': `Run isolation check, ${route.name}`, on: { click: onCheck } }, [icon('isolation-check', { size: 16 }), h('span', { class: 'btn-label', text: 'Run isolation check' })]),
    ]),
  ]);
}

function swappedDiagram(route) {
  const rows = [['L', 'cue', 'Cue · mono'], ['R', 'master', 'Master · mono']];
  return h('section', { class: 'routing-swapdiagram raised', role: 'img', 'aria-label': `Route diagram: phone to DJ splitter, sides swapped; left carries the cue in mono, right carries the master in mono. Diagram, not a measurement.` }, [
    h('div', { class: 'routing-swapdiagram__head' }, [
      h('span', { class: 'label', text: route.name }),
      h('span', { class: 'label routing-swapdiagram__disc', text: 'Diagram, not a measurement' }),
    ]),
    h('div', { class: 'routing-swapdiagram__chain', 'aria-hidden': 'true' }, [
      h('span', { class: 'routing-swapdiagram__node', text: 'Phone' }),
      h('span', { class: 'routing-swapdiagram__wire' }),
      h('span', { class: 'routing-swapdiagram__node routing-swapdiagram__node--dev', text: 'DJ splitter' }),
      h('span', { class: 'routing-swapdiagram__wire' }),
      h('span', { class: 'routing-swapdiagram__jacks' }, rows.map(([ch, bus, text]) => h('span', { class: `routing-swapdiagram__jack routing-swapdiagram__jack--${bus}` }, [
        h('span', { class: 'numeral routing-swapdiagram__ch', text: ch }), h('span', { class: 'routing-swapdiagram__bus', text }),
      ]))),
    ]),
    h('p', { class: 'body routing-swapdiagram__tradeoff', text: 'Mono master + mono cue · sides swapped to match the cable' }),
  ]);
}

// Unsupported device: choose master and cue pairs by hand (radio groups, 48 dp). Local selection only;
// it is not a verified map and playback stays blocked.
function pairPicker(pairs, say) {
  const PAIRS = ['1–2', '3–4', '5–6'];
  const box = h('div', { class: 'routing-pairs' });
  const status = h('p', { class: 'body routing-pairs__status', role: 'status' });
  const draw = () => {
    box.replaceChildren(
      ...['master', 'cue'].map((bus) => h('div', { class: 'routing-pairs__group', role: 'radiogroup', 'aria-label': bus === 'master' ? 'Master pair' : 'Cue pair' }, [
        h('span', { class: 'label routing-pairs__label', text: bus === 'master' ? 'Master pair' : 'Cue pair' }),
        h('span', { class: 'routing-pairs__opts' }, PAIRS.map((p) => {
          const other = bus === 'master' ? pairs.cue : pairs.master;
          const taken = other === p;
          return h('button', {
            type: 'button', role: 'radio', class: `btn btn--secondary routing-pairs__opt${pairs[bus] === p ? ' is-on' : ''}`, dataset: { hit: '48', fr: 'FR-023' },
            'aria-checked': String(pairs[bus] === p), 'aria-disabled': taken ? 'true' : null,
            'aria-label': `${bus === 'master' ? 'Master' : 'Cue'} on outputs ${p}${taken ? ' (unavailable: used by the other bus)' : ''}`,
            on: { click: () => { if (taken) return; pairs[bus] = p; say(''); draw(); } },
          }, [h('span', { class: 'numeral', text: p })]);
        })),
      ])),
      status,
    );
    status.textContent = pairs.master && pairs.cue
      ? `Chosen: master ${pairs.master}, cue ${pairs.cue}. Not verified — run the isolation check; playback stays blocked until it passes.`
      : 'No pairs chosen. The device did not say which outputs carry master and cue.';
  };
  draw();
  return box;
}

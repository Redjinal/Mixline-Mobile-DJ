// parday/perform — the compact ParDay panel inside the performance shell (Document 03 §6; Document 13
// "Authority and live-session behavior", "Engine-owned execution and cancellation", worked example P42;
// FR-048, FR-032; AI-005 read/propose until armed, AI-007 stale-state protection, AI-009 manual takeover,
// AI-011 accurate completion state).
//
// Owner option C: ParDay reads and proposes until a specific bounded plan is armed, and manual takeover is
// immediate. The shell keeps transport, crossfader, route and master reachable; this panel never covers the
// dock. The persistent Stop automation control sits in the same place in every state (top of the panel in
// portrait, top of the left rail in landscape) and is never hidden while a plan is armed or running.
//
// No model, planner or engine exists. Proposals, plan bindings, countdowns, frames and acknowledgements come
// from fixtures/parday.json (read-only) and fixtures/parday-screens.json; every box that prints them carries
// a FIXTURE mark. This screen stands in for the engine: a pending action shows SENT first and moves to the
// acknowledged state the fixture declares. Controls labelled "Fixture: …" stand in for events the engine
// or a physical touch would cause (the plan starting, the DJ's finger on the crossfader); they are labelled
// as such and are not product controls.
//
// Also exports the small helpers parday/prepare and parday/arm share (one copy, this family only).
import { register } from '../../app/registry.js';
import { load } from '../../app/fixtures.js';
import { h, button, icon } from '../../components/base.js';
import { iconId } from '../../components/mdj-marker.js';
import { pardayFixture, trackTitle, secText, mmss, groupDigits } from '../../components/mdj-provenance-tag.js';
import { PARDAY_STATES } from '../../components/mdj-parday-button.js';

export const PD = await load('parday');
export const PS = await load('parday-screens');
// Prime the component family's own parday.json cache so cards, messages and the arm panel draw their content
// on the first render (and the named buttons exist when a reviewer clicks through). Capped at 3 s.
await new Promise((resolve) => {
  const t0 = Date.now();
  const tick = () => (pardayFixture(null) || Date.now() - t0 > 3000 ? resolve() : setTimeout(tick, 15));
  tick();
});

export const PLAN = PD.plans.P42;
const FR = ['FR-048', 'FR-032'];

// ---------- shared helpers (parday family) ----------

// The acknowledged ParDay state as a word + icon + tone pill (never colour alone).
export function statePill(stateKey, extra = '') {
  const def = PARDAY_STATES[stateKey] || PARDAY_STATES.ready;
  return h('span', { class: `parday-pill tone-${def.tone} label`, role: 'status' }, [
    icon(iconId(def.icon[0], def.icon[1]), { size: 14 }),
    h('span', { text: extra ? `${def.text} · ${extra}` : def.text }),
  ]);
}

// A control that stands in for an engine event or a physical touch. Visibly a fixture control (dashed, mono
// caption outside the button so the accessible name stays exactly the label).
export function fixtureControl(label, onClick, caption) {
  return h('div', { class: 'parday-fixturectl' }, [
    h('span', { class: 'parday-fixturectl__cap label', text: caption || 'Prototype only — stands in for the engine' }),
    button({ label, icon: iconId('fixture', 'info'), hit: 48, cls: 'parday-fixturectl__btn', fr: FR, on: { click: onClick } }),
  ]);
}

// Stand in for the engine/store: show the pending (SENT) look first, then acknowledge — but only if the
// reviewer is still on the same screen and state.
export function ackLater(ctx, next, ms = 550) {
  setTimeout(() => {
    const c = window.mdj?.current;
    if (c && c.id === ctx.screen.id && c.state === ctx.state) next();
  }, ms);
}

// A one-line live status region the screen fills when a request has no fixture answer.
export function statusLine() {
  return h('p', { class: 'parday-statusline body', role: 'status', 'aria-live': 'polite' });
}
export function say(line, text, iconName = 'info') {
  if (!line) return;
  line.replaceChildren(icon(iconId(iconName, 'info'), { size: 16 }), h('span', { text }));
  line.classList.add('parday-statusline--on');
}

export function deckLetter(letter) {
  return h('span', { class: `parday-deck deck-${letter.toLowerCase()} numeral`, text: letter, 'aria-label': `Deck ${letter}` });
}

export function section(title, children, { cls = '', fixtureFor = null, tone = null } = {}) {
  const box = h('section', { class: `parday-section ink-backing${tone ? ` parday-section--${tone}` : ''} ${cls}`.trim(), 'aria-label': title }, [
    h('h3', { class: 'parday-section__title label', text: title }),
    ...[].concat(children).filter(Boolean),
  ]);
  if (fixtureFor) { box.classList.add('parday-fixture-box'); box.appendChild(h('mdj-fixture-mark', { for: fixtureFor })); }
  return box;
}

export function notice(tone, iconName, strong, text, extra = []) {
  return h('div', { class: `parday-notice tone-${tone}`, role: 'status' }, [
    icon(iconName, { size: 18 }),
    h('div', { class: 'parday-notice__body' }, [h('p', { class: 'body' }, [strong ? h('strong', { text: `${strong} ` }) : null, text]), ...extra]),
  ]);
}

export function remainsList(items) {
  return h('ul', { class: 'parday-remains body' }, items.map((r) => h('li', { text: r })));
}

// Put the shell's world in line with the P42 fixture (route, deck positions, crossfader, ParDay button state).
// ctx.session is a fresh hydrated copy per render; the shell reads the same object.
export function liveWorld(ctx, phase, pardayState, crossfader = null) {
  const s = ctx.session;
  // P42's context names a USB route with an isolated cue; routes.json's matching route is the 4-output interface.
  const usb = ctx.fixtures.route('usb-4ch');
  if (usb) s.route = usb;
  const A = s.decks.A, B = s.decks.B;
  const place = (d, sec) => { d.positionSec = sec; d.remainingSec = d.track ? Math.max(0, d.track.durationSec - sec) : 0; };
  if (phase === 'before') {
    A.state = 'playing'; place(A, 252); B.state = 'paused'; place(B, 15.48); B.cueSelected = true; A.cueSelected = false;
  } else if (phase === 'running') {
    A.state = 'playing'; place(A, 321.3); B.state = 'playing'; place(B, 27.1); B.cueSelected = false; s.crossfader = 0.38;
  } else if (phase === 'after') {
    A.state = 'playing'; place(A, 321.6); B.state = 'playing'; place(B, 27.4); B.cueSelected = false; s.crossfader = crossfader ?? 0.38;
  }
  s.parday = { ...(s.parday || {}), state: pardayState };
}

const bindText = (b, overrides = {}) => {
  const gens = { ...b.deckGenerations, ...(overrides.gens || {}) };
  return `epoch ${b.streamEpoch} · ${Object.entries(gens).map(([d, g]) => `${d} gen ${g}`).join(' · ')} · master rev ${b.masterControlRevision}`;
};

// What ParDay reads right now (read level): decks, route, bound revisions. Measured provenance; fixture values.
function readContext(ctx, { staleB = false } = {}) {
  const s = ctx.session;
  const A = s.decks.A, B = s.decks.B;
  const row = (lead, main, sub, prov = 'measured') => h('li', { class: 'parday-read__row' }, [
    lead,
    h('span', { class: 'parday-read__text' }, [h('span', { class: 'parday-read__main title', text: main }), h('span', { class: 'parday-read__sub numeral', text: sub })]),
    h('mdj-provenance-tag', { kind: prov, size: 'sm' }),
  ]);
  const deckSub = (d) => {
    if (!d.track) return 'empty';
    const where = d.state === 'playing' ? `playing ${secText(d.positionSec)}` : d.cueSelected ? `cued at Drums ${secText(d.positionSec)}` : `paused ${secText(d.positionSec)}`;
    return `${where} · ${d.track.bpm.toFixed(1)} BPM · ${d.track.key}`;
  };
  const routeIcon = h('span', { class: 'parday-read__glyph', 'aria-hidden': 'true' }, [icon('route', { size: 16 })]);
  const revIcon = h('span', { class: 'parday-read__glyph', 'aria-hidden': 'true' }, [icon(iconId('history', 'clock'), { size: 16 })]);
  const list = h('ul', { class: 'parday-read' }, [
    row(deckLetter('A'), A.track ? A.track.title : 'Deck A empty', deckSub(A)),
    row(deckLetter('B'), B.track ? B.track.title : 'Deck B empty', staleB ? `reloaded 21:20:31 · ${deckSub(B)}` : deckSub(B)),
    row(routeIcon, s.route?.name || 'Route', s.route?.cue && s.route.cue !== 'none' ? `master ${s.route.master} · cue ${s.route.cue} · cue isolated` : 'no isolated cue'),
    row(revIcon, 'Bound revisions', bindText(PLAN.bindings, staleB ? { gens: { B: 6 } } : {})),
  ]);
  return section('ParDay reads — no audio, no changes', [list], { cls: 'parday-readbox', fixtureFor: 'session snapshot: positions and revisions' });
}

function authorityNote(kind) {
  if (kind === 'armed') return notice('warning', iconId('arm', 'arm'), 'Armed:', 'P42 runs inside its limits without further prompts. Touching the crossfader, either channel fader, B’s tempo or B’s low EQ cancels it at once; so does Stop automation.');
  if (kind === 'running') return notice('warning', iconId('automix', 'arm'), 'Running:', 'the engine is executing P42 against its own clock. Your hands win: any touch on an affected control or Stop automation cancels the remaining events; faders hold where they are.');
  return notice('info', 'lock', 'Read / propose.', 'ParDay cannot play anything until you arm a plan. Arming names the decks, bars, limits and expiry; it is never standing permission.');
}

// Bound plan summary (perform armed / executing). Local composition from the P42 plan fixture.
function planSummary(phase) {
  const A = PLAN.from, B = PLAN.to;
  const st = PLAN.states[phase === 'running' ? 'executing' : 'armed'];
  const cell = (side, role, which) => h('div', { class: 'parday-plan__cell' }, [
    h('span', { class: 'label', text: role }),
    h('span', { class: 'parday-plan__deckline' }, [deckLetter(side.deck), h('span', { class: 'title parday-plan__title', text: trackTitle(side.trackId) })]),
    h('span', { class: 'parday-plan__marker body' }, [`${which} marker · ${side.marker.name} `, h('span', { class: 'numeral', text: `${secText(side.marker.sec)} · bar ${side.marker.bar}` })]),
  ]);
  const route = h('div', { class: 'parday-plan__route', 'aria-label': `P42: deck ${A.deck} ${trackTitle(A.trackId)} to deck ${B.deck} ${trackTitle(B.trackId)}, ${PLAN.bars} bars` }, [
    cell(A, 'Outgoing', 'Exit'),
    h('span', { class: 'parday-plan__arrow numeral', 'aria-hidden': 'true' }, [h('span', { text: `${PLAN.bars} bars` }), icon('chevron-right', { size: 18 }), h('span', { text: `≈ ${PLAN.durationSec.toFixed(1)} s` })]),
    cell(B, 'Incoming', 'Intro'),
  ]);
  const env = PLAN.tempoEnvelope;
  const dl = h('dl', { class: 'parday-plan__facts' });
  const fact = (t, children) => dl.appendChild(h('div', { class: 'parday-plan__fact' }, [h('dt', { class: 'label', text: t }), h('dd', { class: 'body' }, children)]));
  if (phase === 'running') {
    const frac = st.frame / st.totalFrames;
    const prog = h('div', { class: 'parday-plan__progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': PLAN.bars, 'aria-valuenow': st.bar, 'aria-valuetext': `bar ${st.bar} of ${PLAN.bars}, engine frame ${groupDigits(st.frame)} of ${groupDigits(st.totalFrames)}, fixture value` }, [
      h('span', { class: 'parday-plan__track sunken', 'aria-hidden': 'true' }, [
        h('span', { class: 'parday-plan__fill', style: { width: `${frac * 100}%` } }),
        ...Array.from({ length: PLAN.bars - 1 }, (_, i) => h('span', { class: 'parday-plan__tick', style: { left: `${((i + 1) / PLAN.bars) * 100}%` } })),
      ]),
      h('span', { class: 'parday-plan__ptext numeral', text: `Bar ${st.bar} of ${PLAN.bars} · engine frame ${groupDigits(st.frame)} of ${groupDigits(st.totalFrames)}` }),
    ]);
    fact('Started', [h('span', { class: 'numeral', text: st.startedAt }), ` · crossfader at `, h('span', { class: 'numeral', text: `${Math.round(st.crossfader * 100)} % B` }), ' (engine-driven)']);
    fact('Limits', [`B `, h('span', { class: 'numeral', text: `${env.minBpm.toFixed(1)}–${env.maxBpm.toFixed(1)} BPM` }), ` · master ≤ `, h('span', { class: 'numeral', text: `${PLAN.gainCeiling.masterDbfs.toFixed(1)} dBFS` })]);
    fact('Bound to', [h('span', { class: 'numeral', text: `${bindText(PLAN.bindings)} · automation 7 rev 2` })]);
    const box = h('section', { class: 'parday-plan parday-plan--running titanium parday-fixture-box', 'aria-label': 'P42 running' }, [
      h('header', { class: 'parday-plan__head' }, [h('span', { class: 'label parday-plan__kind', text: 'Bound plan · running' }), h('span', { class: 'parday-plan__id numeral', text: 'P42' })]),
      route, prog, dl,
      h('p', { class: 'parday-plan__note body muted', text: 'Progress follows the engine clock, not this drawing. Bar and frame values are fixtures.' }),
      h('mdj-fixture-mark', { for: 'plan progress: bar and engine frames' }),
    ]);
    return box;
  }
  fact('Starts', [PLAN.startCondition]);
  fact('Expires', [h('span', { class: 'numeral', text: PLAN.expiresAt }), ' · ', h('span', { class: 'numeral', text: `${mmss(PLAN.remainingSec)} remaining` })]);
  fact('Limits', [`B `, h('span', { class: 'numeral', text: `${env.minBpm.toFixed(1)}–${env.maxBpm.toFixed(1)} BPM` }), ` (±${env.tolerancePct} %) · master ≤ `, h('span', { class: 'numeral', text: `${PLAN.gainCeiling.masterDbfs.toFixed(1)} dBFS` }), ' · no key change']);
  fact('Engine', [h('span', { class: 'numeral', text: st.text })]);
  fact('Bound to', [h('span', { class: 'numeral', text: bindText(PLAN.bindings) })]);
  return h('section', { class: 'parday-plan parday-plan--armed titanium parday-fixture-box', 'aria-label': 'P42 armed' }, [
    h('header', { class: 'parday-plan__head' }, [h('span', { class: 'label parday-plan__kind', text: 'Bound plan · waiting for Exit' }), h('span', { class: 'parday-plan__id numeral', text: 'P42' })]),
    route, dl,
    h('mdj-fixture-mark', { for: 'armed plan: countdown and engine acknowledgement' }),
  ]);
}

const PERFORM_ACTIONS = PD.quickActions.filter((a) => ['next-track', 'explain-route', 'practice-transition'].includes(a.id));

function askArea(ctx, line, { qState = 'idle', iState = 'idle', reason = '' } = {}) {
  const quick = h('mdj-parday-quick-actions', { state: qState, actions: JSON.stringify(PERFORM_ACTIONS), reason: reason || null });
  quick.addEventListener('mdj:parday-quick', (e) => say(line, `“${e.detail.label}” — ${PS.perform.sentNoFixture}`, 'arrow-up'));
  const input = h('mdj-parday-input', { mode: 'perform', state: iState, reason: reason || null });
  input.addEventListener('mdj:parday-send', () => say(line, PS.perform.sentNoFixture, 'arrow-up'));
  input.addEventListener('mdj:parday-voice', () => say(line, 'Voice is off in Perform. It needs a separate microphone permission and an explicit start; spoken replies never go to the master. Typing and the buttons do everything voice would.', 'mic'));
  return section('Ask ParDay', [quick, input], { cls: 'parday-ask' });
}

// ---------- states ----------
const STATES = {
  'read-propose':        { label: 'Read / propose — transition proposal P42', exercised: true, scenario: 'a-playing', via: { from: 'parday/arm:review', control: 'Back to ParDay' } },
  'proposal-transition': { label: 'Proposal — previewing on headphones', exercised: true, scenario: 'a-playing', via: { from: 'read-propose', control: 'Preview — proposal P42, deck A to deck B' } },
  'stale-after-reload':  { label: 'Needs review — Deck B reloaded (stale proposal)', exercised: false, scenario: 'a-playing' },
  armed:                 { label: 'Armed — bound plan, Stop automation', exercised: true, scenario: 'a-playing', via: { from: 'parday/arm:armed', control: 'Back to ParDay' } },
  executing:             { label: 'Executing — fixture progress against engine frames', exercised: true, scenario: 'transition', via: { from: 'armed', control: 'Fixture: plan starts' } },
  'takeover-cancelled':  { label: 'Manual takeover — crossfader touched, plan cancelled', exercised: true, scenario: 'transition', via: { from: 'executing', control: 'Fixture: touch the crossfader' } },
  stopped:               { label: 'Stop automation — acknowledged, faders hold', exercised: true, scenario: 'transition', via: { from: 'executing', control: 'Stop automation — P42 running' } },
  unavailable:           { label: 'Unavailable — paused under thermal pressure', exercised: false, scenario: 'hot' },
};

function stopControl(ctx, phase) {
  const st = phase === 'armed' ? 'armed' : phase === 'running' ? 'executing' : 'idle';
  const el = h('mdj-stop-automation', { state: st, plan: st === 'idle' ? null : 'P42', count: st === 'idle' ? 0 : 1 });
  el.addEventListener('mdj:stop-automation', () => {
    if (st === 'idle') { say(ctx._line, 'Nothing to stop — no ParDay plan is armed or running. Your controls are unchanged.', 'check'); return; }
    el.setAttribute('sent', '');
    if (st === 'armed') ackLater(ctx, () => ctx.navigate('parday/arm', { state: 'cancelled' }));
    else ackLater(ctx, () => ctx.setState('stopped'));
  });
  return h('div', { class: 'parday-stop' }, [el]);
}

// Panel header: back (left, Android convention) · ParDay mark · title · acknowledged state pill.
export function pardayHead({ backLabel, backName, onBack, title, pill }) {
  return h('header', { class: 'parday-phead' }, [
    button({ label: backLabel, icon: 'chevron-left', hit: 48, cls: 'btn--ghost parday-phead__back', fr: ['FR-048'], attrs: backName ? { 'aria-label': backName } : {}, on: { click: onBack } }),
    h('div', { class: 'parday-phead__name' }, [
      h('span', { class: 'parday-phead__glyph brass-rim', 'aria-hidden': 'true' }, [h('span', { class: 'parday-phead__face titanium-radial' }, [icon('parday', { size: 16 })])]),
      h('h2', { class: 'title parday-phead__title', text: title }),
    ]),
    pill,
  ]);
}
function head(ctx, pill) {
  return pardayHead({ backLabel: 'Decks', backName: 'Back to decks', onBack: () => ctx.navigate('perform/ab'), title: 'ParDay', pill });
}

function proposalCard(ctx, state) {
  const card = h('mdj-parday-card', { proposal: 'P42', state, compact: ctx.orientation === 'landscape' ? true : null });
  card.addEventListener('mdj:parday-action', (e) => {
    const a = e.detail.action;
    if (a === 'preview') ctx.setState(ctx.state === 'proposal-transition' ? 'read-propose' : 'proposal-transition');
    else if (a === 'arm') { card.setAttribute('sent', 'arm'); ackLater(ctx, () => ctx.navigate('parday/arm', { state: 'review' }), 350); }
    else if (a === 'review' || a === 'refresh') { card.setAttribute('sent', a); ackLater(ctx, () => ctx.setState('read-propose')); }
    else if (a === 'dismiss') ctx.navigate('perform/ab');
  });
  return card;
}

function render(ctx) {
  const state = ctx.state;
  const line = statusLine();
  ctx._line = line;
  const parts = { rail: [], main: [], context: [] };
  let pill;

  if (state === 'read-propose' || state === 'proposal-transition') {
    liveWorld(ctx, 'before', 'proposal_ready');
    pill = statePill('proposal_ready', 'P42');
    parts.rail.push(stopControl(ctx, 'idle'), authorityNote('read'));
    parts.context.push(readContext(ctx));
    if (state === 'proposal-transition') {
      parts.main.push(h('div', { class: 'parday-preview ink-backing parday-fixture-box', role: 'status' }, [
        h('span', { class: 'parday-preview__glyph', 'aria-hidden': 'true' }, [icon(iconId('preview', 'headphones'), { size: 20 })]),
        h('div', { class: 'parday-preview__text' }, [
          h('p', { class: 'label', text: `Preview on cue · ${ctx.session.route?.name || 'cue route'}` }),
          h('p', { class: 'body', text: PS.perform.preview.text }),
        ]),
        button({ label: 'Stop preview', icon: 'stop', hit: 48, cls: 'btn--secondary', fr: ['FR-048'], on: { click: () => ctx.setState('read-propose') } }),
        h('mdj-fixture-mark', { for: 'cue preview (no audio)' }),
      ]));
    }
    parts.main.push(proposalCard(ctx, 'proposed'), askArea(ctx, line));
  } else if (state === 'stale-after-reload') {
    liveWorld(ctx, 'before', 'needs_review');
    pill = statePill('needs_review', 'P42');
    parts.rail.push(stopControl(ctx, 'idle'), notice('warning', 'warning', 'Deck B was reloaded.', 'P42 was bound to Deck B generation 5; Deck B is now generation 6. The proposal still describes the version you saw and will not retarget the new load. Review it again before arming.'));
    parts.context.push(readContext(ctx, { staleB: true }));
    parts.main.push(proposalCard(ctx, 'stale'), askArea(ctx, line));
  } else if (state === 'armed') {
    liveWorld(ctx, 'before', 'armed');
    pill = statePill('armed', 'P42');
    parts.rail.push(stopControl(ctx, 'armed'), authorityNote('armed'));
    parts.main.push(planSummary('armed'), h('div', { class: 'parday-row' }, [
      button({ label: 'Arm details', icon: iconId('automix', 'arm'), hit: 48, cls: 'btn--secondary', fr: FR, on: { click: () => ctx.navigate('parday/arm', { state: 'armed' }) } }),
    ]), fixtureControl('Fixture: plan starts', () => ctx.setState('executing'), 'Prototype only — stands in for Deck A reaching Exit'));
  } else if (state === 'executing') {
    liveWorld(ctx, 'running', 'armed');
    pill = statePill('armed', 'running');
    parts.rail.push(stopControl(ctx, 'running'), authorityNote('running'));
    parts.main.push(planSummary('running'), fixtureControl('Fixture: touch the crossfader', () => ctx.setState('takeover-cancelled'), 'Prototype only — stands in for your finger on the dock crossfader'));
  } else if (state === 'takeover-cancelled') {
    liveWorld(ctx, 'after', 'ready');
    pill = statePill('ready', 'P42 cancelled');
    const c = PLAN.states.cancelled;
    parts.rail.push(stopControl(ctx, 'idle'), h('div', { class: 'parday-takeover', role: 'status' }, [
      h('span', { class: 'parday-takeover__glyph', 'aria-hidden': 'true' }, [icon(iconId('takeover', 'hand'), { size: 22 })]),
      h('p', { class: 'parday-takeover__text body' }, [
        h('strong', { text: 'You touched the crossfader — plan cancelled at engine frame ' }), h('strong', { class: 'numeral', text: groupDigits(c.effectiveFrame) }), h('strong', { text: '.' }),
        ' Faders stay where they are; already heard audio cannot be undone. You have the mix.',
      ]),
    ]));
    const panel = h('mdj-parday-arm-panel', { plan: 'P42', state: 'cancelled' });
    panel.addEventListener('mdj:parday-arm', (e) => {
      if (e.detail.action === 'refresh') say(line, PS.perform.refreshSent, 'refresh');
      else if (e.detail.action === 'dismiss') ctx.navigate('perform/ab');
    });
    parts.main.push(panel);
  } else if (state === 'stopped') {
    liveWorld(ctx, 'after', 'ready', 0.37);
    const sp = PS.perform.stopped;
    pill = statePill('ready', 'P42 stopped');
    parts.rail.push(stopControl(ctx, 'idle'), notice('neutral', iconId('stop-automation', 'stop'), 'Stopped.', sp.text));
    parts.main.push(section('What remains applied', [
      remainsList(sp.remains),
      h('p', { class: 'body muted', text: 'Anything already heard stays heard; recovery is a new controlled action, not an undo. P42 will not resume or retry by itself.' }),
    ], { fixtureFor: 'cancellation frame and held values' }));
  } else {
    // unavailable (hot scenario)
    const t = PS.prepare.thermal;
    ctx.session.parday = { ...(ctx.session.parday || {}), state: 'unavailable' };
    pill = statePill('unavailable');
    parts.rail.push(stopControl(ctx, 'idle'), notice('critical', 'thermal', t.headline, 'Transport, faders, routing and recording are unaffected; nothing ParDay proposed is armed or will run.'));
    parts.main.push(proposalCard(ctx, 'unavailable'), askArea(ctx, line, { qState: 'disabled', iState: 'disabled', reason: 'Paused under thermal pressure — ParDay resumes when the phone cools. Every manual control keeps working.' }));
  }

  // Portrait reads top-down: header, Stop automation, authority, the proposal or plan, then the read context.
  // Landscape keeps header, Stop automation, authority and read context in the fixed left rail.
  const landscape = ctx.orientation === 'landscape';
  const root = h('div', { class: `parday-perform parday-perform--${state}`, dataset: { orientation: ctx.orientation } }, [
    h('div', { class: 'parday-perform__rail' }, [head(ctx, pill), ...parts.rail, ...(landscape ? parts.context : [])]),
    h('div', { class: 'parday-perform__main' }, [...parts.main, ...(landscape ? [] : parts.context), line]),
  ]);
  return root;
}

register({
  id: 'parday/perform',
  family: 'parday',
  title: 'ParDay — Perform panel',
  order: 2,
  fr: ['FR-048', 'FR-032', 'FR-036'],
  shell: true,
  dock: { portrait: true, landscape: true },
  states: STATES,
  defaultState: 'read-propose',
  render,
});

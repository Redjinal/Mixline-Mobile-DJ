// parday/prepare — ParDay in Prepare: a full-height conversation with structured proposal cards (Document 03
// §6 "Prepare may use a full-height conversation and structured proposal cards"; Document 13 "Authority and
// live-session behavior", "Tool contracts and proposal lifecycle", "Privacy, source provenance", "Offline
// operation, credentials and cost"; FR-048, FR-005 crates, FR-036 source provenance, FR-040 cloud disclosure;
// AI-007 stale state, AI-011 accurate completion, AI-022 timely cancellation).
//
// Not a shell screen (preparation-type). Typed and touch input only; voice is visibly off. "Build a 30-minute
// crate" authorises a reversible crate save only after Apply to preparation; the saved crate has Undo. Nothing
// here is audible. Proposals, messages, revisions and costs are fixtures (fixtures/parday.json, read-only, and
// fixtures/parday-screens.json); cards and messages carry their own FIXTURE marks. This screen stands in for
// the model and the store: a pending action shows SENT, then the acknowledged state the fixture declares.
// "Fixture: proposal arrives" stands in for the model's answer and is labelled as a prototype control.
import { register } from '../../app/registry.js';
import { h, button, icon, fmt } from '../../components/base.js';
import { iconId } from '../../components/mdj-marker.js';
import { trackTitle } from '../../components/mdj-provenance-tag.js';
import { PD, PS, statePill, fixtureControl, ackLater, statusLine, say, notice, section } from './perform.js';

const FR = ['FR-048', 'FR-005', 'FR-036', 'FR-040'];
const P37 = PD.proposals.P37;
const msg = (id) => PD.conversation.messages.find((m) => m.id === id);

const STATES = {
  ready:                    { label: 'Ready — quick actions and typed input', exercised: true, scenario: 'set-ready' },
  thinking:                 { label: 'Thinking — retained request, progress unknown, Cancel', exercised: true, scenario: 'set-ready', via: { from: 'ready', control: 'Build a 30-minute crate — uses the model' } },
  'proposal-ready':         { label: 'Proposal ready — crate P37 (reversible)', exercised: true, scenario: 'set-ready', via: { from: 'thinking', control: 'Fixture: proposal arrives' } },
  'needs-review':           { label: 'Needs review — analysis changed since the proposal', exercised: false, scenario: 'set-ready' },
  applied:                  { label: 'Applied — crate saved, Undo available', exercised: true, scenario: 'set-ready', via: { from: 'proposal-ready', control: 'Apply to preparation — proposal P37' } },
  undone:                   { label: 'Undone — crate removed, proposal reviewable', exercised: true, scenario: 'set-ready', via: { from: 'applied', control: 'Undo (preparation) — proposal P37' } },
  rejected:                 { label: 'Rejected — nothing saved', exercised: true, scenario: 'set-ready', via: { from: 'proposal-ready', control: 'Dismiss — proposal P37' } },
  'local-only':             { label: 'Local only — offline, cloud capabilities named', exercised: false, scenario: 'offline' },
  'cost-limit':             { label: 'Cost limit — monthly AI limit reached', exercised: false, scenario: 'set-ready' },
  unavailable:              { label: 'Unavailable — paused under thermal pressure', exercised: false, scenario: 'hot' },
  'restricted-source-note': { label: 'What ParDay can see — Spotify fields excluded', exercised: true, scenario: 'set-ready', via: { from: 'ready', control: 'What ParDay can see' } },
};

const PILL = {
  ready: ['ready'], thinking: ['thinking', 'P37'], 'proposal-ready': ['proposal_ready', 'P37'], 'needs-review': ['needs_review', 'P37'],
  applied: ['applied', 'P37'], undone: ['ready', 'P37 undone'], rejected: ['rejected', 'P37'], 'local-only': ['local_only'],
  'cost-limit': ['cost_limit'], unavailable: ['unavailable'], 'restricted-source-note': ['ready'],
};

function message(attrs) { return h('mdj-parday-message', attrs); }

function welcome() {
  const w = PS.prepare.welcome;
  // h() treats `text` as textContent, so the component's `text` attribute is set explicitly.
  const m = message({ role: 'assistant', at: w.at, state: 'sent' });
  m.setAttribute('text', w.text);
  return m;
}

function costStrip(ctx, limit = false) {
  const c = PD.cost, cl = PS.prepare.costLimit;
  const month = limit ? cl.monthEstimatedUsd : c.monthEstimatedUsd;
  const text = `Today ${c.requests} of ${c.requestLimit} requests · this month US$${month.toFixed(2)} of US$${c.monthLimitUsd.toFixed(2)}`;
  return h('p', { class: `parday-cost parday-fixture-box${limit ? ' parday-cost--limit' : ''}` }, [
    icon(iconId('cost-limit', 'warning'), { size: 14 }),
    h('span', { class: 'numeral', text }),
    h('mdj-fixture-mark', { for: 'AI cost record' }),
  ]);
}

function cratePreview() {
  const rows = P37.tracks.map((id, i) => {
    const t = ctx_track(id);
    return h('li', { class: 'parday-crate__row' }, [
      h('span', { class: 'parday-crate__n numeral', text: String(i + 1) }),
      h('span', { class: 'parday-crate__title body', text: trackTitle(id) }),
      h('span', { class: 'parday-crate__meta numeral', text: t ? `${t.bpm.toFixed(1)} · ${t.key} · ${fmt.time ? fmt.time(t.durationSec) : t.durationSec}` : '—' }),
    ]);
  });
  return h('section', { class: 'parday-section ink-backing parday-crate parday-fixture-box', 'aria-label': 'Preview of crate P37' }, [
    h('h3', { class: 'parday-section__title label', text: 'Preview · Warm-up 30 (not saved)' }),
    h('p', { class: 'parday-crate__cols label', 'aria-hidden': 'true' }, [h('span', { text: '#' }), h('span', { text: 'Track' }), h('span', { text: 'BPM · key · length' })]),
    h('ol', { class: 'parday-crate__list' }, rows),
    h('p', { class: 'body muted', text: 'Nothing is saved until Apply to preparation. Audition a track on the cue from the library; this preview plays nothing.' }),
    h('mdj-fixture-mark', { for: 'measured analysis (fixture)' }),
  ]);
}
let ctx_track = () => null;

function contextPanel(ctx) {
  const c = PS.prepare.context;
  const item = (it) => h('li', { class: 'parday-ctx__row' }, [
    h('span', { class: 'parday-ctx__text body', text: it.text }),
    h('mdj-provenance-tag', { kind: it.provenance, size: 'sm', label: it.label || null, source: it.source || null }),
  ]);
  return h('section', { class: 'parday-section ink-backing parday-ctx', 'aria-label': c.title }, [
    h('h3', { class: 'parday-section__title label', text: c.title }),
    h('p', { class: 'body', text: c.lead }),
    h('div', { class: 'parday-ctx__rule tone-critical', role: 'note' }, [icon('lock', { size: 18 }), h('p', { class: 'body' }, [h('strong', { text: 'Spotify-derived fields are excluded from ParDay’s context by default. ' }), c.rule.replace(/^Spotify-derived fields are excluded from ParDay’s context by default — from /, 'They are left out of ')])]),
    h('h4', { class: 'label parday-ctx__h', text: 'Included when relevant' }),
    h('ul', { class: 'parday-ctx__list' }, c.included.map(item)),
    h('h4', { class: 'label parday-ctx__h', text: 'Excluded — present in your library, never sent' }),
    h('ul', { class: 'parday-ctx__list parday-ctx__list--excluded' }, c.excluded.map(item)),
    h('p', { class: 'body muted', text: c.provider }),
    h('div', { class: 'parday-row' }, [
      button({ label: 'Close', icon: 'x', hit: 48, cls: 'btn--secondary', fr: ['FR-036'], attrs: { 'aria-label': 'Close what ParDay can see' }, on: { click: () => ctx.setState('ready') } }),
    ]),
  ]);
}

function crateCard(ctx, state, line, { previewHost = null } = {}) {
  const card = h('mdj-parday-card', { proposal: 'P37', state });
  // The card is the newest turn in these states; banner states (offline, cost limit) open at the banner.
  if (['proposal-ready', 'needs-review', 'applied', 'rejected'].includes(ctx.state)) card.dataset.pardayFocus = '';
  card.addEventListener('mdj:parday-action', (e) => {
    const a = e.detail.action;
    if (a === 'apply') { card.setAttribute('sent', 'apply'); ackLater(ctx, () => ctx.setState('applied')); }
    else if (a === 'undo') { card.setAttribute('sent', 'undo'); ackLater(ctx, () => ctx.setState('undone')); }
    else if (a === 'review') { card.setAttribute('sent', 'review'); ackLater(ctx, () => ctx.setState('proposal-ready')); }
    else if (a === 'refresh') ctx.setState('thinking');
    else if (a === 'preview' && previewHost) {
      const open = !previewHost.firstChild;
      previewHost.replaceChildren(...(open ? [cratePreview()] : []));
      say(line, open ? 'Preview opened below the card — nothing is saved.' : 'Preview closed.', 'preview');
    } else if (a === 'dismiss') {
      if (ctx.state === 'proposal-ready' || ctx.state === 'needs-review' || ctx.state === 'undone') ctx.setState('rejected');
      else ctx.setState('ready');
    }
  });
  return card;
}

function askArea(ctx, line, { qState = 'idle', iState = 'idle', reason = '' } = {}) {
  const quick = h('mdj-parday-quick-actions', { state: qState, reason: reason || null });
  quick.addEventListener('mdj:parday-quick', (e) => {
    if (e.detail.id === 'build-crate') ctx.setState('thinking');
    else say(line, `“${e.detail.label}” — ${PS.prepare.sentNoFixture}`, 'arrow-up');
  });
  const input = h('mdj-parday-input', { mode: 'prepare', state: iState, reason: reason || null });
  input.addEventListener('mdj:parday-send', (e) => {
    if (ctx.state === 'thinking') say(line, 'One request at a time — cancel the current request to send another. Manual preparation keeps working.', 'thinking');
    else if (/crate/i.test(e.detail.text) && iState !== 'offline') ctx.setState('thinking');
    else say(line, PS.prepare.sentNoFixture, 'arrow-up');
  });
  input.addEventListener('mdj:parday-voice', () => say(line, 'Voice is off. It needs a separate microphone permission and an explicit start, and this prototype listens to nothing. Typing and the buttons do everything voice would.', 'mic'));
  return [quick, input];
}

function render(ctx) {
  const state = ctx.state;
  ctx_track = (id) => ctx.fixtures.track(id);
  const line = statusLine();
  const conv = [];
  let ask = { qState: 'idle', iState: 'idle', reason: '' };
  const banners = [];
  const previewHost = h('div', { class: 'parday-previewhost' });
  const history = () => [message({ message: 'm1', state: 'sent' }), message({ message: 'm2', state: 'sent' })];

  switch (state) {
    case 'ready':
      conv.push(welcome());
      break;
    case 'thinking': {
      conv.push(welcome(), message({ message: 'm1', state: 'sent' }));
      const thinking = message({ message: 'm2', state: 'thinking' });
      thinking.addEventListener('mdj:parday-message', (e) => { if (e.detail.action === 'cancel') ctx.setState('ready'); });
      thinking.dataset.pardayFocus = '';
      conv.push(thinking, fixtureControl('Fixture: proposal arrives', () => ctx.setState('proposal-ready'), 'Prototype only — stands in for the model’s answer'));
      ask = { qState: 'thinking', iState: 'idle', reason: '' };
      break;
    }
    case 'proposal-ready':
      conv.push(...history(), crateCard(ctx, 'proposed', line, { previewHost }), previewHost);
      break;
    case 'needs-review':
      banners.push(notice('warning', 'warning', 'Needs review.', 'TIDE SIGNAL’s grid was corrected after ParDay proposed this crate. The proposal still shows the version you saw; nothing was changed for you.'));
      conv.push(...history(), crateCard(ctx, 'needs_review', line));
      break;
    case 'applied':
      conv.push(...history(), crateCard(ctx, 'applied', line));
      break;
    case 'undone': {
      const undoneNote = notice('ok', 'undo', 'Undo acknowledged.', PS.prepare.undone.text);
      undoneNote.dataset.pardayFocus = '';
      conv.push(...history(), undoneNote, crateCard(ctx, 'proposed', line, { previewHost }), previewHost);
      break;
    }
    case 'rejected':
      conv.push(...history(), crateCard(ctx, 'rejected', line));
      break;
    case 'local-only': {
      const o = PS.prepare.offline;
      banners.push(notice('info', iconId('local-only', 'cloud-off'), 'Local only — offline.', 'ParDay answers from saved analysis and app help; no cloud request is made.'));
      conv.push(message({ message: 'm5', state: 'local-only' }), message({ message: 'm6' }));
      conv.push(section('What works now', [
        h('div', { class: 'parday-caps' }, [
          h('div', { class: 'parday-caps__col' }, [h('h4', { class: 'label', text: 'Works offline' }), h('ul', { class: 'parday-caps__list body' }, o.works.map((t) => h('li', {}, [icon('check', { size: 14 }), h('span', { text: t })])))]),
          h('div', { class: 'parday-caps__col' }, [h('h4', { class: 'label', text: 'Waits for the network' }), h('ul', { class: 'parday-caps__list parday-caps__list--wait body' }, o.waits.map((t) => h('li', {}, [icon(iconId('offline', 'wifi-off'), { size: 14 }), h('span', { text: `${t} — needs the cloud model` })])))]),
        ]),
      ]));
      conv.push(crateCard(ctx, 'unavailable', line));
      ask = { qState: 'offline', iState: 'offline', reason: '' };
      break;
    }
    case 'cost-limit': {
      const cl = PS.prepare.costLimit;
      banners.push(notice('warning', iconId('cost-limit', 'warning'), cl.headline, cl.detail, [
        h('div', { class: 'parday-row' }, [button({ label: 'Open Settings', icon: 'settings', hit: 48, cls: 'btn--secondary', fr: ['FR-048', 'FR-040'], on: { click: () => ctx.navigate('system/settings') } })]),
      ]));
      conv.push(...history(), crateCard(ctx, 'proposed', line, { previewHost }), previewHost,
        h('p', { class: 'parday-aside body muted', text: 'Saved proposals keep working: applying P37 is a local save, not a model request.' }));
      ask = { qState: 'disabled', iState: 'disabled', reason: 'Monthly AI limit reached — new model requests are paused. Local search, saved proposals and every manual edit keep working.' };
      break;
    }
    case 'unavailable': {
      const t = PS.prepare.thermal;
      banners.push(notice('critical', 'thermal', t.headline, t.detail, [
        h('div', { class: 'parday-row' }, [button({ label: 'Open crates', icon: iconId('crate', 'folder'), hit: 48, cls: 'btn--secondary', fr: ['FR-005'], on: { click: () => ctx.navigate('launch/crates') } })]),
      ]));
      conv.push(...history());
      ask = { qState: 'disabled', iState: 'disabled', reason: 'Paused under thermal pressure — ParDay resumes when the phone cools.' };
      break;
    }
    case 'restricted-source-note':
      conv.push(contextPanel(ctx), welcome());
      break;
    default:
      conv.push(welcome());
  }

  const [pk, pextra] = PILL[state] || PILL.ready;
  const top = h('header', { class: 'parday-top' }, [
    button({ label: 'Library', icon: 'chevron-left', hit: 48, cls: 'btn--ghost parday-top__back', fr: ['FR-005'], attrs: { 'aria-label': 'Back to library' }, on: { click: () => ctx.navigate('launch/library') } }),
    button({ label: 'What ParDay can see', icon: 'lock', hit: 48, cls: 'btn--secondary parday-top__ctx', fr: ['FR-036', 'FR-040'], attrs: { 'aria-pressed': state === 'restricted-source-note' ? 'true' : 'false' }, on: { click: () => ctx.setState(state === 'restricted-source-note' ? 'ready' : 'restricted-source-note') } }),
    h('div', { class: 'parday-top__name' }, [
      h('span', { class: 'parday-phead__glyph brass-rim', 'aria-hidden': 'true' }, [h('span', { class: 'parday-phead__face titanium-radial' }, [icon('parday', { size: 16 })])]),
      h('h1', { class: 'title parday-top__title', text: 'ParDay' }),
      h('span', { class: 'parday-top__mode label', text: 'Prepare' }),
      statePill(pk, pextra),
    ]),
  ]);
  // The header toggle has a stable name; aria-pressed carries the open/closed state.
  const strip = h('div', { class: 'parday-strip' }, [
    costStrip(ctx, state === 'cost-limit'),
    h('p', { class: 'parday-strip__note body' }, [icon('lock', { size: 14 }), h('span', { text: 'Spotify-derived fields are never sent · voice off · nothing here is audible' })]),
  ]);
  const [quick, input] = askArea(ctx, line, ask);
  const convo = h('div', { class: 'parday-convo', role: 'log', 'aria-label': 'ParDay conversation' }, [...banners, ...conv, line]);
  // Like any conversation, open at the newest turn: scroll so the state's focus item (the thinking message,
  // the proposal card, the context panel) starts at the top of the visible conversation.
  const focus = convo.querySelector('[data-parday-focus]');
  if (focus) requestAnimationFrame(() => { if (convo.isConnected && convo.scrollHeight > convo.clientHeight) convo.scrollTop += focus.getBoundingClientRect().top - convo.getBoundingClientRect().top - 8; });
  const composer = h('div', { class: 'parday-composer ink-backing' }, [quick, input]);

  return h('div', { class: `parday-prepare parday-prepare--${state} stage`, dataset: { orientation: ctx.orientation } }, [top, strip, convo, composer]);
}

register({
  id: 'parday/prepare',
  family: 'parday',
  title: 'ParDay — Prepare',
  order: 1,
  fr: ['FR-048', 'FR-005', 'FR-036', 'FR-040'],
  shell: false,
  states: STATES,
  defaultState: 'ready',
  render,
});

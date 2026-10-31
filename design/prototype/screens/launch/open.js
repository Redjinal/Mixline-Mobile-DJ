// launch/open — first screen and resume point (Document 19 §3 scene 1 and scene 11; Document 03 §2
// "Launch and resume"; Document 07 §3 demo crate). Not a shell screen: nothing is loaded or audible here,
// and nothing on this screen starts audio. "Resume set" restores the saved session with every deck paused.
//
// States
//   empty           fresh install, empty library: Import is the primary 56 dp action; Demo is offered only
//                   because the fixture crate 'crate-demo' holds demo media (bundled fixtures)
//   demo            the demo crate is open: two demo tracks, ready (fixture availability)
//   resume          saved session sess-1 with decks, queue and route; deliberate "Resume set", no autoplay
//   resume-missing  saved session sess-3: BRASS CANYON missing on A; Locate file / continue with B
//   interrupted     recovered after process death: checkpoint time, what is kept, what needs action
import { register } from '../../app/registry.js';
import { load } from '../../app/fixtures.js';
import { h, icon, button, fmt } from '../../components/base.js';

let LX = null;
const ready = load('launch').then((d) => { LX = d; return d; });

const FR = ['FR-001', 'FR-002', 'FR-034', 'FR-035'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function when(iso, { seconds = false } = {}) {
  const d = new Date(iso);
  const t = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}${seconds ? `:${String(d.getSeconds()).padStart(2, '0')}` : ''}`;
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} · ${t}`;
}

register({
  id: 'launch/open',
  family: 'launch',
  title: 'Open or resume',
  order: 1,
  fr: FR,
  shell: false,
  states: {
    empty: { label: 'Empty library — Import or Demo', exercised: true, scenario: 'fresh' },
    demo: { label: 'Demo crate open (bundled fixtures)', exercised: true, scenario: 'fresh', via: { from: 'empty', control: 'Demo crate' } },
    resume: { label: 'Saved session — deliberate resume', exercised: false, scenario: 'set-ready' },
    'resume-missing': { label: 'Saved session with a missing file', exercised: true, scenario: 'missing-media', via: { from: 'resume', control: 'Rooftop warm-up' } },
    interrupted: { label: 'Recovered after the app was closed', exercised: false, scenario: 'set-ready' },
  },
  defaultState: 'empty',
  render(ctx) {
    const root = h('div', { class: `launch-page launch-open launch-open--${ctx.state} stage`, dataset: { orientation: ctx.orientation } });
    const fill = () => root.replaceChildren(...build(ctx));
    if (LX) fill(); else ready.then(fill);
    return root;
  },
});

function build(ctx) {
  const { state } = ctx;
  const head = brandHead();
  let hero, actions;
  if (state === 'demo') [hero, actions] = demoState(ctx);
  else if (state === 'resume') [hero, actions] = resumeState(ctx);
  else if (state === 'resume-missing') [hero, actions] = missingState(ctx);
  else if (state === 'interrupted') [hero, actions] = interruptedState(ctx);
  else [hero, actions] = emptyState(ctx);
  const foot = h('footer', { class: 'launch-open__foot ink-backing' }, [
    icon('local-only', { size: 16 }),
    h('p', { class: 'body' }, [h('strong', { text: 'Local first: your phone owns the library.' }), ' No account, no server, no cloud. Downloads and ParDay ask for a network only when you use them.']),
  ]);
  return [head, h('div', { class: 'launch-open__grid' }, [hero, h('div', { class: 'launch-open__side' }, [actions, foot])])];
}

function brandHead() {
  return h('header', { class: 'launch-open__brand' }, [
    h('span', { class: 'launch-emblem brass-rim', 'aria-hidden': 'true' }, [h('span', { class: 'launch-emblem__face titanium-radial' }, [h('span', { class: 'launch-emblem__mark index-mark' })])]),
    h('div', { class: 'launch-open__brand-text' }, [
      h('p', { class: 'title launch-open__name', text: 'Mobile DJ' }),
      h('p', { class: 'label', text: 'Working label · design prototype · no audio engine' }),
    ]),
  ]);
}

function heroPanel(kicker, title, body, children = []) {
  return h('section', { class: 'launch-open__hero glass', 'aria-labelledby': 'launch-open-title' }, [
    h('div', { class: 'launch-open__hero-text ink-backing' }, [
      h('p', { class: 'label', text: kicker }),
      h('h1', { id: 'launch-open-title', class: 'title launch-open__title', text: title }),
      body ? h('p', { class: 'body', text: body }) : null,
    ]),
    ...children,
  ]);
}

function actionList(children) {
  return h('nav', { class: 'launch-open__actions', 'aria-label': 'Start' }, children);
}

// ---------- empty ----------
function emptyState(ctx) {
  const demoCrate = ctx.fixtures.library.crates.find((c) => c.id === 'crate-demo');
  const demoCount = demoCrate ? demoCrate.trackIds.length : 0;
  const free = ctx.session.storage?.freeBytes;
  const hero = heroPanel('Library', 'Your library is empty', 'Import music from files or a folder on this phone. The app reads only what you choose; nothing is uploaded.', [
    h('ul', { class: 'launch-open__facts' }, [
      fact('library', 'Tracks in library', '0'),
      fact('storage', 'Free on this phone · fixture', fmt.bytes(free)),
      fact('history', 'Saved sessions', 'None yet'),
    ]),
  ]);
  const actions = actionList([
    button({ label: 'Import music', icon: 'import', hit: 56, cls: 'btn--primary launch-open__primary', fr: ['FR-002'], on: { click: () => ctx.navigate('launch/import', { state: 'picker' }) } }),
    demoCount ? h('div', { class: 'launch-open__demo raised' }, [
      button({ label: 'Demo crate', icon: 'demo', cls: 'btn--secondary launch-open__demo-btn', fr: ['FR-001'], on: { click: () => ctx.setState('demo') } }),
      h('p', { class: 'body launch-open__demo-note' }, [
        h('strong', { text: 'Demo crate (bundled fixtures)' }),
        ` · ${demoCount} demo tracks shipped with this build. Offered only because demo media exists; it is labelled DEMO wherever it appears.`,
      ]),
    ]) : h('p', { class: 'body muted', text: 'No demo media is bundled in this build, so no demo is offered.' }),
    button({ label: 'Check output first', icon: 'route', cls: 'btn--ghost launch-open__tertiary', fr: ['FR-001'], on: { click: () => ctx.navigate('route/check') } }),
  ]);
  return [hero, actions];
}

function fact(ic, label, value) {
  return h('li', { class: 'launch-open__fact' }, [icon(ic, { size: 16 }), h('span', { class: 'label', text: label }), h('span', { class: 'numeral launch-open__fact-v', text: value })]);
}

// ---------- demo ----------
function demoState(ctx) {
  const crate = ctx.fixtures.library.crates.find((c) => c.id === 'crate-demo');
  const tracks = crate.trackIds.map((id) => ctx.fixtures.track(id)).filter(Boolean);
  const list = h('ul', { class: 'launch-open__demo-list', 'aria-label': 'Demo tracks' }, tracks.map((t) => h('li', { class: 'launch-track raised' }, [
    h('mdj-art', { seed: t.id, size: 40, label: t.title }),
    h('div', { class: 'launch-track__body' }, [
      h('span', { class: 'title launch-track__title truncate', text: t.title }),
      h('span', { class: 'body muted truncate', text: t.artist }),
      h('span', { class: 'launch-track__chips' }, [h('mdj-chip', { kind: 'availability', value: 'demo', size: 'sm' }), h('mdj-chip', { kind: 'availability', value: 'ready', size: 'sm' })]),
    ]),
    h('span', { class: 'launch-track__nums ink-backing', 'aria-label': `${fmt.bpm(t.bpm)} BPM, key ${t.key}, ${fmt.time(t.durationSec)}` }, [
      h('span', { class: 'numeral', text: fmt.bpm(t.bpm) }), h('span', { class: 'label', text: 'BPM' }),
      h('span', { class: 'numeral', text: t.key }), h('span', { class: 'numeral', text: fmt.time(t.durationSec) }),
    ]),
  ])));
  const listBox = h('div', { class: 'launch-fixture-box' }, [list, h('mdj-fixture-mark', { for: 'demo track analysis' })]);
  const hero = heroPanel('Demo crate (bundled fixtures)', 'Two demo tracks are ready', 'Demo media is bundled with the app. It is not part of your library and stays labelled DEMO in the browser, on decks and in recordings.', [listBox]);
  const actions = actionList([
    button({ label: 'Open demo in library', icon: 'library', hit: 56, cls: 'btn--primary launch-open__primary', fr: ['FR-004'], on: { click: () => ctx.navigate('launch/library', { state: 'browse' }) } }),
    button({ label: 'Import my music', icon: 'import', cls: 'btn--secondary', fr: ['FR-002'], on: { click: () => ctx.navigate('launch/import', { state: 'picker' }) } }),
    button({ label: 'Check output', icon: 'route', cls: 'btn--ghost launch-open__tertiary', fr: ['FR-001'], on: { click: () => ctx.navigate('route/check') } }),
    button({ label: 'Back to start', icon: 'chevron-left', cls: 'btn--ghost launch-open__tertiary', on: { click: () => ctx.setState('empty') } }),
  ]);
  return [hero, actions];
}

// ---------- resume ----------
function sessionSummary(ctx, sess, deckRows) {
  const route = ctx.fixtures.route(sess.route);
  const queue = sess.queue.map((id) => ctx.fixtures.track(id)?.title).filter(Boolean);
  return h('dl', { class: 'launch-open__summary' }, [
    ...deckRows,
    h('div', { class: 'launch-open__sumrow' }, [h('dt', { class: 'label', text: 'Queue' }), h('dd', { class: 'body', text: queue.length ? `${queue.length} · ${queue.join(', ')}` : 'Empty' })]),
    h('div', { class: 'launch-open__sumrow' }, [h('dt', { class: 'label', text: 'Output' }), h('dd', { class: 'body', text: `${route?.name || sess.route} — ${route?.summary || ''}` })]),
    h('div', { class: 'launch-open__sumrow' }, [h('dt', { class: 'label', text: 'Set length' }), h('dd', { class: 'numeral', text: fmt.time(sess.durationSec) })]),
  ]);
}

function deckRow(ctx, letter, track, { positionSec = 0, missing = false, extra = null } = {}) {
  return h('div', { class: `launch-open__sumrow launch-open__deck deck-${letter.toLowerCase()}${missing ? ' launch-open__deck--missing' : ''}` }, [
    h('dt', { class: 'launch-deckletter numeral', 'aria-label': `Deck ${letter}` }, [letter]),
    h('dd', { class: 'launch-open__deck-body' }, [
      h('span', { class: 'title launch-open__deck-title wrap-2', text: track ? track.title : 'Empty' }),
      h('span', { class: 'body muted' }, [missing ? 'Missing file · ' : 'Paused at ', missing ? `cue kept at ${fmt.time(positionSec)}` : h('span', { class: 'numeral', text: fmt.time(positionSec) })]),
      missing ? h('mdj-chip', { kind: 'availability', value: 'missing', size: 'sm' }) : null,
      extra,
    ]),
  ]);
}

function pausedNote() {
  return h('p', { class: 'launch-open__paused ink-backing' }, [icon('pause', { size: 16 }), h('span', { class: 'body' }, [h('strong', { text: 'Audio stays paused until you press Play.' }), ' Resuming restores decks, queue and route; nothing becomes audible on its own.'])]);
}

function resumeState(ctx) {
  const sess = ctx.fixtures.sessions.sessions['sess-1'];
  const decks = sess.decks.map((id, i) => deckRow(ctx, 'AB'[i], ctx.fixtures.track(id)));
  const hero = heroPanel(`Saved session · ${when(sess.savedAt)}`, sess.name, null, [sessionSummary(ctx, sess, decks), pausedNote()]);
  const others = ['sess-3', 'sess-2'].map((id) => ctx.fixtures.sessions.sessions[id]);
  const actions = actionList([
    button({ label: 'Resume set', icon: 'resume', hit: 56, cls: 'btn--primary launch-open__primary', fr: ['FR-034', 'FR-035'], on: { click: () => ctx.navigate('perform/ab', { state: 'set-ready' }) } }),
    h('div', { class: 'launch-open__row2' }, [
      button({ label: 'Open library', icon: 'library', cls: 'btn--secondary', fr: ['FR-004'], on: { click: () => ctx.navigate('launch/library', { state: 'browse' }) } }),
      button({ label: 'Import music', icon: 'import', cls: 'btn--secondary', fr: ['FR-002'], on: { click: () => ctx.navigate('launch/import', { state: 'picker' }) } }),
    ]),
    h('section', { class: 'launch-open__others', 'aria-labelledby': 'launch-open-others' }, [
      h('h2', { id: 'launch-open-others', class: 'label', text: 'Other saved sessions' }),
      ...others.map((s) => sessionButton(ctx, s)),
    ]),
  ]);
  return [hero, actions];
}

function sessionButton(ctx, s) {
  const tid = `launch-sess-${s.id}`;
  const missing = (s.missing || []).length;
  const go = s.id === 'sess-3' ? () => ctx.setState('resume-missing') : () => ctx.navigate('perform/ab', { state: 'four-deck' });
  return h('button', { type: 'button', class: 'btn launch-open__sess', dataset: { hit: '48', fr: 'FR-034' }, 'aria-labelledby': tid, 'aria-describedby': `${tid}-d`, on: { click: go } }, [
    icon(missing ? 'missing' : 'history', { size: 18 }),
    h('span', { class: 'launch-open__sess-text' }, [
      h('span', { id: tid, class: 'launch-open__sess-name', text: s.name }),
      h('span', { id: `${tid}-d`, class: 'launch-open__sess-meta muted', text: `${when(s.savedAt)} · ${s.decks.length} decks${missing ? ` · ${missing} missing file` : ''}` }),
    ]),
    icon('chevron-right', { size: 18 }),
  ]);
}

// ---------- resume-missing ----------
function missingState(ctx) {
  const sess = ctx.fixtures.sessions.sessions['sess-3'];
  const brass = ctx.fixtures.track('brass');
  const drift = ctx.fixtures.track('drift');
  const crates = ctx.fixtures.library.crates.filter((c) => c.trackIds.includes('brass')).map((c) => c.name);
  const cue = brass.cues[0];
  const deckA = deckRow(ctx, 'A', brass, { positionSec: ctx.session.decks.A.positionSec, missing: true });
  const deckB = deckRow(ctx, 'B', drift, { positionSec: 0 });
  const warn = h('div', { class: 'launch-open__warn tone-critical', role: 'status' }, [
    icon('missing', { size: 18 }),
    h('div', {}, [
      h('p', { class: 'body' }, [h('strong', { text: 'BRASS CANYON is missing on Deck A.' }), ` ${brass.missingNote}`]),
      h('p', { class: 'body launch-open__kept' }, [`Kept: ${brass.cues.length} cue (${cue.name} ${fmt.time(cue.sec)}), its grid, and its place in ${crates.join(', ') || 'your crates'}. They reconnect when the file is found.`]),
    ]),
  ]);
  const hero = heroPanel(`Saved session · ${when(sess.savedAt)}`, sess.name, null, [sessionSummary(ctx, sess, [deckA, deckB]), warn, pausedNote()]);
  const actions = actionList([
    button({ label: 'Locate file', icon: 'folder', hit: 56, cls: 'btn--primary launch-open__primary', fr: ['FR-002'], on: { click: () => ctx.navigate('launch/import', { state: 'picker' }) } }),
    button({ label: 'Keep cues and continue with B', icon: 'resume', cls: 'btn--secondary', fr: ['FR-034', 'FR-035'], on: { click: () => ctx.navigate('perform/ab', { state: 'set-ready' }) } }),
    h('p', { class: 'body muted launch-open__hint', text: 'Continuing leaves Deck A empty and paused. BRASS CANYON stays in the library as Missing until you locate it.' }),
    button({ label: 'Back to saved sessions', icon: 'chevron-left', cls: 'btn--ghost launch-open__tertiary', on: { click: () => ctx.setState('resume') } }),
  ]);
  return [hero, actions];
}

// ---------- interrupted ----------
function interruptedState(ctx) {
  const rec = LX.interrupted;
  const sess = ctx.fixtures.sessions.sessions[rec.sessionId];
  const decks = Object.entries(rec.decks).map(([l, d]) => deckRow(ctx, l, ctx.fixtures.track(d.trackId), { positionSec: d.positionSec }));
  const hero = heroPanel(`Recovered · ${when(rec.recoveredAt)}`, `${sess.name} was interrupted`, rec.cause, [
    h('p', { class: 'launch-open__checkpoint ink-backing' }, [icon('restore', { size: 16 }), h('span', { class: 'body' }, ['Last consistent checkpoint ', h('strong', { class: 'numeral', text: when(rec.checkpointAt, { seconds: true }) })])]),
    h('dl', { class: 'launch-open__summary' }, decks),
    listBlock('Preserved', 'check', 'ok', rec.preserved),
    listBlock('Not saved', 'warning', 'warning', rec.lost),
  ]);
  const actions = actionList([
    h('section', { class: 'launch-open__needs', 'aria-labelledby': 'launch-open-needs' }, [
      h('h2', { id: 'launch-open-needs', class: 'label', text: 'Needs your action' }),
      ...rec.needsAction.map((n) => h('div', { class: 'launch-open__need raised' }, [
        h('p', { class: 'body', text: n.text }),
        button({ label: n.action, icon: n.id === 'route' ? 'route' : 'recover', cls: 'btn--secondary', fr: ['FR-034'], on: { click: () => ctx.navigate(n.to) } }),
      ])),
    ]),
    button({ label: 'Resume set', icon: 'resume', hit: 56, cls: 'btn--primary launch-open__primary', fr: ['FR-034', 'FR-035'], on: { click: () => ctx.navigate('perform/ab', { state: 'set-ready' }) } }),
    pausedNote(),
  ]);
  return [hero, actions];
}

function listBlock(title, ic, tone, items) {
  if (!items?.length) return null;
  return h('div', { class: 'launch-open__list' }, [
    h('p', { class: 'label', text: title }),
    h('ul', {}, items.map((t) => h('li', { class: 'body' }, [h('span', { class: `launch-open__bullet tone-${tone}`, 'aria-hidden': 'true' }, [icon(ic, { size: 12 })]), h('span', { text: t })]))),
  ]);
}

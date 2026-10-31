// perform/ab — the A/B performance surface (Document 03 §1, §2, §4; Document 19 §3 scene "Perform").
//
// Portrait (shell dock on): the dock already owns deck selectors, Cue/Play for the focused pair, the
// crossfader, the master meter and the Master button, so the content is a two-deck overview (stacked
// overview lanes with seek lock + compact summaries) above a larger FOCUSED deck area (detailed
// waveform, hot cue bank 1 of 2, Sync / Key lock / Slip / Quantize, jog with its labelled
// alternatives) and the Pads / FX / Stems workspace links.
// Landscape (dock off): a different composition — two detailed lanes A above B readable together,
// Deck A workspace left, a central mini mixer (trim + filter dials, channel faders, channel meters,
// crossfader), Deck B workspace right, and a labelled workspace rail; secondary deck actions sit in a
// band below the performance surface.
//
// No engine exists. Every waveform, meter, level, position and phase drawn here is a fixture and the
// components print FIXTURE marks. The screen stands in for the engine only to acknowledge a SENT
// control (value set, state cleared) after a short delay, and says so in the page note.
//
// This module also exports the small helpers the other performance screens share (fixture overlays,
// the engine stand-in, toggles), because the family's file ownership has no separate helper module.
import { register } from '../../app/registry.js';
import { load } from '../../app/fixtures.js';
import { h, button, icon, fmt } from '../../components/base.js';

export const perfData = await load('performance');
const ACK_MS = 450;

// ---------------------------------------------------------------- shared helpers

// Apply the family overlay for "<screen>:<state>" to the per-render hydrated session (a fresh object
// each render), so the shell dock — which renders after the screen — shows the same world.
export function prepare(ctx) {
  const s = ctx.session;
  const ov = perfData.overlays[`${ctx.screen.id}:${ctx.state}`];
  if (!ov) return s;
  if (ov.focus) s.focus = [...ov.focus];
  if (ov.route) s.route = ctx.fixtures.route(ov.route) || s.route;
  if (ov.master) s.master = { ...s.master, ...ov.master };
  if (ov.cue) s.cue = { ...s.cue, ...ov.cue };
  for (const [L, patch] of Object.entries(ov.decks || {})) {
    const d = { ...s.decks[L], ...patch };
    d.track = d.trackId ? ctx.fixtures.track(d.trackId) : null;
    if (!d.track && d.state !== 'empty' && d.state !== 'missing') d.state = 'empty';
    d.remainingSec = d.track ? Math.max(0, d.track.durationSec - d.positionSec) : 0;
    s.decks[L] = d;
  }
  s.deckCount = Object.values(s.decks).filter((d) => d.enabled).length;
  return s;
}

// After the router appends the content into <mdj-shell>, run fn(shell). Rendering is synchronous, so a
// microtask is enough; the shell (and its dock) is new on every route render.
export function withShell(root, fn) {
  queueMicrotask(() => { const shell = root.closest('mdj-shell'); if (shell) fn(shell); });
}

// Engine stand-in for continuous controls (dial, fader, crossfader, pitch rail): the component enters
// `pending` with pending-value on release and emits mdj:value { phase: 'end' }; after ACK_MS the
// fixture "engine" acknowledges by setting `value` and clearing `state`.
export function standInEngine(target) {
  target.addEventListener('mdj:value', (e) => {
    const t = e.target, d = e.detail || {};
    if (d.phase !== 'end' || !t.setAttribute || d.value == null) return;
    if (t.tagName === 'MDJ-VALUE-INSPECTOR') return;
    setTimeout(() => {
      if (!t.isConnected) return;
      t.setAttribute('value', String(Math.round(d.value * 1000) / 1000));
      t.removeAttribute('pending-value');
      if (t.getAttribute('state') === 'pending') t.removeAttribute('state');
    }, ACK_MS);
  });
  target.addEventListener('mdj:reset', (e) => {
    const t = e.target, d = e.detail || {};
    if (!t.setAttribute || d.value == null) return;
    t.setAttribute('value', String(d.value)); t.setAttribute('state', 'reset');
  });
}

// A labelled 48 dp toggle (Sync / Key lock / Slip / Quantize / Reverse …). A tap prints SENT (dashed)
// and the fixture engine acknowledges after ACK_MS by flipping aria-pressed — never before.
export function toggle({ label, name, pressed = false, fr = [], deck = null, iconName = null, disabled = false, reason = '', cls = '' }) {
  const b = h('button', {
    type: 'button', class: `btn performance-toggle ${cls}`.trim(), 'aria-pressed': String(!!pressed),
    'aria-label': `${name || label}${disabled && reason ? ` (${reason})` : ''}`, disabled: disabled ? true : null,
    dataset: { hit: '48', ...(fr.length ? { fr: fr.join(' ') } : {}) },
  }, [
    iconName ? icon(iconName, { size: 16 }) : null,
    h('span', { class: 'btn-label performance-toggle__label', text: label }),
    h('span', { class: 'performance-toggle__state label', text: pressed ? 'On' : 'Off' }),
  ]);
  if (deck) b.classList.add(`deck-${deck.toLowerCase()}`);
  b.addEventListener('click', () => {
    if (b.dataset.state === 'pending') return;
    b.dataset.state = 'pending';
    b.querySelector('.performance-toggle__state').textContent = 'Sent';
    setTimeout(() => {
      if (!b.isConnected) return;
      const next = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(next));
      delete b.dataset.state;
      b.querySelector('.performance-toggle__state').textContent = next ? 'On' : 'Off';
    }, ACK_MS);
  });
  return b;
}

// Transport stand-in for content transports that do not change the screen state.
export function standInTransport(target, { exclude = () => false } = {}) {
  target.addEventListener('mdj:transport', (e) => {
    const t = e.target, d = e.detail || {};
    if (exclude(d) || !t.setAttribute) return;
    const prev = t.getAttribute('state') || 'idle';
    if (prev === 'disabled' || prev === 'pending') return;
    t.setAttribute('state', 'pending');
    setTimeout(() => {
      if (!t.isConnected) return;
      if (d.kind === 'play') t.setAttribute('state', prev === 'playing' ? 'paused' : 'playing');
      else if (d.kind === 'sync') t.setAttribute('state', prev === 'active' ? 'idle' : 'active');
      else t.setAttribute('state', prev === 'active' ? 'idle' : 'active');
    }, ACK_MS);
  });
}

export const WORKSPACE_ROUTES = { library: 'launch/library', pads: 'pads/pads', fx: 'pads/fx', stems: 'pads/stems', queue: 'queue/queue', sampler: 'sampler/banks' };
export function workspaceNav(ctx, node) {
  node.addEventListener('mdj:workspace', (e) => { const id = e.detail?.id; if (WORKSPACE_ROUTES[id]) ctx.navigate(WORKSPACE_ROUTES[id]); });
  return node;
}

export function fixtureNote(text) {
  return h('p', { class: 'performance-note label' }, [icon('fixture', { size: 12 }), h('span', { text })]);
}

export const deckLabel = (d) => (d.track ? d.track.title : 'Empty');
export const isAudible = (d) => d.state === 'playing';
export const stateWord = (d) => ({ playing: 'Playing', paused: d.cueSelected ? 'Cued' : 'Paused', loading: 'Loading', empty: 'Empty', missing: 'File missing', interrupted: 'Interrupted' }[d.interrupted ? 'interrupted' : d.state] || d.state);

function summaryState(d) {
  if (d.state === 'empty') return 'empty';
  if (d.state === 'loading') return 'loading';
  if (d.state === 'missing') return 'missing';
  return d.state === 'playing' ? 'playing' : 'paused';
}
function analysisOf(d) {
  if (!d.track) return null;
  if (d.track.analysis === 'pending') return 'pending';
  if (d.track.gridConfidence === 'low') return 'uncertain';
  return 'complete';
}

export function deckSummary(d, { size = 'compact' } = {}) {
  return h('mdj-deck-summary', {
    deck: d.letter, track: d.track ? d.track.id : null, size, position: d.positionSec, pitch: d.pitchPct || 0,
    sync: d.sync ? true : null, keylock: d.keylock ? true : null, loop: d.loop?.active ? d.loop.bars : null, slip: d.slip ? true : null,
    analysis: analysisOf(d), state: summaryState(d),
  });
}

// ---------------------------------------------------------------- perform/ab

const STATES = {
  'set-ready': { label: 'Set ready — both paused, cue selected on A', exercised: true, scenario: 'set-ready' },
  'focus-b': { label: 'Set ready — Deck B in focus (dock tab B in portrait)', exercised: false, scenario: 'set-ready' },
  playing: { label: 'A playing, B free', exercised: true, scenario: 'a-playing', via: { from: 'set-ready', control: 'Play deck A' } },
  'protected-load': { label: 'Protected load — A is audible', exercised: true, scenario: 'a-playing', via: { from: 'playing', control: 'Load next' } },
  'b-loaded': { label: 'COPPER SKY loaded to B, A still playing', exercised: true, scenario: 'a-playing', via: { from: 'protected-load', control: 'Load to B' } },
  transition: { label: 'Transition — both playing, crossfader toward B', exercised: true, scenario: 'transition', via: { from: 'b-loaded', control: 'Play deck B' } },
  'seek-preview': { label: 'Seek lock — preview target, playback unchanged', exercised: true, scenario: 'a-playing', via: { from: 'playing', control: 'Preview seek' } },
  seeked: { label: 'Seek acknowledged at 2:41', exercised: true, scenario: 'a-playing', via: { from: 'seek-preview', control: 'Seek to 2:41' } },
  'pending-quantized': { label: 'Hot cue 3 pending — quantized to the next beat', exercised: true, scenario: 'a-playing', via: { from: 'playing', control: "Hot cue 3 'Break', deck A, bank 1, loaded" } },
  'held-scratch': { label: 'Held scratch on A with Slip (finger down)', exercised: false, scenario: 'a-playing' },
  clipping: { label: 'Master clipping, limiter reducing', exercised: false, scenario: 'clipping' },
  loading: { label: 'Deck B loading', exercised: false, scenario: 'a-playing' },
  empty: { label: 'Empty — nothing loaded', exercised: false, scenario: 'fresh' },
  'route-lost': { label: 'Output lost — decks paused and muted', exercised: false, scenario: 'route-lost' },
  'four-deck': { label: 'Four decks — focus A/B, C looping, D loading', exercised: true, scenario: 'four-deck', via: { from: 'perform/focus-map:four-deck', control: 'Focus pair A/B' } },
  'four-deck-cd': { label: 'Four decks — focus C/D', exercised: true, scenario: 'four-deck', via: { from: 'four-deck', control: 'Focus pair C/D' } },
  'four-deck-ac': { label: 'Four decks — focus A/C', exercised: true, scenario: 'four-deck', via: { from: 'perform/focus-map:four-deck', control: 'Focus pair A/C' } },
  'four-deck-bd': { label: 'Four decks — focus B/D', exercised: true, scenario: 'four-deck', via: { from: 'perform/focus-map:four-deck', control: 'Focus pair B/D' } },
};

register({
  id: 'perform/ab', family: 'performance', title: 'Perform — A/B', order: 1,
  fr: ['FR-009', 'FR-010', 'FR-011', 'FR-012', 'FR-013', 'FR-014', 'FR-015', 'FR-016', 'FR-017', 'FR-018', 'FR-019', 'FR-020', 'FR-021', 'FR-035', 'FR-039'],
  shell: true,
  dock: { portrait: true, landscape: false },
  states: STATES,
  defaultState: 'set-ready',
  render(ctx) { return renderAB(ctx); },
});

function renderAB(ctx) {
  const s = prepare(ctx);
  const st = ctx.state;
  const land = ctx.orientation === 'landscape';
  const [pa, pb] = s.focus;
  const focusLetter = st === 'focus-b' ? 'B' : pa;
  const root = h('div', { class: `performance-ab performance-ab--${land ? 'landscape' : 'portrait'} performance-state--${st}`, dataset: { state: st } });
  const view = { ctx, s, st, land, pair: [pa, pb], focus: focusLetter };

  if (st === 'route-lost') root.appendChild(routeLostBanner(ctx));
  if (st === 'clipping') root.appendChild(clippingBanner(ctx, s));

  if (land) root.appendChild(landscapeSurface(view));
  else root.appendChild(portraitSurface(view));

  if (st === 'protected-load') root.appendChild(protectedSheet(ctx, s));
  if (st === 'b-loaded') root.appendChild(h('mdj-toast', { class: 'performance-toast', tone: 'ok', icon: 'check', message: 'COPPER SKY loaded on Deck B', detail: 'Load acknowledged (fixture). Deck A kept playing; B is cued at Drums 0:15.', 'no-dismiss': true, state: 'visible' }));

  wireAB(root, view);
  return root;
}

// ---------------------------------------------------------------- banners and sheet

function routeLostBanner(ctx) {
  return h('section', { class: 'performance-banner tone-critical', role: 'alert', 'aria-label': 'Output lost' }, [
    h('div', { class: 'performance-banner__text' }, [
      h('p', { class: 'title performance-banner__title' }, [icon('route-lost', { size: 18 }), h('span', { text: 'Output lost — decks paused and muted' })]),
      h('p', { class: 'body', text: 'The USB output disappeared. A and B kept their positions. Cue audio was not moved to the phone speaker. Choose an output before you resume; nothing restarts on its own.' }),
    ]),
    button({ label: 'Check output', icon: 'route', cls: 'btn--primary', fr: ['FR-023'], on: { click: () => ctx.navigate('route/check') } }),
  ]);
}

function clippingBanner(ctx, s) {
  const gr = s.master.limiterGrDb;
  return h('section', { class: 'performance-banner tone-warning', role: 'status', 'aria-label': 'Master clipping' }, [
    h('div', { class: 'performance-banner__text' }, [
      h('p', { class: 'title performance-banner__title' }, [icon('warning', { size: 18 }), h('span', { text: 'Master clipping' })]),
      h('p', { class: 'body' }, [`Limiter reducing `, h('strong', { class: 'numeral', text: fmt.db(gr) }), ` (fixture). Deck A trim is `, h('strong', { class: 'numeral', text: fmt.db(s.decks.A.gainDb) }), '. Lower a trim or the master level.']),
    ]),
    button({ label: 'Open Master', icon: 'master', fr: ['FR-021'], on: { click: () => ctx.navigate('perform/master', { state: 'clipping' }) } }),
  ]);
}

function protectedSheet(ctx, s) {
  const next = ctx.fixtures.track(perfData.nextLoad.trackId);
  const sheet = h('mdj-sheet', {
    class: 'performance-sheet', variant: 'confirm', icon: 'lock', deck: 'A', state: 'open',
    title: 'Deck A is playing',
    actions: JSON.stringify([
      { id: 'load-b', label: 'Load to B', primary: true },
      { id: 'replace-a', label: 'Replace A — confirm', tone: 'danger' },
      { id: 'cancel', label: 'Cancel' },
    ]),
    'dismiss-label': 'Close',
  }, [
    h('p', { class: 'body performance-sheet__q' }, [h('strong', { text: `Load ${next.title} to B instead?` })]),
    h('p', { class: 'body muted', text: `Deck B is free and silent, so loading there cannot interrupt the mix. Replacing A would stop ${s.decks.A.track.title} at ${fmt.time(s.decks.A.positionSec)} in front of the room.` }),
  ]);
  sheet.addEventListener('mdj:sheet-action', (e) => {
    const id = e.detail?.id;
    if (id === 'load-b') ctx.setState('b-loaded');
    else if (id === 'cancel') ctx.setState('playing');
    else if (id === 'replace-a') {
      // A second, deliberate confirmation would follow in the app; the prototype prints it instead of acting.
      const p = sheet.querySelector('.performance-sheet__warn') || h('p', { class: 'performance-sheet__warn body tone-critical', role: 'alert' });
      p.textContent = 'Replacing an audible deck needs one more confirmation in the app. The prototype stops here and keeps A playing.';
      sheet.querySelector('.sheet__body')?.appendChild(p);
    }
  });
  sheet.addEventListener('mdj:sheet-dismiss', () => ctx.setState('playing'));
  return h('div', { class: 'performance-scrim' }, [sheet]);
}

// ---------------------------------------------------------------- portrait

function portraitSurface(v) {
  const { s, st, focus } = v;
  const wrap = h('div', { class: 'performance-portrait' });
  // Two-deck (or pair) overview: summary + overview lane per deck.
  const ov = h('section', { class: 'performance-overview glass', 'aria-label': 'Deck overview' });
  for (const L of v.pair) ov.appendChild(overviewRow(v, s.decks[L]));
  if (s.deckCount > 2) ov.appendChild(otherDecks(v));
  wrap.appendChild(ov);

  if (st === 'empty') {
    wrap.appendChild(h('mdj-empty-state', {
      class: 'performance-empty', icon: 'library', title: 'No tracks loaded', state: 'idle',
      body: 'Choose a track in the library, then pick Load A or Load B. Demo media is labelled as demo.',
      actions: JSON.stringify([{ id: 'library', label: 'Open library', icon: 'library', primary: true }, { id: 'demo', label: 'Use demo media', icon: 'demo' }]),
    }));
    return wrap;
  }
  wrap.appendChild(focusArea(v, s.decks[focus]));
  wrap.appendChild(workspaceLinks(v, 'pads,fx,stems'));
  return wrap;
}

function overviewRow(v, d) {
  const { st } = v;
  const audible = isAudible(d);
  const seekHere = st === 'seek-preview' && d.letter === perfData.seek.deck;
  const lane = h('mdj-waveform', {
    track: d.track ? d.track.id : null, deck: d.letter, mode: 'overview', position: d.positionSec, height: 34, 'no-head': true,
    markers: 'cues loops phrases', 'seek-lock': audible ? true : null,
    'seek-target': seekHere ? perfData.seek.targetSec : null,
    state: d.state === 'loading' ? 'loading' : seekHere ? 'seek-preview' : d.state === 'playing' ? 'playing' : null,
  });
  const row = h('div', { class: `performance-ov deck-${d.letter.toLowerCase()}${d.letter === v.focus ? ' performance-ov--focus' : ''}`, dataset: { deck: d.letter } }, [
    deckSummary(d),
    h('div', { class: 'performance-ov__lane' }, [lane, audible ? h('span', { class: 'performance-ov__lock label' }, [icon('seek-lock', { size: 12 }), 'Seek lock']) : null]),
  ]);
  if (seekHere) row.appendChild(seekBar(v));
  if (d.interrupted) row.appendChild(h('p', { class: 'performance-flag tone-critical label' }, [icon('route-lost', { size: 12 }), `Interrupted at ${fmt.time(d.positionSec)} — muted`]));
  return row;
}

function seekBar(v) {
  const t = perfData.seek.targetSec;
  return h('div', { class: 'performance-seekbar ink-backing', role: 'group', 'aria-label': 'Seek preview, deck A' }, [
    h('p', { class: 'body performance-seekbar__text' }, [icon('seek', { size: 14 }), h('span', {}, ['Preview only — A keeps playing at ', h('strong', { class: 'numeral', text: fmt.time(v.s.decks.A.positionSec) }), '.'])]),
    button({ label: `Seek to ${fmt.time(t)}`, icon: 'seek', cls: 'btn--primary performance-seekbar__commit', fr: ['FR-014'], on: { click: () => v.ctx.setState('seeked') } }),
    button({ label: 'Cancel preview', fr: ['FR-014'], on: { click: () => v.ctx.setState('playing') } }),
  ]);
}

function otherDecks(v) {
  const { s } = v;
  const others = ['A', 'B', 'C', 'D'].filter((L) => s.decks[L].enabled && !v.pair.includes(L));
  const box = h('div', { class: 'performance-others', role: 'group', 'aria-label': 'Decks outside the focused pair' });
  for (const L of others) {
    const d = s.decks[L];
    const detail = d.state === 'playing' && d.loop?.active ? `playing in loop ${d.loop.bars}` : d.state === 'loading' ? 'loading — not yet acknowledged' : stateWord(d).toLowerCase();
    box.appendChild(h('p', { class: `performance-others__row deck-${L.toLowerCase()}` }, [
      h('span', { class: 'performance-chip numeral', text: L }),
      h('span', { class: 'performance-others__title truncate', text: deckLabel(d) }),
      h('span', { class: 'performance-others__state label', text: `${L} ${detail}` }),
    ]));
  }
  const pairBtns = h('div', { class: 'performance-others__pairs' });
  for (const [p, st] of [['A/B', 'four-deck'], ['C/D', 'four-deck-cd']]) {
    const current = v.pair.join('/') === p;
    pairBtns.appendChild(button({ label: `Focus ${p}`, fr: ['FR-012'], cls: current ? 'performance-pair--current' : '', attrs: { 'aria-label': `Focus pair ${p}`, 'aria-pressed': String(current) }, on: { click: () => { if (!current) v.ctx.setState(st); } } }));
  }
  pairBtns.appendChild(button({ label: 'Focus map', icon: 'deck-focus', fr: ['FR-012'], on: { click: () => v.ctx.navigate('perform/focus-map', { state: 'four-deck' }) } }));
  box.appendChild(pairBtns);
  return box;
}

function focusArea(v, d) {
  const { st, s } = v;
  const L = d.letter;
  const loaded = !!d.track && d.state !== 'loading' && d.state !== 'missing';
  const routeLost = s.route.status === 'lost' || st === 'route-lost';
  const area = h('section', { class: `performance-focus glass deck-${L.toLowerCase()}`, 'aria-label': `Focused deck ${L}` });

  // Header: deck identity + the two deliberate actions (Load next, Preview seek).
  const head = h('div', { class: 'performance-focus__head' }, [
    h('p', { class: 'performance-focus__id' }, [h('span', { class: 'performance-chip numeral', text: L }), h('span', { class: 'label label-strong', text: `Deck ${L} · in focus` })]),
  ]);
  head.appendChild(focusActions(v, d));
  area.appendChild(head);

  // Detailed waveform (beat grid, nudge / scrub, explicit scratch).
  const heldScratch = st === 'held-scratch' && L === perfData.heldScratch.deck;
  area.appendChild(h('mdj-waveform', {
    track: d.track ? d.track.id : null, deck: L, mode: 'detailed', position: d.positionSec, zoom: 8, height: 60,
    state: d.state === 'loading' ? 'loading' : heldScratch ? 'held-scratch' : d.state === 'playing' ? 'playing' : null,
  }));

  // Hot cues: bank 1 of 2, four visible pads, + loops / beat jump access.
  const cues = h('div', { class: 'performance-cues', role: 'group', 'aria-label': `Hot cues, deck ${L}, bank 1 of 2` });
  cues.appendChild(h('p', { class: 'performance-cues__bank label' }, [h('span', { text: 'Hot cues' }), h('span', { class: 'numeral', text: 'Bank 1/2' })]));
  const pads = h('div', { class: 'performance-cues__pads' });
  for (const p of padModels(v, d)) pads.appendChild(p);
  cues.appendChild(pads);
  area.appendChild(cues);

  // Jog + toggles.
  const jogRow = h('div', { class: 'performance-jogrow' });
  jogRow.appendChild(jogFor(v, d, 160));
  const side = h('div', { class: 'performance-side' });
  const tg = h('div', { class: 'performance-toggles', role: 'group', 'aria-label': `Deck ${L} modes` }, [
    toggle({ label: 'Sync', name: `Sync, deck ${L}`, pressed: d.sync, deck: L, fr: ['FR-016'], iconName: 'sync', disabled: !loaded || routeLost, reason: !loaded ? 'no track' : 'output lost' }),
    toggle({ label: 'Key lock', name: `Key lock, deck ${L}`, pressed: d.keylock, deck: L, fr: ['FR-015'], iconName: 'keylock', disabled: !loaded, reason: 'no track' }),
    toggle({ label: 'Slip', name: `Slip, deck ${L}`, pressed: d.slip, deck: L, fr: ['FR-019'], iconName: 'slip', disabled: !loaded, reason: 'no track' }),
    toggle({ label: `Quantize ${d.quantize || '1/4'}`, name: `Quantize ${d.quantize || '1/4'} beat, deck ${L}`, pressed: true, deck: L, fr: ['FR-017'], iconName: 'quantize' }),
  ]);
  side.appendChild(tg);
  side.appendChild(button({ label: 'Loops · Beat jump', icon: 'loop', fr: ['FR-018'], cls: 'performance-side__loops', attrs: { 'aria-label': `Loops and beat jump, deck ${L}` }, on: { click: () => v.ctx.navigate('pads/loops') } }));
  if (heldScratch) side.appendChild(h('p', { class: 'performance-held body ink-backing', role: 'status' }, [
    h('strong', { text: 'Held · scratch on A. ' }), `Slip on: the track continues underneath at ${fmt.time(d.positionSec + 5)} (fixture) and resumes there on release.`,
  ]));
  else side.appendChild(phaseFor(v, d));
  jogRow.appendChild(side);
  area.appendChild(jogRow);
  if (st === 'pending-quantized') area.appendChild(h('p', { class: 'performance-pendingnote body ink-backing', role: 'status' }, [
    h('strong', { text: 'Hot cue 3 waits for the next beat (Q · 1 beat). ' }), 'A keeps playing until the engine executes it. Tap the pad again to cancel.',
  ]));
  if (d.state === 'loading') area.appendChild(h('p', { class: 'performance-pendingnote body ink-backing', role: 'status', text: `Loading ${d.track?.title || ''} — the engine has not acknowledged the load yet. Progress unknown.` }));
  return area;
}

function focusActions(v, d) {
  const { st, ctx } = v;
  const box = h('div', { class: 'performance-focus__actions' });
  const fromPlaying = ['playing', 'seeked', 'pending-quantized'].includes(st);
  if (fromPlaying && d.letter === 'A') {
    box.appendChild(button({ label: 'Load next', icon: 'import', fr: ['FR-035'], attrs: { title: 'Load the selected library track (COPPER SKY) to the focused deck' }, on: { click: () => ctx.setState('protected-load') } }));
    box.appendChild(button({ label: 'Preview seek', icon: 'seek-lock', fr: ['FR-014'], on: { click: () => ctx.setState('seek-preview') } }));
  } else {
    box.appendChild(button({ label: 'Library', icon: 'library', attrs: { 'aria-label': `Open library to load deck ${d.letter}` }, on: { click: () => ctx.navigate('launch/library') } }));
  }
  return box;
}

function padModels(v, d) {
  const L = d.letter, out = [];
  const cues = d.track?.cues || [];
  for (let n = 1; n <= 4; n++) {
    const c = cues.find((x) => x.n === n);
    const attrs = { mode: 'cue', n, deck: L, bank: 1, size: 56, quantized: '1 beat' };
    if (!d.track || d.state === 'empty') Object.assign(attrs, { state: 'disabled', reason: 'No track' });
    else if (d.state === 'loading') Object.assign(attrs, { state: 'disabled', reason: 'Loading' });
    else if (d.state === 'missing') Object.assign(attrs, { state: 'unavailable', reason: 'Missing' });
    else if (!c) Object.assign(attrs, { state: 'empty' });
    else Object.assign(attrs, { label: c.name, color: c.color, state: v.st === 'pending-quantized' && L === 'A' && n === 3 ? 'pending' : 'loaded' });
    out.push(h('mdj-pad', attrs));
  }
  return out;
}

function jogFor(v, d, size) {
  const held = v.st === 'held-scratch' && d.letter === perfData.heldScratch.deck;
  const pos = d.track ? (held ? perfData.heldScratch.positionFraction : d.positionSec / d.track.durationSec) : 0;
  return h('mdj-jog', {
    deck: d.letter, size, mode: size >= 200 ? 'vinyl' : 'explicit-scratch', position: Math.round(pos * 1000) / 1000,
    playing: d.state === 'playing' ? true : null, track: d.track ? d.track.title : '',
    'slip-marker': held ? perfData.heldScratch.slipMarker : null,
    state: !d.track || d.state === 'loading' || d.state === 'missing' || d.state === 'empty' ? 'disabled' : held ? 'held-scratch' : null,
  });
}

function phaseFor(v, d) {
  if (!d.track || d.state === 'loading') return h('span', { hidden: true });
  const other = v.s.decks[d.letter === v.pair[0] ? v.pair[1] : v.pair[0]];
  const leader = d.sync && other?.state === 'playing' ? other.letter : 'self';
  const beat = Math.floor((d.positionSec * d.track.bpm) / 60);
  return h('mdj-beat-phase', {
    deck: d.letter, beat: (beat % 4) + 1, bar: Math.floor(beat / 4) + 1, phase: d.sync ? 0.02 : 0, leader,
    state: d.track.gridConfidence === 'low' ? 'drifting' : d.sync ? 'synced' : 'idle',
  });
}

function workspaceLinks(v, items, compact = true) {
  const ws = h('mdj-workspace-switcher', { class: 'performance-ws', items, current: 'perform', max: 5, compact: compact ? true : null });
  return workspaceNav(v.ctx, ws);
}

// ---------------------------------------------------------------- landscape

function landscapeSurface(v) {
  const { s, st } = v;
  const wrap = h('div', { class: 'performance-land' });
  wrap.appendChild(rail(v));
  const lanes = h('section', { class: 'performance-lanes', 'aria-label': 'Waveform lanes' });
  for (const L of v.pair) lanes.appendChild(laneRow(v, s.decks[L]));
  wrap.appendChild(lanes);
  if (st === 'empty') {
    wrap.appendChild(h('mdj-empty-state', {
      class: 'performance-empty performance-empty--land', icon: 'library', title: 'No tracks loaded', state: 'idle',
      body: 'Choose a track in the library, then pick Load A or Load B. Demo media is labelled as demo.',
      actions: JSON.stringify([{ id: 'library', label: 'Open library', icon: 'library', primary: true }, { id: 'demo', label: 'Use demo media', icon: 'demo' }]),
    }));
    return wrap;
  }
  wrap.appendChild(deckWorkspace(v, s.decks[v.pair[0]], 'left'));
  wrap.appendChild(miniMixer(v));
  wrap.appendChild(deckWorkspace(v, s.decks[v.pair[1]], 'right'));
  wrap.appendChild(secondaryBand(v));
  return wrap;
}

function rail(v) {
  const box = h('nav', { class: 'performance-rail', 'aria-label': 'Workspaces and panels' });
  box.appendChild(workspaceLinks(v, 'library,pads,fx,stems', false));
  box.appendChild(button({ label: 'Mixer', icon: 'eq', cls: 'performance-rail__btn', fr: ['FR-020'], attrs: { 'aria-label': 'Full mixer (EQ, cue, assignment)' }, on: { click: () => v.ctx.navigate('perform/mixer') } }));
  box.appendChild(button({ label: 'Master', icon: 'master', cls: 'performance-rail__btn', fr: ['FR-021'], on: { click: () => v.ctx.navigate('perform/master', { state: v.st === 'clipping' ? 'clipping' : null }) } }));
  return box;
}

function laneRow(v, d) {
  const seekHere = v.st === 'seek-preview' && d.letter === perfData.seek.deck;
  const audible = isAudible(d);
  const held = v.st === 'held-scratch' && d.letter === perfData.heldScratch.deck;
  const label = h('div', { class: 'performance-lane__id ink-backing' }, [
    h('span', { class: 'performance-chip numeral', text: d.letter }),
    h('span', { class: 'performance-lane__text' }, [
      h('span', { class: 'performance-lane__title truncate', text: deckLabel(d) }),
      h('span', { class: 'performance-lane__meta numeral' }, d.track ? [
        h('span', { text: `${fmt.bpm(d.track.bpm * (1 + (d.pitchPct || 0) / 100))} BPM` }),
        h('span', { text: d.track.key }),
        h('span', { text: fmt.time(d.remainingSec, { remaining: true }) }),
        h('span', { class: 'label', text: stateWord(d) }),
      ] : [h('span', { class: 'label', text: d.state === 'loading' ? 'Loading' : 'Empty' })]),
    ]),
  ]);
  const lane = h('mdj-waveform', {
    track: d.track ? d.track.id : null, deck: d.letter, mode: seekHere ? 'overview' : 'detailed', zoom: 8, position: d.positionSec, height: 36, 'no-head': true,
    markers: seekHere ? 'cues loops phrases' : 'cues loops grid', 'seek-lock': seekHere || (audible && false) ? true : null, 'seek-target': seekHere ? perfData.seek.targetSec : null,
    state: d.state === 'loading' ? 'loading' : seekHere ? 'seek-preview' : held ? 'held-scratch' : d.state === 'playing' ? 'playing' : null,
  });
  return h('div', { class: `performance-lane deck-${d.letter.toLowerCase()}`, dataset: { deck: d.letter } }, [label, lane]);
}

function deckWorkspace(v, d, side) {
  const { st, s } = v;
  const L = d.letter;
  const loaded = !!d.track && !['loading', 'missing', 'empty'].includes(d.state);
  const routeLost = s.route.status === 'lost';
  const ws = h('section', { class: `performance-deck performance-deck--${side} deck-${L.toLowerCase()}${L === v.focus ? ' performance-deck--focus' : ''}`, 'aria-label': `Deck ${L} workspace` });
  // Row 1: hot cues bank 1 (or the seek commit row while a seek preview is pending on this deck).
  if (st === 'seek-preview' && L === perfData.seek.deck) {
    ws.appendChild(h('div', { class: 'performance-deck__seek', role: 'group', 'aria-label': 'Seek preview, deck A' }, [
      button({ label: `Seek to ${fmt.time(perfData.seek.targetSec)}`, icon: 'seek', cls: 'btn--primary', fr: ['FR-014'], on: { click: () => v.ctx.setState('seeked') } }),
      button({ label: 'Cancel preview', fr: ['FR-014'], on: { click: () => v.ctx.setState('playing') } }),
    ]));
  } else {
    const pads = h('div', { class: 'performance-deck__pads', role: 'group', 'aria-label': `Hot cues, deck ${L}, bank 1 of 2` });
    for (const p of padModels(v, d)) pads.appendChild(p);
    ws.appendChild(pads);
  }
  // Row 2: jog with its alternatives beside it, then Sync / Cue / Play.
  const body = h('div', { class: 'performance-deck__body' });
  body.appendChild(jogFor(v, d, 128));
  const tp = h('div', { class: 'performance-deck__transport' });
  tp.appendChild(h('mdj-transport', { kind: 'sync', deck: L, size: 48, state: !loaded || routeLost ? 'disabled' : d.sync ? 'active' : 'idle' }));
  const cueState = !loaded ? 'disabled' : d.cueSelected ? 'active' : 'idle';
  const playState = !loaded ? 'disabled' : d.interrupted ? 'interrupted' : d.state === 'playing' ? 'playing' : 'paused';
  tp.appendChild(h('mdj-transport', { kind: 'cue', deck: L, size: 56, state: cueState }));
  tp.appendChild(h('mdj-transport', { kind: 'play', deck: L, size: 56, state: playState }));
  body.appendChild(tp);
  ws.appendChild(body);
  if (d.state === 'loading') ws.appendChild(h('p', { class: 'performance-deck__note body ink-backing', role: 'status', text: `Loading ${d.track?.title || ''}: not yet acknowledged; progress unknown.` }));
  if (st === 'pending-quantized' && L === 'A') ws.appendChild(h('p', { class: 'performance-deck__note body ink-backing', role: 'status', text: 'Cue 3 waits for the next beat (Q). Tap it again to cancel.' }));
  if (st === 'held-scratch' && L === perfData.heldScratch.deck) ws.appendChild(h('p', { class: 'performance-deck__note body ink-backing', role: 'status', text: `Held scratch · Slip on: continues at ${fmt.time(d.positionSec + 5)} (fixture) on release.` }));
  return ws;
}

function miniMixer(v) {
  const { s } = v;
  const [a, b] = v.pair.map((L) => s.decks[L]);
  const lost = s.route.status === 'lost';
  const strip = (d, side) => {
    const L = d.letter;
    const off = !d.track || d.state === 'empty' || d.state === 'loading';
    const dials = h('div', { class: 'performance-mix__dials' }, [
      h('mdj-dial', { kind: 'gain', deck: L, label: 'Trim', value: d.gainDb || 0, size: 40, state: lost ? 'disabled' : null }),
      h('mdj-dial', { kind: 'filter', deck: L, label: 'Filter', value: d.filter || 0, size: 40, state: lost ? 'disabled' : null }),
    ]);
    const meter = h('mdj-meter', { class: 'performance-mix__meter', kind: 'channel', deck: L, l: d.levelL, r: d.levelR, orientation: 'vertical', scale: 'compact', label: `Ch ${L}`, state: lost ? 'muted' : d.levelL > 0 ? 'active' : 'idle' });
    const fader = h('mdj-fader', { deck: L, value: d.fader ?? 1, label: `CH ${L}`, height: 112, scale: 'off', state: lost ? 'disabled' : d.muted ? 'muted' : null });
    return h('div', { class: `performance-mix__strip performance-mix__strip--${side} deck-${L.toLowerCase()}`, role: 'group', 'aria-label': `Channel ${L}${off ? ' (no track)' : ''}` },
      side === 'left' ? [dials, meter, fader] : [fader, meter, dials]);
  };
  const xf = h('mdj-crossfader', { value: s.crossfader, 'assign-a': v.pair[0], 'assign-b': v.pair[1], curve: 'equal-power', compact: true, state: lost ? 'disabled' : null });
  return h('section', { class: 'performance-mix glass', 'aria-label': 'Mixer' }, [
    h('div', { class: 'performance-mix__strips' }, [strip(a, 'left'), strip(b, 'right')]),
    xf,
  ]);
}

function secondaryBand(v) {
  const { s, st, ctx } = v;
  const band = h('section', { class: 'performance-band', 'aria-label': 'Deck actions' });
  for (const L of v.pair) {
    const d = s.decks[L];
    const loaded = !!d.track && !['loading', 'missing', 'empty'].includes(d.state);
    const row = h('div', { class: `performance-band__deck deck-${L.toLowerCase()}`, role: 'group', 'aria-label': `Deck ${L} actions` }, [
      h('span', { class: 'performance-chip numeral', text: L }),
      toggle({ label: 'Key lock', name: `Key lock, deck ${L}`, pressed: d.keylock, deck: L, fr: ['FR-015'], iconName: 'keylock', disabled: !loaded, reason: 'no track' }),
      toggle({ label: 'Slip', name: `Slip, deck ${L}`, pressed: d.slip, deck: L, fr: ['FR-019'], iconName: 'slip', disabled: !loaded, reason: 'no track' }),
      toggle({ label: `Q ${d.quantize || '1/4'}`, name: `Quantize ${d.quantize || '1/4'} beat, deck ${L}`, pressed: true, deck: L, fr: ['FR-017'], iconName: 'quantize' }),
      button({ label: 'Loops', icon: 'loop', fr: ['FR-018'], attrs: { 'aria-label': `Loops and beat jump, deck ${L}` }, on: { click: () => ctx.navigate('pads/loops') } }),
    ]);
    if (L === 'A' && ['playing', 'seeked', 'pending-quantized'].includes(st)) {
      row.appendChild(button({ label: 'Load next', icon: 'import', fr: ['FR-035'], on: { click: () => ctx.setState('protected-load') } }));
      row.appendChild(button({ label: 'Preview seek', icon: 'seek-lock', fr: ['FR-014'], on: { click: () => ctx.setState('seek-preview') } }));
    }
    band.appendChild(row);
  }
  if (s.deckCount > 2) {
    const others = ['A', 'B', 'C', 'D'].filter((L) => s.decks[L].enabled && !v.pair.includes(L));
    const o = h('div', { class: 'performance-band__others', role: 'group', 'aria-label': 'Other decks' });
    for (const L of others) {
      const d = s.decks[L];
      o.appendChild(h('span', { class: `performance-band__other deck-${L.toLowerCase()} label` }, [h('span', { class: 'performance-chip numeral', text: L }), d.state === 'playing' && d.loop?.active ? `${L} playing in loop ${d.loop.bars}` : `${L} ${stateWord(d).toLowerCase()}`]));
    }
    for (const [p, stt] of [['A/B', 'four-deck'], ['C/D', 'four-deck-cd']]) {
      const current = v.pair.join('/') === p;
      o.appendChild(button({ label: `Focus ${p}`, fr: ['FR-012'], attrs: { 'aria-label': `Focus pair ${p}`, 'aria-pressed': String(current) }, on: { click: () => { if (!current) ctx.setState(stt); } } }));
    }
    o.appendChild(button({ label: 'Focus map', icon: 'deck-focus', fr: ['FR-012'], on: { click: () => ctx.navigate('perform/focus-map', { state: 'four-deck' }) } }));
    band.appendChild(o);
  }
  band.appendChild(fixtureNote('Waveforms, levels, phase and positions are fixtures. Controls show SENT until the prototype stands in for the engine and acknowledges.'));
  return band;
}

// ---------------------------------------------------------------- wiring

function wireAB(root, v) {
  const { ctx, st } = v;
  standInEngine(root);
  // Content transports (landscape): Play deck A from set-ready and Play deck B from b-loaded are the
  // declared paths; others get the generic SENT → acknowledged stand-in.
  const transportPath = (d) => (d.kind === 'play' && ((st === 'set-ready' && d.deck === 'A') || (st === 'b-loaded' && d.deck === 'B')));
  root.addEventListener('mdj:transport', (e) => {
    if (!transportPath(e.detail || {})) return;
    e.target.setAttribute('state', 'pending');
    ctx.setState(st === 'set-ready' ? 'playing' : 'transition');
  });
  standInTransport(root, { exclude: transportPath });
  // Pads: hot cue 3 on A from playing queues a quantized jump; tapping it again while pending cancels.
  root.addEventListener('mdj:pad', (e) => {
    const d = e.detail || {};
    if (d.deck === 'A' && Number(d.n) === 3 && st === 'playing') { ctx.setState('pending-quantized'); return; }
    if (d.deck === 'A' && Number(d.n) === 3 && st === 'pending-quantized') { ctx.setState('playing'); return; }
    const pad = e.target.closest('mdj-pad');
    if (!pad || pad.getAttribute('state') !== 'loaded') return;
    pad.setAttribute('state', 'pending');
    setTimeout(() => { if (pad.isConnected) pad.setAttribute('state', 'loaded'); }, 900);
  });
  // Jog: the Scratch / Nudge mode toggle is a view setting acknowledged at once; nudge taps print SENT.
  root.addEventListener('mdj:jog-mode', (e) => { const j = e.target.closest('mdj-jog'); if (j && e.detail?.mode) j.setAttribute('mode', e.detail.mode); });
  root.addEventListener('mdj:jog', (e) => {
    const j = e.target.closest('mdj-jog');
    if (!j || e.detail?.phase !== 'tap') return;
    j.setAttribute('state', 'pending');
    setTimeout(() => { if (j.isConnected && j.getAttribute('state') === 'pending') j.removeAttribute('state'); }, ACK_MS);
  });
  // Waveforms: an overview drag with Seek Lock shows its own target and commit button; zoom is view state.
  root.addEventListener('mdj:seek-preview', (e) => {
    const d = e.detail || {};
    if (d.phase !== 'end' || !d.seekLock) return;
    const commit = root.querySelector('.performance-seekbar__commit .btn-label');
    if (commit) commit.textContent = `Seek to ${fmt.time(d.sec)}`;
    else if (st === 'playing') ctx.setState('seek-preview');
  });
  root.addEventListener('mdj:zoom', (e) => { if (e.detail?.phase === 'end' && e.target.setAttribute) e.target.setAttribute('zoom', e.detail.bars); });
  root.addEventListener('mdj:action', (e) => {
    const id = e.detail?.id;
    if (id === 'library') ctx.navigate('launch/library');
    if (id === 'demo') ctx.navigate('launch/open');
  });
  // Shell dock (portrait): Play deck A / Play deck B advance the declared paths; deck tabs change the
  // focused deck (view only); a held scratch defers a focus change until release.
  withShell(root, (shell) => {
    standInEngine(shell.querySelector('.shell__dock') || shell);
    shell.addEventListener('mdj:transport', (e) => {
      const d = e.detail || {};
      if (!e.target.closest('.shell__dock')) return;
      if (transportPath(d)) { e.target.setAttribute('state', 'pending'); ctx.setState(st === 'set-ready' ? 'playing' : 'transition'); return; }
      const t = e.target, prev = t.getAttribute('state') || 'idle';
      if (prev === 'disabled' || prev === 'pending') return;
      t.setAttribute('state', 'pending');
      setTimeout(() => { if (t.isConnected) t.setAttribute('state', d.kind === 'play' ? (prev === 'playing' ? 'paused' : 'playing') : prev === 'active' ? 'idle' : 'active'); }, ACK_MS);
    });
    shell.addEventListener('mdj:focus-deck', (e) => {
      const L = e.detail?.deck;
      if (!L) return;
      if (st === 'held-scratch' && L !== perfData.heldScratch.deck) { showDeferred(root, L); return; }
      if (st === 'set-ready' && L === 'B') { ctx.setState('focus-b'); return; }
      if (st === 'focus-b' && L === 'A') { ctx.setState('set-ready'); return; }
      if (st.startsWith('four-deck')) {
        const target = { A: 'four-deck', B: 'four-deck', C: 'four-deck-cd', D: 'four-deck-cd' }[L];
        if (!v.pair.includes(L)) ctx.setState(target);
        return;
      }
      refocus(root, v, L);
    });
  });
}

function showDeferred(root, L) {
  const old = root.querySelector('.performance-deferred');
  if (old) old.remove();
  root.appendChild(h('mdj-toast', { class: 'performance-toast performance-deferred', tone: 'info', icon: 'hand', message: `Focus change to Deck ${L} waits`, detail: 'The held scratch on A keeps its deck until you lift your finger.', state: 'visible' }));
}

// View-only focus change inside the pair: re-render the focused area for the other deck.
function refocus(root, v, L) {
  if (!v.pair.includes(L) || v.focus === L || v.land) return;
  const area = root.querySelector('.performance-focus');
  if (!area) return;
  v.focus = L;
  area.replaceWith(focusArea(v, v.s.decks[L]));
  root.querySelectorAll('.performance-ov').forEach((r) => r.classList.toggle('performance-ov--focus', r.dataset.deck === L));
}

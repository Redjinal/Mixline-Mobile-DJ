// launch/library — the docked browser for live browsing (Document 03 §1 "the browser docks within the
// remaining space", §3 "Live browsing"; Document 14 §4 "Search": result types are visibly distinct;
// FR-004 / FR-005 / FR-010 / FR-035 / FR-036). Shell screen, dock on in both orientations: transport,
// crossfader, route and master stay reachable while browsing.
//
// A tap on a row SELECTS (mdj-library-row); loading is the separate Load A / B / C / D choice
// (mdj-load-target). An audible deck is "Playing — protected": its Load button opens a confirm sheet
// instead of loading. No engine exists: a load is printed SENT; the acknowledged load is shown on the
// Perform screen (protected-load → Load to B → perform/ab), never invented here.
//
// States (scenario a-playing unless noted, so the path browse → selected → protected-load is one world:
// Deck A audible with AURORA DRIVE, Deck B paused with COPPER SKY)
//   browse            All tracks, quick filters with computed counts, crate tabs, sort
//   selected          DRIFT HOUR selected → Load A (protected) / B / … below it (landscape: in the detail pane)
//   search-results    query "co", grouped by result type: local files / downloaded / unavailable / online
//   no-results        query "zzz" with two filters: Clear search and filters / Import / Search sources
//   offline           offline scenario: local results only; online sources marked unavailable
//   analysis-pending  Peak crate, GLASSWORK selected: playable, analysis queued, progress unknown
//   keyboard-open     compact search workflow with a simulated soft-keyboard inset guide; dock stays visible
//   protected-load    Load A on the playing deck → confirm sheet: Load to B / Replace A / Cancel
//   long-title        Warm-up crate with the long-title fixture selected (wraps to two lines)
import { register } from '../../app/registry.js';
import { load } from '../../app/fixtures.js';
import { h, icon, button, fmt } from '../../components/base.js';

let LX = null;
const ready = load('launch').then((d) => { LX = d; return d; });
let liveQuery = null; // a query typed in the field (kept across the search-results / no-results re-render)

const FR = ['FR-004', 'FR-005', 'FR-006', 'FR-010', 'FR-035', 'FR-036', 'FR-039'];
const PROTECT_NAME = 'Load DRIFT HOUR to Deck A, playing, protected: asks for confirmation';

const STATES = {
  browse: { label: 'Browse — tap selects, Load is separate', exercised: true, scenario: 'a-playing' },
  selected: { label: 'DRIFT HOUR selected — Load A / B', exercised: true, scenario: 'a-playing', via: { from: 'browse', control: 'Select DRIFT HOUR' } },
  'search-results': { label: 'Search "co" — results by type', exercised: true, scenario: 'a-playing', via: { from: 'selected', control: 'Search co' } },
  'no-results': { label: 'No results — "zzz" with filters', exercised: true, scenario: 'a-playing', via: { from: 'browse', control: 'Search zzz' } },
  offline: { label: 'Offline — local results only', exercised: false, scenario: 'offline' },
  'analysis-pending': { label: 'Analysis pending — GLASSWORK', exercised: false, scenario: 'a-playing' },
  'keyboard-open': { label: 'Keyboard open — compact search', exercised: false, scenario: 'a-playing' },
  'protected-load': { label: 'Protected load — Deck A is playing', exercised: true, scenario: 'a-playing', via: { from: 'selected', control: PROTECT_NAME } },
  'long-title': { label: 'Long title selected', exercised: false, scenario: 'a-playing' },
};

const SETUP = {
  browse: { crate: 'all' },
  selected: { crate: 'all', selected: 'drift' },
  'search-results': { crate: 'all', query: 'co' },
  'no-results': { crate: 'all', query: 'zzz', filters: ['ready', 'key'] },
  offline: { crate: 'all' },
  'analysis-pending': { crate: 'crate-peak', selected: 'glasswork' },
  'keyboard-open': { crate: 'all', query: 'harbour', keyboard: true },
  'protected-load': { crate: 'all', selected: 'drift', sheet: 'drift' },
  'long-title': { crate: 'crate-warmup', selected: 'longtitle' },
};

register({
  id: 'launch/library',
  family: 'launch',
  title: 'Library — docked browser',
  order: 3,
  fr: FR,
  shell: true,
  dock: { portrait: true, landscape: true },
  states: STATES,
  defaultState: 'browse',
  render(ctx) {
    const root = h('div', { class: `launch-lib launch-lib--${ctx.state} launch-lib--${ctx.orientation}` });
    const fill = () => mount(ctx, root);
    if (LX) fill(); else ready.then(fill);
    return root;
  },
});

// ---------------------------------------------------------------- data helpers
function libraryTracks(fx) { return fx.tracks.filter((t) => t.source !== 'demo' && t.availability !== 'discovered'); }
function onlineCandidates(fx) { return fx.tracks.filter((t) => t.availability === 'discovered'); }
function matches(t, q) {
  if (!q) return true;
  const hay = [t.title, t.artist, t.album, (t.tags || []).join(' '), t.analysis === 'complete' ? t.key : ''].join(' ').toLowerCase();
  return hay.includes(q.toLowerCase());
}
function decksOf(session) {
  const enabled = Object.values(session.decks).filter((d) => d.enabled);
  return {
    letters: enabled.map((d) => d.letter),
    occupied: enabled.filter((d) => d.track).map((d) => d.letter),
    audible: enabled.filter((d) => d.state === 'playing').map((d) => d.letter),
    playingOn: (id) => enabled.find((d) => d.track?.id === id && d.state === 'playing')?.letter || '',
    focus: session.focus?.[0] || 'A',
  };
}
function filterDefs(ctx) {
  const deckA = ctx.session.decks.A?.track;
  const refKey = deckA?.analysis === 'complete' ? deckA.key : '8A';
  const compat = new Set(LX.camelotCompatible[refKey] || [refKey]);
  return [
    { id: 'bpm', label: 'BPM 120–128', test: (t) => t.analysis === 'complete' && t.bpm >= 120 && t.bpm <= 128 },
    { id: 'key', label: `Key fits A (${refKey})`, test: (t) => t.analysis === 'complete' && compat.has(t.key) },
    { id: 'ready', label: 'Ready', test: (t) => t.availability === 'ready' },
    { id: 'unplayed', label: 'Not played', test: (t) => !t.playedCount },
  ];
}
const SORTS = [
  { id: 'title', label: 'Title', fn: (a, b) => a.title.localeCompare(b.title) },
  { id: 'bpm', label: 'BPM', fn: (a, b) => (a.analysis === 'complete' ? a.bpm : 999) - (b.analysis === 'complete' ? b.bpm : 999) },
  { id: 'played', label: 'Most played', fn: (a, b) => (b.playedCount || 0) - (a.playedCount || 0) },
];

// ---------------------------------------------------------------- mount
function mount(ctx, root) {
  const fx = ctx.fixtures;
  const setup = SETUP[ctx.state] || SETUP.browse;
  const query = (ctx.state === 'search-results' || ctx.state === 'no-results') && liveQuery != null ? liveQuery : (setup.query || '');
  const view = { crate: setup.crate, selected: setup.selected || null, filters: new Set(setup.filters || []), sort: 0, sheet: setup.sheet || null, sent: null };
  const landscape = ctx.orientation === 'landscape';
  const offline = ctx.session.network === 'offline';
  const decks = decksOf(ctx.session);
  const defs = filterDefs(ctx);
  const crates = [{ id: 'all', name: 'All' }, ...fx.library.crates.map((c) => ({ id: c.id, name: c.demo ? 'Demo' : c.name, crate: c }))];

  const scopeTracks = () => {
    const base = view.crate === 'all' ? libraryTracks(fx) : (fx.library.crates.find((c) => c.id === view.crate)?.trackIds || []).map((id) => fx.track(id)).filter(Boolean);
    return base;
  };
  const visible = () => {
    let list = scopeTracks().filter((t) => matches(t, query));
    for (const f of defs) if (view.filters.has(f.id)) list = list.filter(f.test);
    return list.slice().sort(SORTS[view.sort].fn);
  };

  // ---- regions (rebuilt by paint) ----
  const tabsEl = h('div', { class: 'launch-lib__tabs', role: 'tablist', 'aria-label': 'Crates' });
  const searchEl = h('div', { class: 'launch-lib__search' });
  const stripEl = h('div', { class: 'launch-lib__strip' });
  const listEl = h('div', { class: 'launch-lib__rows', role: 'listbox', 'aria-label': 'Tracks', 'aria-multiselectable': 'false' });
  const preEl = h('div', { class: 'launch-lib__pre' });
  const scrollEl = h('div', { class: 'launch-lib__list' }, [preEl, stripEl, listEl]);
  const detailEl = landscape && !setup.keyboard ? h('aside', { class: 'launch-lib__detail glass', 'aria-label': 'Selected track' }) : null;
  const overlayEl = h('div', { class: 'launch-lib__overlay' });
  const live = h('p', { class: 'launch-sr', role: 'status', 'aria-live': 'polite' });

  function paint() {
    const list = visible();
    // crate tabs
    tabsEl.replaceChildren(...crates.map((c) => h('button', {
      type: 'button', role: 'tab', class: `launch-lib__tab${view.crate === c.id ? ' is-current' : ''}`, 'aria-selected': String(view.crate === c.id), dataset: { hit: '48', fr: 'FR-005' },
      on: { click: () => { view.crate = c.id; view.selected = null; paint(); live.textContent = `Showing ${c.name}`; } },
    }, [c.crate?.demo ? icon('demo', { size: 14 }) : null, h('span', { text: c.name }), h('span', { class: 'numeral launch-lib__tabcount', text: String(c.id === 'all' ? libraryTracks(fx).length : c.crate.trackIds.length) })])));

    // search bar
    const sbState = offline ? 'offline' : query ? (list.length ? 'results' : 'no-results') : 'idle';
    const sb = h('mdj-search-bar', { value: query, placeholder: 'Search title, artist, key, tag', scope: 'Library', count: String(list.length), filters: String(view.filters.size), state: ctx.state === 'keyboard-open' ? 'focused' : sbState, compact: true });
    const sortBtn = button({ label: `Sort: ${SORTS[view.sort].label}`, icon: 'sort', cls: 'btn--ghost launch-lib__sort', fr: ['FR-004'], on: { click: () => { view.sort = (view.sort + 1) % SORTS.length; paint(); live.textContent = `Sorted by ${SORTS[view.sort].label}`; } } });
    searchEl.replaceChildren(sb);

    // quick strip: next in queue, recent searches, filters
    const strip = [];
    const nextId = ctx.session.session?.queue?.[0];
    const next = nextId ? fx.track(nextId) : null;
    if (!query && next && (ctx.state === 'browse' || ctx.state === 'selected' || ctx.state === 'offline')) {
      strip.push(h('span', { class: 'label launch-lib__striplabel', text: 'Next in queue' }));
      strip.push(button({ label: `Select ${next.title}`, icon: 'queue', cls: 'btn--secondary launch-lib__quick', fr: ['FR-004'], on: { click: () => { if (next.id === 'drift' && ctx.state === 'browse') ctx.setState('selected'); else { view.selected = next.id; paint(); } } } }));
    }
    if (!setup.keyboard && (ctx.state === 'browse' || ctx.state === 'selected')) {
      strip.push(h('span', { class: 'label launch-lib__striplabel', text: 'Recent' }));
      for (const q of LX.recentSearches) strip.push(h('button', { type: 'button', class: 'btn btn--ghost launch-lib__recent', dataset: { hit: '48', fr: 'FR-004' }, 'aria-label': `Search ${q}`, on: { click: () => runSearch(q) } }, [icon('search', { size: 14 }), h('span', { class: 'btn-label', text: q })]));
    }
    const chips = h('div', { class: 'launch-lib__chips', role: 'group', 'aria-label': `Filters, ${view.filters.size} active` });
    for (const f of defs) {
      const on = view.filters.has(f.id);
      const count = scopeTracks().filter((t) => matches(t, query)).filter(f.test).length;
      const chip = h('mdj-chip', { kind: 'filter', label: f.label, count: String(count), state: on ? 'selected' : 'idle', removable: on ? true : null });
      chips.appendChild(chip);
    }
    if (!setup.keyboard) chips.appendChild(sortBtn);
    if (view.filters.size) chips.appendChild(button({ label: 'Clear filters', icon: 'x', cls: 'btn--ghost', fr: ['FR-004'], on: { click: () => { view.filters.clear(); if (ctx.state === 'no-results') ctx.setState('browse'); else paint(); } } }));
    stripEl.replaceChildren(...[strip.length ? h('div', { class: 'launch-lib__quickrow' }, strip) : null, setup.keyboard ? null : chips].filter(Boolean));

    // list
    listEl.replaceChildren(...buildList(list));
    if (detailEl) detailEl.replaceChildren(...buildDetail());
    overlayEl.replaceChildren(...buildOverlay());
  }

  function row(t, extra = {}) {
    const sel = view.selected === t.id;
    const attrs = {
      track: t.id, decks: decks.letters.join(','), occupied: decks.occupied.join(','), audible: decks.audible.join(','), 'deck-focus': decks.focus,
      'playing-on': decks.playingOn(t.id) || null, selected: sel ? true : null, ...extra,
    };
    if (view.sent && view.sent.trackId === t.id) { attrs.state = 'loading'; attrs['loading-to'] = view.sent.deck; }
    return h('mdj-library-row', attrs);
  }

  function section(title, note, children) {
    return h('div', { class: 'launch-lib__group', role: 'group', 'aria-label': title }, [
      h('p', { class: 'launch-lib__grouphead label' }, [h('span', { class: 'label-strong', text: title }), note ? h('span', { class: 'launch-lib__groupnote', text: ` · ${note}` }) : null]),
      ...children,
    ]);
  }

  function buildList(list) {
    const out = [];
    const pre = [];
    if (offline) pre.push(h('div', { class: 'launch-lib__banner tone-neutral', role: 'status' }, [icon('wifi-off', { size: 16 }), h('span', { class: 'body' }, [h('strong', { text: 'Offline · local results only.' }), ' Everything on this phone plays; online sources and downloads wait for a connection.'])]));
    if (ctx.state === 'analysis-pending') pre.push(h('mdj-section-header', { title: 'Analysis queue', count: '1', note: 'GLASSWORK · progress unknown · plays without a grid', state: 'busy', level: '3' }));
    preEl.replaceChildren(...pre);
    listEl.setAttribute('role', query && !list.length ? 'region' : 'listbox');
    listEl.setAttribute('aria-label', query && !list.length ? 'No results' : 'Tracks');
    if (query && !list.length) {
      const empty = h('mdj-empty-state', {
        state: 'no-results', query, title: `No tracks match "${query}"`,
        body: view.filters.size ? `Searched ${scopeTracks().length} tracks with ${view.filters.size} filters on. Clear them, import more music, or look in online sources.` : 'Check the spelling, import more music, or look in online sources.',
        actions: JSON.stringify([{ id: 'clear', label: 'Clear search and filters', icon: 'x', primary: true }, { id: 'import', label: 'Import music', icon: 'import' }, { id: 'sources', label: 'Search online sources', icon: 'search' }]),
      });
      empty.addEventListener('mdj:action', (e) => {
        if (e.detail.id === 'clear') { liveQuery = null; ctx.setState('browse'); }
        else if (e.detail.id === 'import') ctx.navigate('launch/import', { state: 'picker' });
        else ctx.navigate('sources/add');
      });
      out.push(empty);
      return out;
    }
    if (!query) {
      out.push(...list.map((t) => row(t)));
      if (offline) out.push(onlineSection());
      return out;
    }
    if (setup.keyboard) {
      preEl.replaceChildren(h('mdj-fixture-mark', { for: 'BPM and key' }));
      // Compact search workflow: one 48 dp line per result while the keyboard is up. A tap submits the search
      // (the keyboard closes) and shows the full result rows with their Load targets.
      listEl.setAttribute('role', 'list');
      listEl.setAttribute('aria-label', `Results while typing, ${list.length}`);
      return list.map((t) => {
        const analysed = t.analysis === 'complete';
        const word = t.availability === 'ready' ? (analysed ? 'Ready' : 'Analysis pending') : (t.availability === 'unsupported' ? 'Unsupported' : t.availability === 'missing' ? 'Missing' : 'Needs access');
        return h('div', { role: 'listitem' }, [h('button', { type: 'button', class: 'launch-kbdrow raised', dataset: { hit: '48', fr: 'FR-004' }, 'aria-label': `${t.title}, ${analysed ? `${fmt.bpm(t.bpm)} BPM, key ${t.key}` : 'analysis pending'}, ${word}. Show full result`, on: { click: () => runSearch(query) } }, [
          h('span', { class: 'title truncate launch-kbdrow__title', text: t.title }),
          h('span', { class: 'numeral launch-kbdrow__nums', text: analysed ? `${fmt.bpm(t.bpm)} · ${t.key}` : '— · —' }),
          h('span', { class: `label launch-kbdrow__word${t.availability === 'ready' ? '' : ' tone-critical'}`, text: word }),
        ])]);
      });
    }
    // search results grouped by result type (Document 14 §4)
    const local = list.filter((t) => t.source === 'local' && ['ready'].includes(t.availability));
    const downloaded = list.filter((t) => t.source === 'download');
    const unavailable = list.filter((t) => !['ready'].includes(t.availability));
    if (local.length) out.push(section('Local files', `${local.length} on this phone`, local.map((t) => row(t))));
    if (downloaded.length) out.push(section('Downloaded', `${downloaded.length} · source shown per track`, downloaded.map((t) => row(t))));
    if (unavailable.length) out.push(section('In library, not playable now', `${unavailable.length} · reason shown`, unavailable.map((t) => row(t))));
    out.push(onlineSection());
    return out;
  }

  function onlineSection() {
    const cands = onlineCandidates(fx).filter((t) => matches(t, query));
    const body = [];
    if (offline) {
      body.push(h('p', { class: 'body muted', text: 'Unavailable offline. Online search and download candidates need a connection; nothing here is a file yet.' }));
      for (const t of onlineCandidates(fx)) body.push(candidate(t, true));
    } else if (cands.length) {
      for (const t of cands) body.push(candidate(t, false));
    } else {
      body.push(h('p', { class: 'body muted', text: query ? `Not searched yet. Online results are download candidates, not files.` : 'Search online sources for tracks you do not have yet.' }));
      body.push(button({ label: query ? `Search online sources for "${query}"` : 'Search online sources', icon: 'search', cls: 'btn--secondary', fr: ['FR-004'], on: { click: () => ctx.navigate('sources/add') } }));
    }
    return h('div', { class: 'launch-lib__group launch-lib__online', role: 'group', 'aria-label': 'Online sources' }, [
      h('p', { class: 'launch-lib__grouphead label' }, [icon(offline ? 'cloud-off' : 'cloud', { size: 14 }), h('span', { class: 'label-strong', text: ' Online sources' }), h('span', { class: 'launch-lib__groupnote', text: offline ? ' · unavailable offline' : ' · download candidates' })]),
      ...body,
    ]);
  }

  function candidate(t, off) {
    return h('div', { class: `launch-cand raised${off ? ' launch-cand--off' : ''}` }, [
      h('mdj-art', { seed: t.id, size: 40, label: t.title }),
      h('div', { class: 'launch-cand__body' }, [
        h('span', { class: 'title launch-cand__title truncate', text: t.title }),
        h('span', { class: 'body muted truncate', text: `${t.artist} · requested ${t.requestedSource} · actual ${t.actualSource}` }),
        h('span', { class: 'launch-cand__chips' }, [h('mdj-chip', { kind: 'availability', value: 'discovered', size: 'sm' }), off ? h('span', { class: 'flag label tone-neutral' }, [icon('cloud-off', { size: 11 }), 'Unavailable offline']) : null]),
      ]),
      off ? null : button({ label: 'Resolve', icon: 'link', cls: 'btn--secondary', fr: ['FR-049'], attrs: { 'aria-label': `Resolve ${t.title} in Sources` }, on: { click: () => ctx.navigate('sources/resolve') } }),
    ]);
  }

  function buildDetail() {
    const t = view.selected ? fx.track(view.selected) : null;
    if (!t) {
      return [h('div', { class: 'launch-lib__detail-empty ink-backing' }, [
        h('p', { class: 'label', text: 'Nothing selected' }),
        h('p', { class: 'body', text: 'Tap a track to select it. Loading is a separate choice: Load A, B, C or D.' }),
        h('p', { class: 'body muted', text: decks.audible.length ? `Deck ${decks.audible.join(', ')} is playing and protected.` : 'No deck is audible.' }),
      ])];
    }
    const analysed = t.analysis === 'complete';
    const nums = h('div', { class: 'launch-lib__dnums ink-backing launch-fixture-box' }, [
      num(analysed ? fmt.bpm(t.bpm) : '—', 'BPM'), num(analysed ? t.key : '—', 'Key'), num(fmt.time(t.durationSec), 'Length'),
      h('mdj-fixture-mark', { for: 'analysis values' }),
    ]);
    const crates = fx.library.crates.filter((c) => c.trackIds.includes(t.id)).map((c) => c.name);
    return [
      h('div', { class: 'launch-lib__dhead' }, [
        h('mdj-art', { seed: t.id, size: 40, label: t.title }),
        h('div', { class: 'launch-lib__dtitle' }, [h('h2', { class: 'title wrap-2', text: t.title }), h('p', { class: 'body muted truncate', text: t.artist })]),
      ]),
      h('mdj-load-target', {
        decks: decks.letters.join(','), occupied: decks.occupied.join(','), audible: decks.audible.join(','), focus: decks.focus, track: t.id,
        state: view.sent?.trackId === t.id ? 'pending' : (['ready'].includes(t.availability) ? 'idle' : 'disabled'), pending: view.sent?.trackId === t.id ? view.sent.deck : null,
        reason: t.availability === 'ready' ? null : (t.missingNote || 'Unavailable'),
      }),
      nums,
      h('p', { class: 'body muted launch-lib__dmeta', text: `${analysed ? `Grid confidence ${t.gridConfidence}` : 'Analysis pending'} · ${t.fileFormat}${crates.length ? ` · in ${crates.join(', ')}` : ''}${t.playedCount ? ` · played ×${t.playedCount}` : ' · not played'}` }),
      button({ label: 'Open in Prepare', icon: 'edit', cls: 'btn--ghost', fr: ['FR-033'], attrs: { 'aria-label': `Open ${t.title} in Prepare` }, on: { click: () => ctx.navigate('prep/track', t.id === 'glasswork' ? { state: 'pending-analysis' } : {}) } }),
    ];
  }
  function num(v, l) { return h('span', { class: 'launch-lib__dnum' }, [h('span', { class: 'numeral', text: v }), h('span', { class: 'label', text: l })]); }

  function buildOverlay() {
    const out = [];
    if (view.sheet) {
      const t = fx.track(view.sheet);
      const a = ctx.session.decks.A;
      const b = ctx.session.decks.B;
      const sheet = h('mdj-sheet', {
        variant: 'confirm', deck: 'A', icon: 'lock', title: 'Deck A is playing', 'dismiss-label': 'Close',
        actions: JSON.stringify([{ id: 'cancel', label: 'Cancel' }, { id: 'replace', label: 'Replace A', tone: 'danger' }, { id: 'load-b', label: 'Load to B', primary: true, icon: 'import' }]),
      }, [
        h('p', { class: 'body', text: `${a.track?.title || 'A track'} is audible on the master at ${fmt.time(a.positionSec)} of ${fmt.time(a.track?.durationSec || 0)}. Loading ${t.title} onto A would replace it immediately.` }),
        h('p', { class: 'body muted', text: b.track ? `Deck B holds ${b.track.title}, ${b.state} and not audible — loading there is safe.` : 'Deck B is empty — loading there is safe.' }),
      ]);
      sheet.addEventListener('mdj:sheet-action', (e) => {
        const id = e.detail.id;
        if (id === 'load-b') ctx.navigate('perform/ab', { state: 'playing' });
        else if (id === 'replace') { view.sheet = null; view.sent = { trackId: t.id, deck: 'A' }; paint(); toast(`Replace sent to Deck A — waiting for the engine. ${t.title} is not on A until the engine acknowledges.`, 'warning'); }
        else closeSheet();
      });
      sheet.addEventListener('mdj:sheet-dismiss', closeSheet);
      out.push(h('div', { class: 'launch-lib__scrim', 'aria-hidden': 'true' }), h('div', { class: 'launch-lib__sheetwrap' }, [sheet]));
    }
    return out;
  }
  function closeSheet() {
    if (ctx.state === 'protected-load') { ctx.setState('selected'); return; }
    view.sheet = null; paint();
  }
  function toast(message, tone = 'info') {
    const tEl = h('mdj-toast', { tone, icon: tone === 'warning' ? 'warning' : 'info', message, action: 'perform', 'action-label': 'Open Perform' });
    tEl.addEventListener('mdj:toast-action', () => ctx.navigate('perform/ab', { state: 'playing' }));
    tEl.addEventListener('mdj:toast-dismiss', () => tEl.remove());
    overlayEl.querySelector('mdj-toast')?.remove();
    overlayEl.appendChild(h('div', { class: 'launch-lib__toastwrap' }, [tEl]));
  }

  function runSearch(q) {
    const value = (q || '').trim();
    if (!value) { liveQuery = null; ctx.setState('browse'); return; }
    liveQuery = value;
    const any = libraryTracks(fx).some((t) => matches(t, value));
    ctx.setState(any ? 'search-results' : 'no-results');
  }

  // ---- events ----
  root.addEventListener('mdj:select', (e) => {
    const id = e.detail.trackId;
    if (!id) return;
    if (id === 'drift' && ctx.state === 'browse' && e.detail.selected) { ctx.setState('selected'); return; }
    view.selected = e.detail.selected ? id : null;
    view.sent = null;
    paint();
    live.textContent = view.selected ? `${fx.track(id)?.title} selected. Choose Load A, B, C or D.` : 'Selection cleared';
  });
  root.addEventListener('mdj:load-request', (e) => {
    const { deck, trackId } = e.detail;
    if (e.detail.protected) {
      if (trackId === 'drift' && deck === 'A' && ctx.state !== 'protected-load') { ctx.setState('protected-load'); return; }
      view.sheet = trackId; paint(); return;
    }
    view.sent = { trackId, deck };
    paint();
    toast(`Load sent to Deck ${deck}. This prototype has no engine, so it stays SENT here; Perform shows the acknowledged load.`);
  });
  root.addEventListener('mdj:search', (e) => { if (e.detail.submit) runSearch(e.detail.value); });
  root.addEventListener('mdj:search-clear', () => { liveQuery = null; ctx.setState('browse'); });
  root.addEventListener('mdj:filters-clear', () => { view.filters.clear(); if (ctx.state === 'no-results') { liveQuery = null; ctx.setState('browse'); } else paint(); });
  root.addEventListener('mdj:filters-open', () => { root.querySelector('.launch-lib__chips .chip-c__btn, .launch-lib__chips button')?.focus(); });
  root.addEventListener('mdj:chip', (e) => {
    const f = defs.find((d) => d.label === e.detail.label);
    if (!f) return;
    if (view.filters.has(f.id)) view.filters.delete(f.id); else view.filters.add(f.id);
    paint();
  });
  root.addEventListener('mdj:chip-remove', (e) => {
    const f = defs.find((d) => d.label === e.detail.label);
    if (f) { view.filters.delete(f.id); paint(); }
  });

  paint();
  // Bring the selected row (and its Load targets) into view inside the list's own scroller only.
  if (view.selected) requestAnimationFrame(() => {
    const r = listEl.querySelector(`mdj-library-row[track="${view.selected}"]`);
    if (r) scrollEl.scrollTop = Math.max(0, r.offsetTop - 8);
  });
  const head = h('div', { class: 'launch-lib__head' }, [setup.keyboard ? null : tabsEl, searchEl].filter(Boolean));
  const main = h('div', { class: 'launch-lib__main' }, [head, scrollEl]);
  root.replaceChildren(...[main, detailEl, overlayEl, live].filter(Boolean));
}

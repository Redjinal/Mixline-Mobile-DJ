// launch/crates — crates, playlists, smart rules and history (FR-005; FR-004 for rule fields; FR-034 for
// history). Shell screen: browsing and organising never change a deck, the transport or the route.
// Everything here is local (Document 07 §3: search, tags and smart-crate rules never need the network).
//
// States
//   crates            crate / playlist / smart-rule lists with counts, colours and the demo badge
//   crate-detail      Warm-up: ordered entries with a drag handle AND Move up / Move down, an intentional
//                     repeat entry, notes
//   smart-rule        rule editor: BPM between 120–128, key compatible with 8A, availability ready; the
//                     result count is computed live from the fixture library as the bounds change
//   history           played list with time, deck and session
//   rename-duplicate  renaming Warm-up to "Peak" collides with an existing crate: the conflict is caught
//   offline           offline scenario: everything here keeps working; only online playlist import waits
import { register } from '../../app/registry.js';
import { load } from '../../app/fixtures.js';
import { h, icon, button, fmt } from '../../components/base.js';

let LX = null;
const ready = load('launch').then((d) => { LX = d; return d; });

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n) => String(n).padStart(2, '0');
function day(iso) { const d = new Date(iso); return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; }
function clock(iso) { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }

register({
  id: 'launch/crates',
  family: 'launch',
  title: 'Crates, playlists and history',
  order: 4,
  fr: ['FR-004', 'FR-005', 'FR-034'],
  shell: true,
  dock: { portrait: true, landscape: true },
  states: {
    crates: { label: 'Crates, playlists and smart rules', exercised: true, scenario: 'set-ready' },
    'crate-detail': { label: 'Warm-up — order, repeat entry, notes', exercised: true, scenario: 'set-ready', via: { from: 'crates', control: 'Open Warm-up' } },
    'smart-rule': { label: 'Smart rule editor — live count', exercised: true, scenario: 'set-ready', via: { from: 'crates', control: 'Open Compatible with A' } },
    history: { label: 'Play history', exercised: true, scenario: 'set-ready', via: { from: 'crates', control: 'History' } },
    'rename-duplicate': { label: 'Rename collides with an existing crate', exercised: true, scenario: 'set-ready', via: { from: 'crate-detail', control: 'Rename crate' } },
    offline: { label: 'Offline — all local, still works', exercised: false, scenario: 'offline' },
  },
  defaultState: 'crates',
  render(ctx) {
    const root = h('div', { class: `launch-crates launch-crates--${ctx.state} launch-crates--${ctx.orientation}` });
    const fill = () => root.replaceChildren(...build(ctx));
    if (LX) fill(); else ready.then(fill);
    return root;
  },
});

function build(ctx) {
  switch (ctx.state) {
    case 'crate-detail': return crateDetail(ctx);
    case 'smart-rule': return smartRule(ctx);
    case 'history': return [tabs(ctx, 'history'), history(ctx)];
    default: return [tabs(ctx, 'crates'), lists(ctx)];
  }
}

function tabs(ctx, current) {
  const t = (id, label, ic, go) => h('button', { type: 'button', role: 'tab', class: `launch-crates__tab${current === id ? ' is-current' : ''}`, 'aria-selected': String(current === id), dataset: { hit: '48', fr: id === 'history' ? 'FR-034' : 'FR-005' }, on: { click: go } }, [icon(ic, { size: 16 }), h('span', { text: label })]);
  return h('div', { class: 'launch-crates__tabs', role: 'tablist', 'aria-label': 'Library structure' }, [
    t('crates', 'Crates & rules', 'crate', () => ctx.setState('crates')),
    t('history', 'History', 'history', () => ctx.setState('history')),
  ]);
}

function backBar(ctx, kicker, title) {
  return h('header', { class: 'launch-crates__back' }, [
    button({ label: 'All crates', icon: 'chevron-left', cls: 'btn--ghost', fr: ['FR-005'], on: { click: () => ctx.setState('crates') } }),
    h('div', { class: 'launch-crates__backtext' }, [h('p', { class: 'label', text: kicker }), h('h1', { class: 'title launch-crates__h1 truncate', text: title })]),
  ]);
}

// ---------------------------------------------------------------- lists (crates / rename-duplicate / offline)
function lists(ctx) {
  const lib = ctx.fixtures.library;
  const offline = ctx.session.network === 'offline';
  const rename = ctx.state === 'rename-duplicate' ? LX.renameConflict : null;
  const wrap = h('div', { class: 'launch-crates__lists' });
  const live = h('p', { class: 'launch-sr', role: 'status', 'aria-live': 'polite' });

  if (offline) {
    wrap.appendChild(h('div', { class: 'launch-crates__banner tone-neutral', role: 'status' }, [icon('wifi-off', { size: 16 }), h('div', {}, [
      h('p', { class: 'body' }, [h('strong', { text: 'Offline — nothing here needs the network.' }), ' Crates, playlists, smart rules and history are stored on this phone.']),
      h('p', { class: 'body muted', text: 'Requests holds SODA LIGHTS (Radio Edit), a downloaded file that plays offline, and ZINC HARBOUR, which is unsupported online or off.' }),
    ])]));
  }

  const crateCol = h('section', { class: 'launch-crates__col', 'aria-label': 'Crates' }, [
    h('mdj-section-header', { title: 'Crates', count: String(lib.crates.length), level: '2' }),
  ]);
  for (const c of lib.crates) {
    const editing = rename && rename.crateId === c.id;
    const rowEl = h('mdj-crate-row', { crate: c.id, kind: 'crate', state: editing ? 'editing' : null, name: editing ? rename.attempted : null });
    const line = h('div', { class: `launch-crates__line${editing ? ' launch-crates__line--editing' : ''}` }, [rowEl,
      editing ? null : openBtn(ctx, c.name, () => (c.id === 'crate-warmup' ? ctx.setState('crate-detail') : selectRow(rowEl, c.name))),
    ]);
    crateCol.appendChild(line);
    if (editing) crateCol.appendChild(conflict(ctx, rename, rowEl, live));
  }

  const otherCol = h('section', { class: 'launch-crates__col', 'aria-label': 'Playlists and smart rules' }, [
    h('mdj-section-header', { title: 'Playlists', count: String(lib.playlists.length), level: '2' }),
    ...lib.playlists.map((p) => {
      const r = h('mdj-crate-row', { crate: p.id, kind: 'playlist', name: p.name, count: String(new Set(p.entries.map((e) => e.trackId)).size), note: `${p.entries.length} entries in order · repeats allowed` });
      return h('div', { class: 'launch-crates__line' }, [r, openBtn(ctx, p.name, () => selectRow(r, p.name))]);
    }),
    h('mdj-section-header', { title: 'Smart rules', count: String(lib.smartRules.length), level: '2' }),
    ...lib.smartRules.map((s) => {
      const r = h('mdj-crate-row', { crate: s.id, kind: 'smart', name: s.name, count: String(liveMatches(ctx, { min: 120, max: 128, key: '8A' }).length), note: 'BPM 120–128 · key fits 8A · ready' });
      return h('div', { class: 'launch-crates__line' }, [r, openBtn(ctx, s.name, () => ctx.setState('smart-rule'))]);
    }),
    offline ? h('p', { class: 'launch-crates__offnote body muted' }, [icon('cloud-off', { size: 14 }), ' Importing a playlist from an online service needs a connection. Local playlists are unaffected.']) : null,
  ]);
  wrap.append(crateCol, otherCol, live);

  wrap.addEventListener('mdj:select', (e) => {
    if (e.detail.crateId === 'crate-warmup' && !rename) ctx.setState('crate-detail');
    else if (e.detail.crateId === 'sr-compatible') ctx.setState('smart-rule');
    else if (e.detail.crateId) {
      const r = e.target.closest('mdj-crate-row');
      if (r) selectRow(r, r.getAttribute('name') || e.detail.crateId);
    }
  });
  function selectRow(r, name) {
    wrap.querySelectorAll('mdj-crate-row[selected]').forEach((x) => x !== r && x.removeAttribute('selected'));
    r.setAttribute('selected', '');
    live.textContent = `${name} selected`;
  }
  return wrap;
}

function openBtn(ctx, name, onClick) {
  return h('button', { type: 'button', class: 'btn btn--ghost launch-crates__open', dataset: { hit: '48', fr: 'FR-005' }, 'aria-label': `Open ${name}`, on: { click: onClick } }, [icon('chevron-right', { size: 18 })]);
}

function conflict(ctx, rename, rowEl, live) {
  const lib = ctx.fixtures.library;
  const existing = lib.crates.find((c) => c.id === rename.existingId);
  const original = lib.crates.find((c) => c.id === rename.crateId);
  const box = h('div', { class: 'launch-crates__conflict tone-warning', role: 'alert' }, [
    icon('duplicate', { size: 18 }),
    h('div', {}, [
      h('p', { class: 'body' }, [h('strong', { text: `A crate named "${existing.name}" already exists` }), ` (${existing.trackIds.length} tracks). Names stay unique so the browser and ParDay can tell crates apart. Nothing has been renamed yet.`]),
      h('div', { class: 'launch-crates__conflict-actions' }, [
        button({ label: `Use "${rename.suggestion}"`, cls: 'btn--secondary', fr: ['FR-005'], on: { click: () => apply(rename.suggestion) } }),
        button({ label: `Keep "${original.name}"`, cls: 'btn--secondary', fr: ['FR-005'], on: { click: () => ctx.setState('crates') } }),
      ]),
    ]),
  ]);
  function apply(name) {
    rowEl.setAttribute('name', name);
    rowEl.removeAttribute('state');
    box.replaceWith(h('p', { class: 'launch-crates__saved tone-ok body', role: 'status' }, [icon('check', { size: 14 }), ` Renamed to "${name}" — the library store acknowledged the change (fixture).`]));
    live.textContent = `Renamed to ${name}`;
  }
  rowEl.addEventListener('mdj:crate-rename', (e) => {
    const n = (e.detail.name || '').trim();
    if (!n) return;
    if (lib.crates.some((c) => c.id !== rename.crateId && c.name.toLowerCase() === n.toLowerCase())) { live.textContent = `"${n}" is already used`; return; }
    apply(n);
  });
  rowEl.addEventListener('mdj:crate-cancel', () => ctx.setState('crates'));
  return box;
}

// ---------------------------------------------------------------- crate detail
function crateDetail(ctx) {
  const lib = ctx.fixtures.library;
  const crate = lib.crates.find((c) => c.id === 'crate-warmup');
  const entries = LX.crateEntries[crate.id].slice();
  const unique = new Set(entries.map((e) => e.trackId)).size;
  const live = h('p', { class: 'launch-sr', role: 'status', 'aria-live': 'polite' });
  const listEl = h('ol', { class: 'launch-entries launch-fixture-box', 'aria-label': `${crate.name} entries, in order` });

  const meta = h('section', { class: 'launch-crates__meta glass', 'aria-label': 'Crate details' }, [
    h('div', { class: 'ink-backing launch-pad' }, [
      h('p', { class: 'launch-crates__metaline' }, [
        swatch(crate.color),
        h('span', { class: 'numeral', text: `${entries.length} entries · ${unique} tracks` }),
      ]),
      h('p', { class: 'body' }, [h('strong', { text: 'Note: ' }), crate.note]),
      h('p', { class: 'body muted', text: `Updated ${day(crate.updatedAt)} · ${clock(crate.updatedAt)}. Order is yours; drag the handle or use Move up / Move down.` }),
      h('p', { class: 'launch-crates__dupnote body' }, [icon('duplicate', { size: 14 }), ' AURORA DRIVE appears twice on purpose. Crates allow repeats; the library still holds one file.']),
    ]),
    h('div', { class: 'launch-actions launch-actions--row' }, [
      button({ label: 'Rename crate', icon: 'edit', cls: 'btn--secondary', fr: ['FR-005'], on: { click: () => ctx.setState('rename-duplicate') } }),
      button({ label: 'Browse in library', icon: 'library', cls: 'btn--secondary', fr: ['FR-004'], on: { click: () => ctx.navigate('launch/library', { state: 'long-title' }) } }),
    ]),
  ]);

  function paint() {
    listEl.replaceChildren(...entries.map((e, i) => entryRow(ctx, e, i, entries.length, move)));
    listEl.appendChild(h('mdj-fixture-mark', { for: 'BPM and key' }));
  }
  function move(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= entries.length) return;
    [entries[i], entries[j]] = [entries[j], entries[i]];
    paint();
    const t = ctx.fixtures.track(entries[j].trackId);
    live.textContent = `Moved ${t.title} to position ${j + 1} of ${entries.length}`;
    listEl.querySelectorAll('.launch-entry')[j]?.querySelector(dir < 0 ? '[data-move="up"]' : '[data-move="down"]')?.focus();
  }
  paint();
  return [
    backBar(ctx, 'Crate', crate.name),
    h('div', { class: 'launch-crates__split' }, [meta, h('section', { class: 'launch-crates__entries', 'aria-label': 'Entries' }, [listEl]), live]),
  ];
}

function swatch(color) {
  const el = h('span', { class: 'launch-swatch', role: 'img', 'aria-label': `Colour ${color}` });
  el.style.setProperty('--tag', `var(--cue-${color})`);
  return el;
}

function entryRow(ctx, e, i, n, move) {
  const t = ctx.fixtures.track(e.trackId);
  const analysed = t.analysis === 'complete';
  const tid = `launch-entry-${e.id}`;
  const mv = (dir, ic, word) => h('button', {
    type: 'button', class: 'btn btn--icon launch-entry__move', dataset: { hit: '48', fr: 'FR-005', move: dir < 0 ? 'up' : 'down' },
    'aria-label': `Move ${t.title}, position ${i + 1}, ${word}`, 'aria-disabled': (dir < 0 ? i === 0 : i === n - 1) ? 'true' : null,
    on: { click: () => move(i, dir) },
  }, [icon(ic, { size: 18 })]);
  return h('li', { class: `launch-entry raised${e.intentionalDuplicate ? ' launch-entry--repeat' : ''}`, 'aria-labelledby': tid }, [
    h('span', { class: 'launch-entry__grip', 'aria-hidden': 'true', title: 'Drag handle' }, [icon('drag', { size: 16 })]),
    h('span', { class: 'numeral launch-entry__pos', 'aria-hidden': 'true', text: String(i + 1) }),
    h('div', { class: 'launch-entry__body' }, [
      h('span', { id: tid, class: 'title launch-entry__title truncate', text: t.title }),
      h('span', { class: 'body muted launch-entry__meta' }, [
        h('span', { class: 'numeral', text: analysed ? `${fmt.bpm(t.bpm)} BPM · ${t.key}` : 'BPM — · key —' }), ` · ${fmt.time(t.durationSec)}`,
        t.gridConfidence === 'low' ? ' · grid uncertain' : '',
      ]),
      e.intentionalDuplicate ? h('span', { class: 'flag label tone-info launch-entry__flag' }, [icon('duplicate', { size: 11 }), 'Repeat · intentional']) : null,
      e.note ? h('span', { class: 'body launch-entry__note', text: e.note }) : null,
    ]),
    h('span', { class: 'launch-entry__moves' }, [mv(-1, 'arrow-up', 'move up'), mv(1, 'arrow-down', 'move down')]),
  ]);
}

// ---------------------------------------------------------------- smart rule
function liveMatches(ctx, { min, max, key }) {
  const compat = new Set(LX.camelotCompatible[key] || [key]);
  return ctx.fixtures.tracks.filter((t) => t.source !== 'demo' && t.availability === 'ready' && t.analysis === 'complete' && t.bpm >= min && t.bpm <= max && compat.has(t.key));
}
function pendingMatches(ctx) {
  // Analysis pending: BPM and key are not known yet, so the rule cannot decide; the editor says so instead of guessing.
  return ctx.fixtures.tracks.filter((t) => t.source !== 'demo' && t.availability === 'ready' && t.analysis === 'pending');
}

function smartRule(ctx) {
  const rule = ctx.fixtures.library.smartRules[0];
  const bpm = rule.rules.find((r) => r.field === 'bpm').value;
  const key = rule.rules.find((r) => r.field === 'key').value;
  const deckA = ctx.session.decks.A.track;
  const saved = { min: bpm[0], max: bpm[1] };
  const v = { min: bpm[0], max: bpm[1], key };
  const live = h('p', { class: 'launch-sr', role: 'status', 'aria-live': 'polite' });
  const countEl = h('div', { class: 'launch-rule__count ink-backing', role: 'status' });
  const resultsEl = h('ul', { class: 'launch-rule__results launch-fixture-box', 'aria-label': 'Matching tracks' });
  const save = h('mdj-save-bar', { scope: 'Smart rule', count: '0', state: 'clean' });

  const stepper = (which, label) => {
    const val = h('span', { class: 'numeral launch-step__val', text: String(v[which]) });
    const set = (d) => {
      const next = v[which] + d;
      if (which === 'min' && (next < 60 || next > v.max)) return;
      if (which === 'max' && (next > 200 || next < v.min)) return;
      v[which] = next; val.textContent = String(next); update(); live.textContent = `${label} ${next} BPM`;
    };
    return h('span', { class: 'launch-step', role: 'group', 'aria-label': `${label} BPM` }, [
      button({ label: `Lower ${label.toLowerCase()} BPM`, icon: 'minus', iconOnly: true, cls: 'btn--icon', fr: ['FR-004'], on: { click: () => set(-1) } }),
      val,
      button({ label: `Raise ${label.toLowerCase()} BPM`, icon: 'plus', iconOnly: true, cls: 'btn--icon', fr: ['FR-004'], on: { click: () => set(1) } }),
    ]);
  };

  const rules = h('section', { class: 'launch-rule glass', 'aria-label': 'Rules — all must match' }, [
    h('div', { class: 'ink-backing launch-pad launch-rule__rows' }, [
      h('p', { class: 'label', text: 'Match tracks where all of these are true' }),
      h('div', { class: 'launch-rule__row' }, [h('span', { class: 'launch-rule__field label label-strong' }, [icon('bpm', { size: 14 }), ' BPM between']), h('span', { class: 'launch-rule__ctl' }, [stepper('min', 'Minimum'), h('span', { class: 'body', text: 'and' }), stepper('max', 'Maximum')])]),
      h('div', { class: 'launch-rule__row' }, [h('span', { class: 'launch-rule__field label label-strong' }, [icon('key', { size: 14 }), ' Key compatible with']), h('span', { class: 'launch-rule__ctl launch-rule__keys' }, [
        h('span', { class: 'numeral launch-rule__key', text: key }),
        h('span', { class: 'body muted', text: `Deck A: ${deckA?.title || '—'} · matches ${(LX.camelotCompatible[key] || [key]).join(', ')}` }),
      ])]),
      h('div', { class: 'launch-rule__row' }, [h('span', { class: 'launch-rule__field label label-strong' }, [icon('ready', { size: 14 }), ' Availability is']), h('span', { class: 'launch-rule__ctl' }, [h('mdj-chip', { kind: 'availability', value: 'ready', size: 'sm' }), h('span', { class: 'body muted', text: 'playable on this phone' })])]),
    ]),
  ]);

  function update() {
    const m = liveMatches(ctx, v);
    const p = pendingMatches(ctx);
    countEl.replaceChildren(
      h('span', { class: 'numeral launch-rule__big', text: String(m.length) }),
      h('span', { class: 'body' }, [` tracks match now`, p.length ? h('span', { class: 'muted', text: ` · ${p.length} with analysis pending left out until BPM and key are known (${p.map((t) => t.title).join(', ')})` }) : null]),
    );
    resultsEl.replaceChildren(...m.map((t) => h('li', { class: 'launch-rule__res' }, [
      h('span', { class: 'title truncate', text: t.title }), h('span', { class: 'numeral', text: `${fmt.bpm(t.bpm)} · ${t.key}` }),
    ])), h('mdj-fixture-mark', { for: 'BPM and key' }));
    const changed = (v.min !== saved.min ? 1 : 0) + (v.max !== saved.max ? 1 : 0);
    save.setAttribute('count', String(changed));
    save.setAttribute('state', changed ? 'dirty' : 'clean');
  }
  save.addEventListener('mdj:save', () => {
    save.setAttribute('state', 'saving');
    setTimeout(() => { saved.min = v.min; saved.max = v.max; update(); live.textContent = 'Smart rule saved — the library store acknowledged (fixture)'; }, 700);
  });
  save.addEventListener('mdj:discard', () => { v.min = saved.min; v.max = saved.max; ctx.setState('smart-rule'); });
  save.addEventListener('mdj:reset', () => { v.min = bpm[0]; v.max = bpm[1]; ctx.setState('smart-rule'); });
  update();

  return [
    backBar(ctx, 'Smart rule · updates as the library changes', rule.name),
    h('div', { class: 'launch-crates__split launch-rule__split' }, [
      rules, save,
      h('section', { class: 'launch-rule__out', 'aria-label': 'Live results' }, [
        countEl, resultsEl,
        button({ label: 'Show in library', icon: 'library', cls: 'btn--secondary', fr: ['FR-004'], on: { click: () => ctx.navigate('launch/library', { state: 'browse' }) } }),
      ]),
      live,
    ]),
  ];
}

// ---------------------------------------------------------------- history
function history(ctx) {
  const lib = ctx.fixtures.library;
  const bySession = new Map();
  for (const e of lib.history) (bySession.get(e.sessionId) || bySession.set(e.sessionId, []).get(e.sessionId)).push(e);
  const wrap = h('div', { class: 'launch-crates__history' });
  for (const [sid, items] of bySession) {
    const sess = ctx.fixtures.sessions.sessions[sid];
    wrap.appendChild(h('section', { class: 'launch-hist glass', 'aria-label': `${sess.name}, played tracks` }, [
      h('header', { class: 'launch-hist__head ink-backing' }, [
        h('div', {}, [h('h2', { class: 'title launch-hist__title', text: sess.name }), h('p', { class: 'body muted', text: `${day(items[0].playedAt)} · ${items.length} tracks played · set ${fmt.time(sess.durationSec)}` })]),
        button({ label: 'Resume session', icon: 'resume', cls: 'btn--secondary', fr: ['FR-034'], attrs: { 'aria-label': `Resume ${sess.name}` }, on: { click: () => ctx.navigate('launch/open', { state: 'resume' }) } }),
      ]),
      h('ol', { class: 'launch-hist__list' }, items.map((e) => {
        const t = ctx.fixtures.track(e.trackId);
        return h('li', { class: `launch-hist__row raised deck-${e.deck.toLowerCase()}` }, [
          h('span', { class: 'numeral launch-hist__time', text: clock(e.playedAt) }),
          h('span', { class: 'launch-deckletter numeral', role: 'img', 'aria-label': `Deck ${e.deck}`, text: e.deck }),
          h('span', { class: 'launch-hist__body' }, [h('span', { class: 'title truncate', text: t.title }), h('span', { class: 'body muted truncate', text: t.artist })]),
        ]);
      })),
    ]));
  }
  wrap.appendChild(h('p', { class: 'body muted launch-hist__note ink-backing launch-pad', text: 'History is written at session checkpoints and stays on this phone. It feeds the "Not played" filter and Played ×N counts in the library.' }));
  return wrap;
}

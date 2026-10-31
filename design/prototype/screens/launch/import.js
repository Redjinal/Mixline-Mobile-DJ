// launch/import — scoped file / folder import with per-item validation and indexing (Document 07 §3,
// Document 03 §2 "Import and sources", Document 19 §3 scene 2, FR-002 / FR-003 / FR-036). Not a shell
// screen. The app never asks for broad storage permission: the system picker grants access to exactly
// the files or the one folder the person chooses. Counts come from fixtures/library.json importBatches;
// no percentage is printed beyond the real "14 of 52" work units.
//
// States
//   picker    choose Files / Folder with the scoped-access explanation
//   indexing  importBatches.indexing: 14 of 52 files; Continue in background / Cancel import
//   partial   importBatches.partial (walkthrough): 8 items, each with its own result and next action
//   denied    importBatches.denied: nothing imported, library unchanged, try again
//   complete  launch.json importComplete: 3 files, all ready
import { register } from '../../app/registry.js';
import { load } from '../../app/fixtures.js';
import { h, icon, button } from '../../components/base.js';

let LX = null;
const ready = load('launch').then((d) => { LX = d; return d; });

const ITEM = {
  ready: { chip: 'ready', tone: 'ok', ic: 'ready', word: 'Ready' },
  'analysis-pending': { chip: 'pending', tone: 'info', ic: 'analysis-pending', word: 'Playable · analysis pending' },
  duplicate: { chip: 'duplicate', tone: 'warning', ic: 'duplicate', word: 'Duplicate' },
  unsupported: { chip: 'unsupported', tone: 'critical', ic: 'blocked', word: 'Unsupported' },
  skipped: { chip: null, tone: 'neutral', ic: 'x', word: 'Skipped' },
  'permission-missing': { chip: 'permission', tone: 'warning', ic: 'permission', word: 'Needs access' },
};

register({
  id: 'launch/import',
  family: 'launch',
  title: 'Import music',
  order: 2,
  fr: ['FR-002', 'FR-003', 'FR-006', 'FR-036'],
  shell: false,
  states: {
    picker: { label: 'Choose files or a folder (scoped access)', exercised: true, scenario: 'fresh', via: { from: 'launch/open:empty', control: 'Import music' } },
    indexing: { label: 'Indexing — 14 of 52 files', exercised: true, scenario: 'fresh', via: { from: 'picker', control: 'Choose a folder' } },
    partial: { label: 'Partial import — per-item results', exercised: false, scenario: 'set-ready' },
    denied: { label: 'Permission not granted', exercised: false, scenario: 'set-ready' },
    complete: { label: 'Import complete — 3 ready', exercised: false, scenario: 'set-ready' },
  },
  defaultState: 'picker',
  render(ctx) {
    const root = h('div', { class: `launch-page launch-import launch-import--${ctx.state} stage` });
    const fill = () => root.replaceChildren(...build(ctx));
    if (LX) fill(); else ready.then(fill);
    return root;
  },
});

function build(ctx) {
  const titles = { picker: 'Import music', indexing: 'Importing', partial: 'Import finished with issues', denied: 'Import not started', complete: 'Import complete' };
  const head = h('header', { class: 'launch-head' }, [
    button({ label: 'Back', icon: 'chevron-left', cls: 'btn--ghost launch-head__back', on: { click: () => ctx.navigate('launch/open') } }),
    h('div', { class: 'launch-head__text' }, [h('p', { class: 'label', text: 'Library · local import' }), h('h1', { class: 'title launch-head__title', text: titles[ctx.state] || 'Import music' })]),
  ]);
  const body = { picker, indexing, partial, denied, complete }[ctx.state] || picker;
  return [head, ...body(ctx)];
}

// ---------- picker ----------
function choice(ctx, { id, ic, title, detail, onClick }) {
  return h('button', { type: 'button', class: 'launch-choice raised', dataset: { hit: '56', fr: 'FR-002' }, 'aria-labelledby': `${id}-t`, 'aria-describedby': `${id}-d`, on: { click: onClick } }, [
    h('span', { class: 'launch-choice__icon brass-rim', 'aria-hidden': 'true' }, [h('span', { class: 'launch-choice__face titanium-radial' }, [icon(ic, { size: 22 })])]),
    h('span', { class: 'launch-choice__text' }, [h('span', { id: `${id}-t`, class: 'title launch-choice__title', text: title }), h('span', { id: `${id}-d`, class: 'body muted', text: detail })]),
    icon('chevron-right', { size: 18 }),
  ]);
}

function picker(ctx) {
  const choices = h('div', { class: 'launch-import__choices' }, [
    choice(ctx, { id: 'launch-imp-files', ic: 'music', title: 'Choose files', detail: 'Pick one or more tracks. Only those files are shared with the app.', onClick: () => ctx.setState('indexing') }),
    choice(ctx, { id: 'launch-imp-folder', ic: 'folder', title: 'Choose a folder', detail: 'Pick one folder. The app can read that folder and nothing else.', onClick: () => ctx.setState('indexing') }),
  ]);
  const explain = h('section', { class: 'launch-import__explain glass', 'aria-labelledby': 'launch-imp-scope' }, [
    h('div', { class: 'ink-backing launch-pad' }, [
      h('h2', { id: 'launch-imp-scope', class: 'label label-strong', text: 'Scoped access — what the app can see' }),
      h('ul', { class: 'launch-bullets body' }, [
        li('lock', 'No broad storage permission. Android\'s picker grants access to exactly what you choose.'),
        li('check', 'Access is kept so tracks still open after a restart. If it cannot be kept, the app makes a verified copy and says so.'),
        li('cloud', 'Files in a cloud provider may need downloading first; the app tells you before promising offline use.'),
        li('info', 'Each file is checked on its own. One bad file never blocks the others.'),
      ]),
      h('p', { class: 'body muted launch-import__formats', text: 'Formats evaluated: MP3, AAC/M4A, WAV, FLAC, Ogg/Opus. Protected (DRM) files cannot be decoded and are reported, not hidden.' }),
    ]),
  ]);
  return [h('div', { class: 'launch-import__grid' }, [choices, explain])];
}

function li(ic, text) { return h('li', {}, [icon(ic, { size: 14 }), h('span', { text })]); }

// ---------- indexing ----------
function indexing(ctx) {
  const batch = ctx.fixtures.library.importBatches.indexing;
  const { done, total } = batch.progress;
  const extra = LX.importIndexing;
  const bar = h('div', { class: 'launch-count-bar', role: 'img', 'aria-label': `${done} of ${total} files indexed` }, [
    h('span', { class: 'launch-count-bar__done', style: { width: `${(done / total) * 100}%` } }),
  ]);
  const status = h('section', { class: 'launch-import__status glass', 'aria-labelledby': 'launch-imp-count' }, [
    h('div', { class: 'ink-backing launch-pad launch-fixture-box' }, [
      h('p', { class: 'label', text: batch.source }),
      h('p', { id: 'launch-imp-count', class: 'launch-import__count', role: 'status' }, [
        h('span', { class: 'numeral launch-import__big', text: String(done) }), h('span', { class: 'body', text: ' of ' }), h('span', { class: 'numeral launch-import__big', text: String(total) }), h('span', { class: 'body', text: ' files indexed' }),
      ]),
      bar,
      h('p', { class: 'body muted' }, ['Now reading: ', h('span', { class: 'launch-import__file', text: extra.currentName })]),
      h('p', { class: 'body' }, [`So far: ${extra.readySoFar} ready · ${extra.attentionSoFar} needs attention. Time left: unknown.`]),
      h('mdj-fixture-mark', { for: 'import counts' }),
    ]),
  ]);
  const note = h('p', { class: 'launch-note ink-backing body' }, [icon('info', { size: 16 }), h('span', { text: 'Tracks become playable as soon as they are indexed. BPM, key and waveform analysis run afterwards in the background and never block browsing.' })]);
  const actions = h('div', { class: 'launch-actions' }, [
    button({ label: 'Continue in background', icon: 'library', hit: 56, cls: 'btn--primary', fr: ['FR-002', 'FR-006'], on: { click: () => ctx.navigate('launch/library', { state: 'browse' }) } }),
    button({ label: 'Cancel import', icon: 'cancel', cls: 'btn--danger', fr: ['FR-002'], on: { click: () => ctx.setState('picker') } }),
    h('p', { class: 'body muted launch-hint', text: 'Cancel keeps the 14 files already indexed; nothing is deleted from the phone.' }),
  ]);
  return [h('div', { class: 'launch-import__grid' }, [status, h('div', { class: 'launch-import__side' }, [note, actions])])];
}

// ---------- partial / complete ----------
function itemRow(ctx, item) {
  const meta = ITEM[item.state] || ITEM.skipped;
  const track = item.trackId ? ctx.fixtures.track(item.trackId) : null;
  const title = track?.title || item.name;
  const id = `launch-item-${item.trackId || item.name.replace(/\W+/g, '-')}`;
  const openable = track && (item.state === 'ready' || item.state === 'analysis-pending');
  const head = [
    h('span', { class: `launch-item__icon tone-${meta.tone}`, 'aria-hidden': 'true' }, [icon(meta.ic, { size: 16 })]),
    h('span', { class: 'launch-item__text' }, [
      h('span', { id: `${id}-t`, class: 'title launch-item__title wrap-2', text: title }),
      h('span', { id: `${id}-d`, class: 'body muted launch-item__file', text: `${item.name} · ${item.note}` }),
    ]),
    meta.chip ? h('mdj-chip', { kind: 'availability', value: meta.chip, size: 'sm' }) : h('span', { class: 'launch-item__word label', text: meta.word }),
  ];
  const go = () => {
    if (item.trackId === 'tide') ctx.navigate('prep/track', { state: 'uncertain' });
    else if (item.state === 'analysis-pending') ctx.navigate('prep/track', { state: 'pending-analysis' });
    else ctx.navigate('prep/track');
  };
  const main = openable
    ? h('button', { type: 'button', class: 'launch-item__main', dataset: { hit: '48', fr: 'FR-002' }, 'aria-labelledby': `${id}-t`, 'aria-describedby': `${id}-d`, on: { click: go } }, [...head, icon('chevron-right', { size: 16 })])
    : h('div', { class: 'launch-item__main launch-item__main--static' }, head);
  let extra = null;
  if (item.state === 'duplicate') {
    const out = h('p', { class: 'body launch-item__outcome', role: 'status' });
    const pick = (word) => () => { out.textContent = `${word} — choice recorded for this fixture; both files stay on the phone.`; };
    extra = h('div', { class: 'launch-item__actions' }, [
      button({ label: 'Keep both', cls: 'btn--secondary', fr: ['FR-002'], attrs: { 'aria-label': `Keep both copies of ${title}` }, on: { click: pick('Kept both') } }),
      button({ label: 'Merge', cls: 'btn--secondary', fr: ['FR-002'], attrs: { 'aria-label': `Merge duplicate ${title}` }, on: { click: pick('Merge chosen: cues and history combine into one entry') } }),
      out,
    ]);
  } else if (item.state === 'permission-missing') {
    extra = h('div', { class: 'launch-item__actions' }, [
      button({ label: 'Grant access again', icon: 'permission', cls: 'btn--secondary', fr: ['FR-002'], on: { click: () => ctx.setState('picker') } }),
    ]);
  } else if (item.state === 'unsupported') {
    extra = h('p', { class: 'body muted launch-item__why', text: 'Why: the file is copy-protected. The app does not remove protection; use an unprotected copy you own.' });
  }
  return h('li', { class: `launch-item launch-item--${item.state} raised` }, [main, extra]);
}

function countsBar(ctx, counts, total) {
  const parts = [
    ['ready', `${counts.ready} ready`, 'ok'], ['pending', `${counts.pending} analysis pending`, 'info'], ['duplicate', `${counts.duplicate} duplicate`, 'warning'],
    ['unsupported', `${counts.unsupported} unsupported`, 'critical'], ['skipped', `${counts.skipped} skipped`, 'neutral'], ['failed', `${counts.failed} needs access`, 'warning'],
  ].filter(([k]) => counts[k] > 0);
  return h('div', { class: 'launch-import__counts', role: 'group', 'aria-label': `Import results, ${total} items` }, [
    h('span', { class: 'numeral launch-import__total', text: `${total} items` }),
    ...parts.map(([, text, tone]) => h('span', { class: `flag label tone-${tone}`, text })),
  ]);
}

function partial(ctx) {
  const batch = ctx.fixtures.library.importBatches.partial;
  const playable = batch.items.filter((i) => i.state === 'ready' || i.state === 'analysis-pending').length;
  const summary = h('section', { class: 'launch-import__summary glass', 'aria-labelledby': 'launch-imp-sum' }, [
    h('div', { class: 'ink-backing launch-pad' }, [
      h('p', { class: 'label', text: batch.source }),
      h('h2', { id: 'launch-imp-sum', class: 'title launch-import__sumtitle', text: `${playable} tracks are in your library and playable now` }),
      countsBar(ctx, batch.counts, batch.items.length),
      h('p', { class: 'body muted', text: 'Valid imports stay available. Problem files are listed with what you can do; nothing else in your library changed.' }),
    ]),
    h('div', { class: 'launch-actions launch-actions--row' }, [
      button({ label: 'Open library', icon: 'library', hit: 56, cls: 'btn--primary', fr: ['FR-004'], on: { click: () => ctx.navigate('launch/library', { state: 'browse' }) } }),
      button({ label: 'Import more', icon: 'import', cls: 'btn--secondary', fr: ['FR-002'], on: { click: () => ctx.setState('picker') } }),
    ]),
  ]);
  const list = h('section', { class: 'launch-import__items', 'aria-labelledby': 'launch-imp-items' }, [
    h('h2', { id: 'launch-imp-items', class: 'label', text: 'Each file · tap a ready track to inspect it in Prepare' }),
    h('ul', { class: 'launch-import__list' }, batch.items.map((i) => itemRow(ctx, i))),
  ]);
  return [h('div', { class: 'launch-import__grid launch-import__grid--results' }, [summary, list])];
}

function complete(ctx) {
  const batch = LX.importComplete;
  const summary = h('section', { class: 'launch-import__summary glass', 'aria-labelledby': 'launch-imp-sum' }, [
    h('div', { class: 'ink-backing launch-pad' }, [
      h('p', { class: 'label', text: batch.source }),
      h('h2', { id: 'launch-imp-sum', class: 'title launch-import__sumtitle', text: `All ${batch.items.length} files imported and ready` }),
      countsBar(ctx, batch.counts, batch.items.length),
      h('p', { class: 'body muted', text: 'Analysis results were already cached for these files. Ready means indexed and playable; analysis status is shown per track.' }),
    ]),
    h('div', { class: 'launch-actions launch-actions--row' }, [
      button({ label: 'Open library', icon: 'library', hit: 56, cls: 'btn--primary', fr: ['FR-004'], on: { click: () => ctx.navigate('launch/library', { state: 'browse' }) } }),
      button({ label: 'Import more', icon: 'import', cls: 'btn--secondary', fr: ['FR-002'], on: { click: () => ctx.setState('picker') } }),
    ]),
  ]);
  const list = h('section', { class: 'launch-import__items', 'aria-labelledby': 'launch-imp-items' }, [
    h('h2', { id: 'launch-imp-items', class: 'label', text: 'Each file · tap a track to inspect it in Prepare' }),
    h('ul', { class: 'launch-import__list' }, batch.items.map((i) => itemRow(ctx, i))),
  ]);
  return [h('div', { class: 'launch-import__grid launch-import__grid--results' }, [summary, list])];
}

// ---------- denied ----------
function denied(ctx) {
  const batch = ctx.fixtures.library.importBatches.denied;
  const count = ctx.fixtures.tracks.filter((t) => t.source !== 'demo' && t.availability !== 'discovered').length;
  const empty = h('mdj-empty-state', {
    state: 'denied', icon: 'permission', title: 'Folder access was not granted',
    body: `${batch.note} (${count} tracks, as before.)`,
    actions: JSON.stringify([{ id: 'retry', label: 'Try again', icon: 'retry', primary: true }, { id: 'files', label: 'Choose files instead', icon: 'music' }, { id: 'library', label: 'Open library', icon: 'library' }]),
  });
  empty.addEventListener('mdj:action', (e) => {
    const id = e.detail.id;
    if (id === 'library') ctx.navigate('launch/library', { state: 'browse' });
    else ctx.setState('picker');
  });
  const why = h('section', { class: 'launch-import__explain glass' }, [
    h('div', { class: 'ink-backing launch-pad' }, [
      h('h2', { class: 'label label-strong', text: 'Why the app asks' }),
      h('p', { class: 'body', text: 'Android only lets the app read music you pick. Without that grant there is nothing to import — the app never falls back to scanning the whole phone.' }),
      h('p', { class: 'body muted', text: 'You can also allow access later from the library at any time; live playback is never interrupted to ask.' }),
    ]),
  ]);
  return [h('div', { class: 'launch-import__grid' }, [empty, why])];
}

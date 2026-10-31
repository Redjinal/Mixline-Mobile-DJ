// sources/queue — the persistent download queue (Document 16 §4, §6–8, §11 DLA-06 / -08 / -11 / -13 /
// -18 / -19; Document 14 §4 "Acquire and prepare", "Load deliberately"; FR-049, FR-006, FR-035).
// Shell screen, dock in both orientations: downloading never takes the transport away.
//
// The focused job sits on top with its contract state (Document 16 §6 names, printed in mono beside the
// plain words), an mdj-progress-row (separate phases; bytes only when measurable, otherwise "Progress
// unknown"), the storage destination, the four separate statuses, and "Ready to play" / "Analyzed" as two
// different facts. Cancel download targets this acquisition job only; Android's Task Manager Stop is a
// different thing and is explained, not promised away. A finished download is published to the library
// and never loads a deck: loading happens deliberately from the library (Load A / B).
// Below it, every other job in request order, then the full job-state reference (17 contract states).
// No transfer exists: bytes, phases, clock times and errors are fixtures. The screen stands in for the
// acquisition worker: Pause / Cancel print SENT (CANCEL_REQUESTED) until a labelled fixture step
// acknowledges them.
//
// States
//   active                TRANSFERRING SODA LIGHTS · 1.6 of 4.0 MB (Content-Length known)
//   unknown-progress      TRANSFERRING HALCYON FERRY · 2.3 MB so far, total not reported
//   cancelling            CANCEL_REQUESTED — waiting for the worker to stop
//   cancelled             CANCELLED — nothing published, staging removed
//   verifying             VERIFYING — the exact final file is checked (type, codec, duration, hash)
//   failed-html-response  FAILED — the server sent a web page, not audio
//   blocked-access        BLOCKED — login required; no credential prompt
//   retry-wait            RETRY_WAIT — rate limited, retry 2 of 3 at 21:42
//   paused                PAUSED at a safe checkpoint
//   collection-partial    playlist aggregate: "4 of 6 completed · 1 failed · 1 unavailable"
//   completed-ready       COMPLETED — in the library, playable, analysis pending → Open in library
import { register } from '../../app/registry.js';
import { h, icon, button, fmt } from '../../components/base.js';
import { AQ, withData, sourcesHead, statusQuad, jobStatuses, stateTag, note, dur } from './index.js';

const FR = ['FR-049', 'FR-006', 'FR-035', 'FR-036'];
const ACK = 'Show worker acknowledgement (fixture)';

register({
  id: 'sources/queue',
  family: 'sources',
  title: 'Download queue',
  order: 4,
  fr: FR,
  shell: true,
  dock: { portrait: true, landscape: true },
  states: {
    active: { label: 'Active — TRANSFERRING with measured bytes', exercised: true, scenario: 'set-ready', via: { from: 'sources/format:options', control: 'Download' } },
    'unknown-progress': { label: 'Progress unknown — no total size', exercised: false, scenario: 'set-ready' },
    cancelling: { label: 'Cancelling — CANCEL_REQUESTED (sent)', exercised: true, scenario: 'set-ready', via: { from: 'active', control: 'Cancel download' } },
    cancelled: { label: 'Cancelled — nothing published', exercised: true, scenario: 'set-ready', via: { from: 'cancelling', control: ACK } },
    verifying: { label: 'Verifying — final file checked before publishing', exercised: false, scenario: 'set-ready' },
    'failed-html-response': { label: 'Failed — HTML page instead of audio', exercised: false, scenario: 'set-ready' },
    'blocked-access': { label: 'Blocked — login required', exercised: false, scenario: 'set-ready' },
    'retry-wait': { label: 'Retry wait — rate limited', exercised: false, scenario: 'set-ready' },
    paused: { label: 'Paused at a safe checkpoint', exercised: true, scenario: 'set-ready', via: { from: 'active', control: 'Pause' } },
    'collection-partial': { label: 'Playlist partly completed — 4 of 6', exercised: false, scenario: 'set-ready' },
    'completed-ready': { label: 'Completed — in library, analysis pending', exercised: false, scenario: 'set-ready' },
  },
  defaultState: 'active',
  render(ctx) {
    const root = h('div', { class: `sources-page sources-queue sources-queue--${ctx.state}` });
    return withData(root, () => mount(ctx, root));
  },
});

const FOCUS = {
  active: ['soda', 'active'], 'unknown-progress': ['halcyon'], cancelling: ['soda', 'cancelling'], cancelled: ['soda', 'cancelled'],
  verifying: ['glass'], 'failed-html-response': ['salt'], 'blocked-access': ['north'], 'retry-wait': ['coral'], paused: ['soda', 'paused'],
  'collection-partial': ['collection'], 'completed-ready': ['soda', 'completed-ready'],
};
// Which queue state shows a job in the focus card (for the list's Details buttons).
const DETAIL_STATE = { soda: 'active', halcyon: 'unknown-progress', glass: 'verifying', salt: 'failed-html-response', north: 'blocked-access', coral: 'retry-wait', collection: 'collection-partial' };
const LIST_ORDER = ['soda', 'halcyon', 'kite', 'marlin', 'glass', 'portside', 'coral', 'north', 'collection', 'salt'];
const TONE = { COMPLETED: 'ok', FAILED: 'critical', BLOCKED: 'critical', CANCELLED: 'warning', CANCEL_REQUESTED: 'warning', RETRY_WAIT: 'warning', PAUSED: 'neutral', QUEUED: 'neutral' };
const HIDE_ROW_ACTIONS = new Set(['RETRY_WAIT', 'BLOCKED', 'CANCEL_REQUESTED']);

function job(id, variant = 'active') {
  const j = AQ.jobs[id];
  if (!j) return null;
  if (j.variants) return { id, ...j, ...(j.variants[variant] || j.variants.active) };
  return { id, ...j };
}
function plain(state) { return AQ.stateReference.find((s) => s.id === state)?.text || ''; }

function progressRow(j, extra = {}) {
  const note = j.jobState === 'RETRY_WAIT' ? `${j.retry.line} · retry ${j.retry.attempt} of ${j.retry.max} at ${j.retry.at}` : j.note || (j.parent ? j.parent : null);
  return h('mdj-progress-row', {
    title: j.title, requested: j.requested, actual: j.actual, state: j.row, phase: j.phase || null,
    bytes: j.bytes != null ? String(j.bytes) : null, total: j.total != null ? String(j.total) : null,
    error: j.error || null, note, sent: j.sent ? true : null, fixture: `acquisition job ${j.jobId}`, ...extra,
  });
}

function mount(ctx, root) {
  const [focusId, variant] = FOCUS[ctx.state] || FOCUS.active;
  const live = h('p', { class: 'sources-sr', role: 'status', 'aria-live': 'polite' });
  const all = LIST_ORDER.filter((id) => id !== 'collection').map((id) => job(id, id === focusId ? variant : 'active'));
  const inProgress = all.filter((j) => !['COMPLETED', 'CANCELLED', 'FAILED', 'BLOCKED'].includes(j.jobState)).length;
  const attention = all.filter((j) => ['FAILED', 'BLOCKED'].includes(j.jobState)).length;
  const summary = `${inProgress} in progress or waiting · ${attention} need attention · 1 playlist`;
  const head = sourcesHead(ctx, { title: 'Download queue', step: 'queue', back: () => ctx.navigate('sources/add', { state: 'idle' }), backName: 'Back to Add music' });

  const focus = focusId === 'collection' ? collectionCard(ctx, live) : focusCard(ctx, job(focusId, variant), live);
  const list = (summary) => jobList(ctx, focusId, summary);
  root.replaceChildren(head, h('div', { class: 'sources-body sources-queue__body' }, [
    h('div', { class: 'sources-col sources-col--main' }, [focus]),
    h('div', { class: 'sources-col sources-col--side' }, list(summary)),
  ]), live);

  // List rows: component buttons stand in for the worker with SENT until acknowledged.
  root.addEventListener('mdj:progress-pause', (e) => onRow(e, 'pause'));
  root.addEventListener('mdj:progress-cancel', (e) => onRow(e, e.detail.remove ? 'remove' : 'cancel'));
  root.addEventListener('mdj:progress-retry', (e) => onRow(e, 'retry'));
  root.addEventListener('mdj:progress-open', () => ctx.navigate('launch/library', { state: 'browse' }));
  function onRow(e, verb) {
    const rowEl = e.target.closest('mdj-progress-row');
    if (!rowEl || rowEl.closest('.sources-focus')) return;
    const id = rowEl.dataset.job;
    if (id === 'soda' && verb === 'pause' && e.detail.paused) { ctx.setState('paused'); return; }
    if (id === 'soda' && verb === 'cancel') { ctx.setState('cancelling'); return; }
    rowEl.setAttribute('sent', '');
    const words = { pause: e.detail.paused ? 'Pause' : 'Resume', cancel: 'Cancel', retry: 'Retry', remove: 'Remove' }[verb];
    const msg = `${words} sent for ${e.detail.title} — waiting for the acquisition worker to acknowledge.`;
    const out = rowEl.parentElement.querySelector('.sources-job__out');
    if (out) out.textContent = msg;
    live.textContent = msg;
  }
}

// ---------- focused job ----------
function focusCard(ctx, j, live) {
  const out = h('p', { class: 'sources-hint sources-focus__out', role: 'status' });
  const tone = TONE[j.jobState] || 'info';
  const actions = [];
  const sent = (msg) => () => { out.textContent = msg; live.textContent = msg; };
  const s = ctx.state;
  if (s === 'active') {
    actions.push(button({ label: 'Pause', icon: 'pause', cls: 'btn--secondary', fr: ['FR-049'], on: { click: () => ctx.setState('paused') } }));
    actions.push(button({ label: 'Cancel download', icon: 'cancel', cls: 'btn--danger', fr: ['FR-049'], on: { click: () => ctx.setState('cancelling') } }));
  } else if (s === 'unknown-progress') {
    actions.push(button({ label: 'Pause', icon: 'pause', cls: 'btn--secondary', fr: ['FR-049'], on: { click: sent('Pause sent — the transfer stops at its next safe checkpoint; the 2.3 MB already verified are kept.') } }));
    actions.push(button({ label: 'Cancel download', icon: 'cancel', cls: 'btn--danger', fr: ['FR-049'], on: { click: sent('Cancel sent (CANCEL_REQUESTED) — waiting for the worker. Nothing will be published.') } }));
  } else if (s === 'cancelling') {
    actions.push(button({ label: ACK, icon: 'fixture', cls: 'btn--secondary', fr: ['FR-049'], on: { click: () => ctx.setState('cancelled') } }));
  } else if (s === 'verifying') {
    actions.push(button({ label: 'Pause', icon: 'pause', cls: 'btn--secondary', fr: ['FR-049'], on: { click: sent('Pause sent — verification stops at its next step; the transferred bytes are kept in staging.') } }));
    actions.push(button({ label: 'Cancel download', icon: 'cancel', cls: 'btn--danger', fr: ['FR-049'], on: { click: sent('Cancel sent (CANCEL_REQUESTED) — if verification has not handed over to publishing, nothing is published.') } }));
  } else if (s === 'cancelled') {
    actions.push(button({ label: 'Start again', icon: 'retry', cls: 'btn--primary', fr: ['FR-049'], on: { click: () => ctx.navigate('sources/format', { state: 'options' }) } }));
    actions.push(button({ label: 'Back to Add music', icon: 'plus', cls: 'btn--ghost', fr: ['FR-049'], attrs: { 'aria-label': 'Add other music' }, on: { click: () => ctx.navigate('sources/add', { state: 'idle' }) } }));
  } else if (s === 'paused') {
    actions.push(button({ label: 'Resume', icon: 'play', cls: 'btn--primary', fr: ['FR-049'], on: { click: () => ctx.setState('active') } }));
    actions.push(button({ label: 'Cancel download', icon: 'cancel', cls: 'btn--danger', fr: ['FR-049'], on: { click: () => ctx.setState('cancelling') } }));
  } else if (s === 'failed-html-response') {
    actions.push(button({ label: 'Retry', icon: 'retry', cls: 'btn--primary', fr: ['FR-049'], on: { click: sent('Retry sent — a new attempt re-checks the bytes before anything is kept.') } }));
    actions.push(button({ label: 'Import files', icon: 'import', cls: 'btn--secondary', fr: ['FR-002'], attrs: { 'aria-label': 'Import a file you already have' }, on: { click: () => ctx.navigate('launch/import', { state: 'picker' }) } }));
    actions.push(button({ label: 'Remove', icon: 'trash', cls: 'btn--ghost', fr: ['FR-049'], attrs: { 'aria-label': `Remove ${j.title} from the queue` }, on: { click: sent(`Remove sent — ${j.title} leaves the queue; the playlist keeps its other tracks.`) } }));
  } else if (s === 'blocked-access') {
    actions.push(button({ label: 'Open in browser', icon: 'external', cls: 'btn--secondary', fr: ['FR-049'], on: { click: sent('Would open the page in the browser. That is a handoff — it does not download into the app.') } }));
    actions.push(button({ label: 'Import files', icon: 'import', cls: 'btn--secondary', fr: ['FR-002'], attrs: { 'aria-label': 'Import a file you already have' }, on: { click: () => ctx.navigate('launch/import', { state: 'picker' }) } }));
    actions.push(button({ label: 'Remove', icon: 'trash', cls: 'btn--ghost', fr: ['FR-049'], attrs: { 'aria-label': `Remove ${j.title} from the queue` }, on: { click: sent(`Remove sent — ${j.title} leaves the queue.`) } }));
  } else if (s === 'retry-wait') {
    actions.push(button({ label: 'Retry now', icon: 'retry', cls: 'btn--secondary', fr: ['FR-049'], attrs: { disabled: true, 'aria-describedby': 'sources-retry-why' } }));
    actions.push(button({ label: 'Cancel download', icon: 'cancel', cls: 'btn--danger', fr: ['FR-049'], on: { click: sent('Cancel sent (CANCEL_REQUESTED) — the scheduled retry will not run.') } }));
  } else if (s === 'completed-ready') {
    actions.push(button({ label: 'Open in library', icon: 'library', hit: 56, cls: 'btn--primary', fr: ['FR-049', 'FR-035'], on: { click: () => ctx.navigate('launch/library', { state: 'browse' }) } }));
  }

  const readiness = h('dl', { class: 'sources-ready' }, [
    h('div', { class: 'sources-ready__cell' }, [h('dt', { class: 'label', text: 'Ready to play' }), h('dd', { text: j.ready })]),
    h('div', { class: 'sources-ready__cell' }, [h('dt', { class: 'label', text: 'Analyzed' }), h('dd', { text: j.analyzed })]),
  ]);
  const detail = j.detail ? h('p', { class: 'body sources-focus__detail', text: j.detail }) : null;
  const notes = [];
  if (s === 'cancelling') notes.push(note('info', 'Cancel is sent. The worker stops at its next check and nothing it fetched can be published after Cancel wins. If publishing had already won, this would say "Already completed" instead.'));
  if (s === 'cancelled') notes.push(note('check', 'Cancelled by the worker. Nothing was published; the 1.6 MB in staging were removed. Playback was never touched.'));
  if (s === 'retry-wait') notes.push(h('p', { id: 'sources-retry-why', class: 'sources-hint', text: `The source asked the app to wait until ${j.retry.at}. Retrying sooner would ignore that, so Retry now is off until then.` }));
  if (s === 'verifying') notes.push(note('validate', 'A .flac name or an audio header is not enough: the app decodes the file, checks its duration against the source and hashes the exact bytes that will be published. A successful download alone never makes a file playable.'));
  if (s === 'paused') notes.push(note('pause', 'Paused at a safe checkpoint. Resume re-checks that the source still serves the same file before adding bytes; if it changed, the transfer restarts cleanly.'));
  if (s === 'completed-ready') notes.push(note('lock', 'A finished download never loads a deck. Open it in the library, then choose Load A or Load B — a playing deck stays protected.'));
  if (['active', 'unknown-progress', 'verifying', 'paused', 'cancelling', 'retry-wait'].includes(s)) {
    notes.push(note('info', [h('strong', { text: 'Cancel download' }), ' stops only this download; music keeps playing. Android\'s Stop in Task Manager closes the whole app, audio included — the app reports that as an interruption when you reopen it.']));
  }

  return h('section', { class: 'sources-panel sources-focus raised', 'aria-labelledby': 'sources-focus-t' }, [
    h('p', { class: 'sources-panel__kicker' }, [h('span', { id: 'sources-focus-t', class: 'label', text: `${j.jobId} · revision ${j.revision}` }), stateTag(j.jobState, tone)]),
    h('p', { class: 'sources-focus__plain', text: plain(j.jobState) }),
    h('div', { class: 'sources-focusrow' }, [progressRow(j, { 'data-job': j.id })]),
    actions.length ? h('div', { class: 'sources-actions sources-actions--wrap sources-focus__actions' }, actions) : null,
    out,
    detail,
    readiness,
    h('dl', { class: 'sources-facts sources-facts--grid' }, [
      fact('Format', j.format),
      fact('Saves to', j.destination),
      j.totalBasis ? fact('Size', j.totalBasis) : null,
    ].filter(Boolean)),
    ...notes,
    statusQuad(jobStatuses(j), { title: `${j.title} — four statuses` }),
  ]);
}

function fact(k, v) { return h('div', { class: 'sources-facts__row' }, [h('dt', { class: 'label', text: k }), h('dd', {}, [].concat(v))]); }

// ---------- playlist aggregate ----------
const OUTCOME = {
  completed: { word: 'Completed', tone: 'ok', ic: 'check' },
  failed: { word: 'Failed', tone: 'critical', ic: 'warning' },
  unavailable: { word: 'Unavailable', tone: 'neutral', ic: 'unavailable' },
};
function collectionCard(ctx, live) {
  const col = AQ.collection;
  const out = h('p', { class: 'sources-hint', role: 'status' });
  const items = col.items.map((it) => {
    const o = OUTCOME[it.outcome];
    return h('li', { class: `sources-outcome raised sources-outcome--${it.outcome}` }, [
      h('span', { class: 'numeral sources-coll__n', text: String(it.n) }),
      h('span', { class: 'sources-outcome__text' }, [
        h('span', { class: 'title sources-outcome__t', text: `${it.title} — ${it.artist}` }),
        h('span', { class: 'sources-hint', text: it.outcome === 'completed' ? `${it.outcomeNote ? `${it.outcomeNote} · ` : ''}Ready to play · analysis pending` : it.outcomeWhy }),
      ]),
      h('span', { class: `flag label tone-${o.tone}` }, [icon(o.ic, { size: 12 }), h('span', { text: o.word })]),
    ]);
  });
  const salt = col.items.find((i) => i.outcome === 'failed');
  return h('section', { class: 'sources-panel sources-focus raised', 'aria-labelledby': 'sources-coll-t' }, [
    h('p', { class: 'sources-panel__kicker' }, [h('span', { class: 'label', text: 'Playlist · parent of 6 child jobs' }), h('span', { class: 'flag label tone-warning', text: 'Partly completed' })]),
    h('h2', { id: 'sources-coll-t', class: 'title sources-h2', text: col.name }),
    h('div', { class: 'sources-fixture-box sources-qtotal' }, [
      h('p', { class: 'sources-qtotal__line numeral', text: col.summary }),
      h('p', { class: 'sources-hint', text: 'Not finished: 2 tracks need attention. The 4 completed tracks are already in the library.' }),
      h('mdj-fixture-mark', { for: 'playlist outcomes' }),
    ]),
    h('ol', { class: 'sources-outcomes', 'aria-label': 'Per-track outcomes in playlist order' }, items),
    note('list', `Playlist order is kept. Downloads finished in a different order (${col.completionOrder.join(', ')}); that never reorders the playlist.`),
    h('div', { class: 'sources-actions sources-actions--wrap' }, [
      button({ label: `Details for ${salt.title}`, icon: 'info', cls: 'btn--secondary', fr: ['FR-049'], on: { click: () => ctx.navigate('sources/queue', { state: 'failed-html-response' }) } }),
      button({ label: 'Open completed in library', icon: 'library', cls: 'btn--primary', fr: ['FR-049', 'FR-035'], on: { click: () => ctx.navigate('launch/library', { state: 'browse' }) } }),
    ]),
    out,
    note('lock', 'Downloading a playlist only adds tracks. It never deletes or replaces music already on the phone.'),
  ]);
}

// ---------- every other job + state reference ----------
function jobList(ctx, focusId, summary) {
  const ids = LIST_ORDER.filter((id) => id !== focusId);
  const rows = ids.map((id) => {
    if (id === 'collection') {
      const col = AQ.collection;
      return h('li', { class: 'sources-job sources-job--parent raised' }, [
        h('div', { class: 'sources-job__line' }, [h('span', { class: 'title sources-job__t', text: col.name }), h('span', { class: 'flag label tone-warning', text: 'Playlist · partly completed' })]),
        h('p', { class: 'sources-hint numeral', text: col.summary }),
        button({ label: 'Details', icon: 'chevron-right', cls: 'btn--ghost sources-job__details', fr: ['FR-049'], attrs: { 'aria-label': `Details for ${col.name}` }, on: { click: () => ctx.navigate('sources/queue', { state: 'collection-partial' }) } }),
      ]);
    }
    const j = job(id);
    const st = DETAIL_STATE[id];
    return h('li', { class: `sources-job${HIDE_ROW_ACTIONS.has(j.jobState) ? ' sources-job--noactions' : ''}` }, [
      progressRow(j, { 'data-job': id }),
      h('div', { class: 'sources-job__line' }, [
        stateTag(j.jobState, TONE[j.jobState] || 'info'),
        h('span', { class: 'sources-hint sources-job__plain', text: plain(j.jobState) }),
        st ? button({ label: 'Details', icon: 'chevron-right', cls: 'btn--ghost sources-job__details', fr: ['FR-049'], attrs: { 'aria-label': `Details for ${j.title}` }, on: { click: () => ctx.navigate('sources/queue', { state: st }) } }) : null,
      ]),
      h('p', { class: 'sources-hint sources-job__out', role: 'status' }),
    ]);
  });
  const ref = h('details', { class: 'sources-ref raised' }, [
    h('summary', { class: 'sources-ref__sum', dataset: { hit: '48', fr: 'FR-049' } }, [h('span', { class: 'label label-strong', text: `Job states · ${AQ.stateReference.length}` }), h('span', { class: 'sources-hint', text: ' the acquisition contract' })]),
    h('dl', { class: 'sources-ref__list' }, AQ.stateReference.map((r) => h('div', { class: 'sources-ref__row' }, [h('dt', { class: 'sources-mono', text: r.id }), h('dd', { class: 'sources-hint', text: r.text })]))),
  ]);
  return [
    h('mdj-section-header', { title: 'All downloads', count: String(ids.length), note: `In request order · ${summary}`, level: '2' }),
    h('ul', { class: 'sources-jobs' }, rows),
    ref,
  ];
}

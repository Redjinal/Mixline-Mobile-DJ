// rec/history — saved sessions and recordings (FR-034, FR-031, FR-041; Document 07 §6, QA-11).
//
// Not a shell screen: it is reached after a set (Finish and save) or from the recorder's History link.
// Sessions, recordings, segment manifests, recovery and export contents come from fixtures/sessions.json
// (sessions, recordings) and fixtures/recording.json. No session store, file writer or exporter exists:
// "saved" and "complete" are printed only where the fixture carries an acknowledged state; export and
// delete stop at SENT; recovery progress is unknown and says so.
import { register } from '../../app/registry.js';
import { load } from '../../app/fixtures.js';
import { h, button, icon, fmt } from '../../components/base.js';

const REC = await load('recording');
const FR = ['FR-034'];

const hms = (sec) => {
  const t = Math.max(0, Math.round(sec));
  const hh = Math.floor(t / 3600), mm = Math.floor((t % 3600) / 60), ss = t % 60;
  return hh ? `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${mm}:${String(ss).padStart(2, '0')}`;
};
const when = (iso) => {
  const d = new Date(iso);
  const day = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${day} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

function allRecordings(fx) {
  const base = fx.sessions.recordings || {};
  const js = REC.justSaved.recording;
  return { [js.id]: { ...js, createdAt: fx.sessions.sessions[REC.justSaved.sessionId].savedAt }, ...base };
}
function sessionsList(fx) {
  const all = fx.sessions.sessions || {};
  // The just-saved session links to its finalized recording (added by this family's fixture).
  return Object.values(all).map((ss) => (ss.id === REC.justSaved.sessionId ? { ...ss, recording: REC.justSaved.recording.id } : ss))
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}
const trackTitle = (fx, id) => fx.track(id)?.title || id;

function recStateChip(r) {
  if (r.state === 'complete') return h('mdj-chip', { kind: 'status', label: 'Complete', tone: 'ok', icon: 'check', size: 'sm' });
  return h('mdj-chip', { kind: 'status', label: 'Incomplete', tone: 'warning', icon: 'warning', size: 'sm' });
}

function sentButton({ label, sentText, ...rest }) {
  const b = button({ label, ...rest, on: { click: () => {
    if (b.dataset.state === 'pending') return;
    b.dataset.state = 'pending'; b.setAttribute('aria-disabled', 'true');
    b.querySelector('.btn-label').textContent = sentText;
  } } });
  return b;
}

function section(title, children, { tone = null, cls = '' } = {}) {
  return h('section', { class: `recording-section ink-backing${tone ? ` recording-section--${tone}` : ''} ${cls}`.trim(), 'aria-label': title }, [
    h('h3', { class: 'recording-section__title label', text: title }), ...[].concat(children),
  ]);
}
function note(text, iconName = 'info') {
  return h('p', { class: 'recording-note body' }, [icon(iconName, { size: 16 }), h('span', { text })]);
}
function kv(rows) {
  return h('dl', { class: 'recording-kv' }, rows.filter(Boolean).flatMap(([k, v]) => [h('dt', { class: 'label', text: k }), h('dd', { class: 'body' }, [].concat(v))]));
}

// ---------- the list (sessions + recordings) ----------
function listPane(ctx, { selected = null } = {}) {
  const fx = ctx.fixtures;
  const recs = allRecordings(fx);
  const pane = h('div', { class: 'recording-list' });
  const sessUl = h('ul', { class: 'recording-rows' });
  for (const ss of sessionsList(fx)) {
    const id = `rec-hist-${ss.id}`;
    const missing = ss.missing?.length || 0;
    const detail = `${when(ss.savedAt)} · ${hms(ss.durationSec)} · ${ss.decks.length} decks${missing ? ` · ${missing} missing file` : ''}`;
    const target = ss.id === 'sess-3' ? () => ctx.setState('session-detail') : ss.id === REC.justSaved.sessionId ? () => ctx.setState('saved') : null;
    sessUl.appendChild(h('li', {}, [h('button', {
      type: 'button', class: `recording-rowbtn${selected === ss.id ? ' recording-rowbtn--on' : ''}`, dataset: { hit: '48', fr: 'FR-034' },
      'aria-label': ss.name, 'aria-describedby': id, 'aria-current': selected === ss.id ? 'true' : undefined,
      'aria-disabled': target ? undefined : 'true', on: { click: () => target && target() },
    }, [
      icon('history', { size: 18 }),
      h('span', { class: 'recording-rowbtn__text' }, [h('span', { class: 'title truncate', text: ss.name }), h('span', { id, class: 'muted recording-rowbtn__meta', text: target ? detail : `${detail} · details not drawn in this prototype` })]),
      missing ? h('mdj-chip', { kind: 'availability', value: 'missing', size: 'sm' }) : null,
    ])]));
  }
  pane.appendChild(section('Sessions', [sessUl]));
  const recUl = h('ul', { class: 'recording-rows' });
  for (const r of Object.values(recs)) {
    const target = r.id === 'rec-2' ? () => ctx.setState('incomplete-recording') : r.id === 'rec-1' ? () => ctx.setState('session-detail') : r.id === REC.justSaved.recording.id ? () => ctx.setState('saved') : null;
    const id = `rec-hist-${r.id}`;
    recUl.appendChild(h('li', {}, [h('button', {
      type: 'button', class: `recording-rowbtn${selected === r.id ? ' recording-rowbtn--on' : ''}`, dataset: { hit: '48', fr: 'FR-031' },
      'aria-label': `Recording ${r.name}`, 'aria-describedby': id, 'aria-disabled': target ? undefined : 'true', on: { click: () => target && target() },
    }, [
      icon('rec', { size: 18 }),
      h('span', { class: 'recording-rowbtn__text' }, [h('span', { class: 'title truncate', text: r.name }), h('span', { id, class: 'muted recording-rowbtn__meta numeral', text: `${r.format} · ${hms(r.durationSec)} · ${fmt.bytes(r.bytes)}` })]),
      recStateChip(r),
    ])]));
  }
  const recBox = h('div', { class: 'recording-fixture-box' }, [recUl, h('mdj-fixture-mark', { for: 'recording sizes and durations' })]);
  pane.appendChild(section('Recordings', [recBox]));
  return pane;
}

// ---------- detail panes ----------
function sessionCard(ctx, ss, { justSaved = false } = {}) {
  const fx = ctx.fixtures;
  const recs = allRecordings(fx);
  const rec = ss.recording ? recs[ss.recording] : null;
  const missing = new Set(ss.missing || []);
  const deckRows = h('ul', { class: 'recording-decks' }, ss.decks.map((tid, i) => {
    const letter = 'ABCD'[i];
    return h('li', { class: `recording-elig__row deck-${letter.toLowerCase()}` }, [
      h('span', { class: 'recording-deck numeral', 'aria-hidden': 'true', text: letter }),
      h('span', { class: 'recording-elig__title' }, [h('span', { class: 'title truncate', text: trackTitle(fx, tid) }), h('span', { class: 'muted recording-elig__src', text: `Deck ${letter} · ${fx.track(tid)?.artist || ''}` })]),
      missing.has(tid) ? h('mdj-chip', { kind: 'availability', value: 'missing', size: 'sm' }) : h('mdj-chip', { kind: 'availability', value: 'ready', size: 'sm' }),
    ]);
  }));
  const route = fx.route(ss.route);
  const recLine = rec
    ? h('span', { class: 'recording-reclink' }, [icon('rec', { size: 14 }), h('span', { text: `${rec.name} · ${rec.format} · ${hms(rec.durationSec)} · ` }), recStateChip(rec)])
    : 'No recording for this session';
  return h('article', { class: 'recording-card ink-backing', 'aria-label': `Session ${ss.name}` }, [
    h('header', { class: 'recording-card__head' }, [
      h('p', { class: 'label', text: justSaved ? 'Just saved' : 'Saved session' }),
      h('h2', { class: 'title recording-card__title', text: ss.name }),
      h('p', { class: 'muted', text: `${when(ss.savedAt)} · ${hms(ss.durationSec)} played` }),
    ]),
    deckRows,
    kv([
      ['Queue', ss.queue.length ? ss.queue.map((q) => trackTitle(fx, q)).join(' · ') : 'Empty'],
      ['Route', route ? `${route.name} · ${route.summary}` : ss.route],
      ['Recording', recLine],
    ]),
  ]);
}

function renderSaved(ctx) {
  const fx = ctx.fixtures;
  const ss = sessionsList(fx).find((x) => x.id === REC.justSaved.sessionId);
  const detail = h('div', { class: 'recording-detail' }, [
    h('mdj-toast', { tone: 'ok', icon: 'save', message: 'Session saved', detail: REC.justSaved.savedNote, 'no-dismiss': true, class: 'recording-toast' }),
    sessionCard(ctx, ss, { justSaved: true }),
    h('div', { class: 'recording-buttons' }, [
      button({ label: 'Reopen set', icon: 'resume', hit: 48, cls: 'btn--primary', fr: FR, on: { click: () => ctx.navigate('launch/open') } }),
      button({ label: 'Export session log', icon: 'export', hit: 48, cls: 'btn--secondary', fr: ['FR-041'], on: { click: () => ctx.setState('export') } }),
    ]),
    note('Reopening restores decks, cues and queue silently. Playback starts only when you press Play.', 'play'),
  ]);
  return { detail, list: listPane(ctx, { selected: ss.id }) };
}

function renderEmpty(ctx) {
  const empty = h('mdj-empty-state', {
    icon: 'history', title: 'No saved sessions yet',
    body: 'Sessions are saved at checkpoints while you play: decks, cues, queue and route. Recordings you make appear here too.',
    actions: JSON.stringify([{ id: 'library', label: 'Open library', icon: 'library', primary: true }, { id: 'record', label: 'Open recorder', icon: 'rec' }]),
  });
  empty.addEventListener('mdj:action', (e) => {
    if (e.detail.id === 'library') ctx.navigate('launch/library');
    if (e.detail.id === 'record') ctx.navigate('rec/panel');
  });
  return { detail: h('div', { class: 'recording-detail recording-detail--empty' }, [empty]), list: null };
}

function segList(segs) {
  return h('ol', { class: 'recording-segs' }, segs.map((g) => h('li', { class: `recording-seg recording-seg--${g.state}` }, [
    h('span', { class: 'recording-seg__n numeral', text: `Segment ${g.n}` }),
    h('span', { class: 'numeral', text: `${hms(g.fromSec)}–${hms(g.toSec)}` }),
    h('span', { class: 'numeral muted', text: fmt.bytes(g.bytes) }),
    h('span', { class: 'recording-seg__state label tone-ok' }, [icon('check', { size: 12 }), 'Valid']),
  ])));
}

function renderIncomplete(ctx) {
  const fx = ctx.fixtures;
  const r = allRecordings(fx)[REC.recoverable.recordingId];
  const confirmWrap = h('div', { class: 'recording-confirm' });
  const del = button({ label: 'Delete', icon: 'trash', hit: 48, cls: 'btn--danger', fr: ['FR-031'], attrs: { 'aria-haspopup': 'dialog' }, on: { click: () => {
    const sheet = h('mdj-sheet', {
      variant: 'confirm', icon: 'trash', title: `Delete “${r.name}”?`,
      body: `This removes all ${REC.recoverable.segments.length} recoverable segments (${hms(REC.recoverable.lastValidSec)} of audio). It cannot be undone. Your session log is kept.`,
      actions: JSON.stringify([{ id: 'cancel', label: 'Keep segments', primary: true }, { id: 'confirm', label: 'Delete segments', tone: 'danger', icon: 'trash' }]),
    });
    sheet.addEventListener('mdj:sheet-dismiss', () => confirmWrap.replaceChildren());
    sheet.addEventListener('mdj:sheet-action', (e) => {
      if (e.detail.id === 'cancel') { confirmWrap.replaceChildren(); return; }
      confirmWrap.replaceChildren(note('Delete sent. The recording stays listed until the store confirms the files are gone.', 'trash'));
    });
    confirmWrap.replaceChildren(sheet);
  } } });
  const detail = h('div', { class: 'recording-detail' }, [
    h('article', { class: 'recording-card ink-backing', 'aria-label': `Recording ${r.name}` }, [
      h('header', { class: 'recording-card__head' }, [
        h('p', { class: 'label', text: 'Recording · incomplete' }),
        h('h2', { class: 'title recording-card__title', text: r.name }),
        h('p', { class: 'muted', text: `${when(r.createdAt)} · ${r.format}` }),
      ]),
      h('div', { class: 'recording-chips' }, [recStateChip(r), h('mdj-chip', { kind: 'status', label: `${REC.recoverable.segments.length} recoverable segments`, icon: 'segment', size: 'sm' })]),
      h('p', { class: 'body', text: `${r.note} The audience mix was not affected; this file simply ends at ${hms(REC.recoverable.lastValidSec)}.` }),
      h('div', { class: 'recording-fixture-box' }, [segList(REC.recoverable.segments), h('mdj-fixture-mark', { for: 'segment manifest' })]),
    ]),
    h('div', { class: 'recording-buttons' }, [
      button({ label: 'Recover', icon: 'recover', hit: 48, cls: 'btn--primary', fr: ['FR-031'], on: { click: () => ctx.setState('recover-fragments') } }),
      sentButton({ label: 'Export segments', sentText: 'Export sent · waiting for the file to be written', icon: 'export', hit: 48, cls: 'btn--secondary', fr: ['FR-041'] }),
      del,
    ]),
    confirmWrap,
    note('Recover joins the valid segments into one file marked Incomplete. It never fills the gap after the stop point.', 'recover'),
  ]);
  return { detail, list: listPane(ctx, { selected: r.id }) };
}

function renderRecover(ctx) {
  const fx = ctx.fixtures;
  const r = allRecordings(fx)[REC.recovery.recordingId];
  const word = { verified: ['Checked', 'check', 'ok'], checking: ['Checking', 'loader', 'info'], waiting: ['Waiting', 'clock', 'neutral'] };
  const detail = h('div', { class: 'recording-detail' }, [
    h('article', { class: 'recording-card ink-backing', 'aria-label': `Recovering ${r.name}` }, [
      h('header', { class: 'recording-card__head' }, [
        h('p', { class: 'label', text: 'Recovering segments' }),
        h('h2', { class: 'title recording-card__title', text: r.name }),
      ]),
      h('div', { class: 'recording-unknown recording-fixture-box', role: 'status', 'aria-label': 'Recovery progress unknown' }, [
        h('span', { class: 'recording-unknown__bar', 'aria-hidden': 'true' }),
        h('span', { class: 'label', text: 'Progress unknown — segments are checked one at a time' }),
        h('mdj-fixture-mark', { for: 'recovery steps' }),
      ]),
      h('ol', { class: 'recording-steps' }, REC.recovery.segments.map((g) => {
        const [w, ic, tone] = word[g.state];
        return h('li', { class: 'recording-step' }, [
          h('span', { class: 'body' }, [h('strong', { text: `Segment ${g.n}` }), ` · ${g.text}`]),
          h('span', { class: `recording-seg__state label tone-${tone}` }, [icon(ic, { size: 12 }), w]),
        ]);
      })),
    ]),
    h('div', { class: 'recording-buttons' }, [
      sentButton({ label: 'Cancel recovery', sentText: 'Cancel sent · segments are kept unchanged', icon: 'cancel', hit: 48, cls: 'btn--secondary', fr: ['FR-031'] }),
      button({ label: 'Back to history', icon: 'chevron-left', hit: 48, cls: 'btn--ghost', fr: FR, on: { click: () => ctx.setState('incomplete-recording') } }),
    ]),
    note('Recovery runs in the background and never touches live audio. The result is marked Incomplete and ends at 24:40.', 'info'),
  ]);
  return { detail, list: listPane(ctx, { selected: r.id }) };
}

function renderExport(ctx) {
  const fx = ctx.fixtures;
  const ss = sessionsList(fx).find((x) => x.id === REC.export.sessionId);
  const ex = REC.export;
  let media = ex.mediaCopies.default;
  const sw = h('button', {
    type: 'button', role: 'switch', class: 'recording-switch', dataset: { hit: '48', fr: 'FR-041' }, 'aria-checked': String(media),
    on: { click: () => { media = !media; sw.setAttribute('aria-checked', String(media)); sw.querySelector('.recording-switch__word').textContent = media ? 'On' : 'Off'; } },
  }, [h('span', { class: 'recording-switch__text' }, [h('span', { class: 'title', text: 'Include media copies' }), h('span', { class: 'muted', text: ex.mediaCopies.note })]), h('span', { class: 'recording-switch__knob', 'aria-hidden': 'true' }), h('span', { class: 'recording-switch__word label', text: media ? 'On' : 'Off' })]);
  const exportBtn = sentButton({ label: 'Choose where to save', sentText: 'Sent · nothing is exported until the file is written', icon: 'export', hit: 48, cls: 'btn--primary', fr: ['FR-041'] });
  const sheet = h('mdj-sheet', { variant: 'sheet', title: 'Export session log', icon: 'export', 'dismiss-label': 'Close', class: 'recording-sheet' }, [
    h('p', { class: 'sheet__p', text: `${ss.name} · ${when(ss.savedAt)} · ${ex.formatVersion}` }),
    h('p', { class: 'label', text: 'Included' }),
    h('ul', { class: 'recording-bullets body' }, ex.included.map((t) => h('li', { text: t }))),
    h('p', { class: 'recording-note recording-note--strong body' }, [icon('lock', { size: 16 }), h('span', { text: ex.excluded })]),
    sw,
    h('div', { class: 'recording-sheet__actions' }, [
      button({ label: 'Cancel', hit: 48, cls: 'btn--secondary', on: { click: () => ctx.setState('saved') } }),
      exportBtn,
    ]),
  ]);
  sheet.addEventListener('mdj:sheet-dismiss', () => ctx.setState('saved'));
  return { detail: h('div', { class: 'recording-detail' }, [sheet]), list: null };
}

function renderSessionDetail(ctx) {
  const fx = ctx.fixtures;
  const ss = sessionsList(fx).find((x) => x.id === 'sess-3');
  const miss = (ss.missing || []).map((id) => trackTitle(fx, id));
  const detail = h('div', { class: 'recording-detail' }, [
    sessionCard(ctx, ss),
    h('section', { class: 'recording-section ink-backing recording-section--warning', 'aria-label': 'Missing media' }, [
      h('h3', { class: 'recording-section__title label', text: 'Missing media' }),
      h('p', { class: 'body', text: `${miss.join(', ')} is no longer at its saved location. The session still opens; that deck loads empty until you locate the file. Other decks and the queue are unaffected.` }),
    ]),
    h('div', { class: 'recording-buttons' }, [
      button({ label: 'Reopen set', icon: 'resume', hit: 48, cls: 'btn--primary', fr: FR, on: { click: () => ctx.navigate('launch/open', { state: 'resume-missing' }) } }),
      button({ label: `Locate ${miss[0] || 'file'}`, icon: 'folder', hit: 48, cls: 'btn--secondary', fr: ['FR-002'], on: { click: () => ctx.navigate('launch/library') } }),
      button({ label: 'Back to history', icon: 'chevron-left', hit: 48, cls: 'btn--ghost', fr: FR, on: { click: () => ctx.setState('saved') } }),
    ]),
  ]);
  return { detail, list: listPane(ctx, { selected: ss.id }) };
}

const RENDER = {
  saved: renderSaved, empty: renderEmpty, 'incomplete-recording': renderIncomplete, export: renderExport,
  'session-detail': renderSessionDetail, 'recover-fragments': renderRecover,
};

register({
  id: 'rec/history',
  family: 'recording',
  title: 'Sessions and recordings',
  order: 2,
  fr: ['FR-034', 'FR-031', 'FR-041'],
  shell: false,
  states: {
    saved: { label: 'Session just saved', exercised: true, scenario: 'set-ready' },
    empty: { label: 'No saved sessions', exercised: false, scenario: 'fresh' },
    'incomplete-recording': { label: 'Incomplete recording · recoverable segments', exercised: false, scenario: 'set-ready' },
    export: { label: 'Export session log', exercised: true, scenario: 'set-ready', via: { from: 'saved', control: 'Export session log' } },
    'session-detail': { label: 'Saved session with missing media', exercised: true, scenario: 'missing-media', via: { from: 'saved', control: 'Rooftop warm-up' } },
    'recover-fragments': { label: 'Recovering segments · progress unknown', exercised: true, scenario: 'set-ready', via: { from: 'incomplete-recording', control: 'Recover' } },
  },
  defaultState: 'saved',
  render(ctx) {
    const { detail, list } = (RENDER[ctx.state] || RENDER.saved)(ctx);
    const top = h('header', { class: 'recording-topbar ink-backing' }, [
      h('button', { type: 'button', class: 'btn btn--ghost recording-back', dataset: { hit: '48' }, 'aria-label': 'Back to the recorder', on: { click: () => ctx.navigate('rec/panel') } }, [icon('chevron-left', { size: 20 }), h('span', { class: 'btn-label', text: 'Recorder' })]),
      h('h1', { class: 'title recording-topbar__title', text: 'Sessions and recordings' }),
    ]);
    const body = h('div', { class: `recording-history__body${list ? '' : ' recording-history__body--single'}` }, [detail, list]);
    return h('div', { class: `stage recording-history recording-history--${ctx.state}`, dataset: { orientation: ctx.orientation } }, [top, body]);
  },
});

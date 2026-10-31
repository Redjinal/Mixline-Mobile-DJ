// rec/panel — the mix recorder (FR-031, FR-036; Document 07 §6 "Recording", Document 06 AE-07, QA-11).
//
// A shell screen: the persistent dock keeps transport, crossfader, route and master reachable while the
// recorder is open, and the shell's REC button reflects the scenario's recording state.
// No recorder, encoder, journal or file system exists. Elapsed time, bytes, free space, segments, markers,
// finalization and writer errors are fixtures (sessions.json scenario + fixtures/recording.json) and the
// boxes that print them carry a FIXTURE mark. This screen stands in for the engine: a tap moves to the
// state the fixture declares as acknowledged; nothing here says "Done" without such a state.
import { register } from '../../app/registry.js';
import { load } from '../../app/fixtures.js';
import { h, button, icon, fmt } from '../../components/base.js';

const REC = await load('recording');

// The format the user picked in the format sheet. View state only (no engine), kept for the session of
// the prototype page so the idle panel and the sheet agree.
let chosenFormat = (REC.formats.find((f) => f.default) || REC.formats[0]).id;

const FR = ['FR-031'];

const hms = (sec) => {
  const t = Math.max(0, Math.round(sec));
  const hh = Math.floor(t / 3600), mm = Math.floor((t % 3600) / 60), ss = t % 60;
  return hh ? `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${mm}:${String(ss).padStart(2, '0')}`;
};
const roughHours = (sec) => {
  if (sec <= 0) return 'none';
  if (sec < 3600) return `about ${Math.max(1, Math.round(sec / 60))} min`;
  return `about ${Math.round(sec / 3600)} h`;
};
const gb = (bytes) => fmt.bytes(bytes);

function formatById(id) { return REC.formats.find((f) => f.id === id) || REC.formats[0]; }
function usableBytes(s) { return Math.max(0, (s.storage?.freeBytes || 0) - REC.safetyMarginBytes); }
function estimateSec(s, f, alreadyWritten = 0) { return Math.max(0, usableBytes(s) - alreadyWritten) / f.bytesPerSec; }

// ---------- small local building blocks ----------
function statusWord(word, tone, iconName) {
  return h('span', { class: `recording-status tone-${tone} label` }, [icon(iconName, { size: 14 }), h('span', { text: word })]);
}
function fact(label, value, { note = null, numeral = true } = {}) {
  return h('div', { class: 'recording-fact' }, [
    h('dt', { class: 'label', text: label }),
    h('dd', { class: numeral ? 'numeral recording-fact__value' : 'body recording-fact__value', text: value }),
    note ? h('dd', { class: 'recording-fact__note muted', text: note }) : null,
  ]);
}
function facts(items, fixtureFor = null) {
  const dl = h('dl', { class: `recording-facts ink-backing${fixtureFor ? ' recording-fixture-box' : ''}` }, items);
  if (fixtureFor) dl.appendChild(h('mdj-fixture-mark', { for: fixtureFor }));
  return dl;
}
function panelSection(title, children, { tone = null, cls = '' } = {}) {
  return h('section', { class: `recording-section ink-backing${tone ? ` recording-section--${tone}` : ''} ${cls}`.trim(), 'aria-label': title }, [
    h('h3', { class: 'recording-section__title label', text: title }),
    ...[].concat(children),
  ]);
}
function note(text, iconName = 'info') {
  return h('p', { class: 'recording-note body' }, [icon(iconName, { size: 16 }), h('span', { text })]);
}

// The recorder face: big elapsed numeral on an opaque titanium-rimmed backing, brass index marks.
function hero({ word, tone, iconName, numeral, numeralLabel, lines = [], fixtureFor = null, ring = 'idle', compact = false }) {
  if (compact) {
    const strip = h('div', { class: `recording-hero recording-hero--compact titanium recording-fixture-box` }, [
      h('div', { class: `recording-hero__face recording-hero__face--${ring}` }, [
        h('p', { class: 'recording-hero__numeral numeral', 'aria-label': numeralLabel, text: numeral }),
        statusWord(word, tone, iconName),
      ]),
      h('p', { class: 'recording-hero__inline body' }, lines.map((l) => h('span', {}, [l[0] ? h('span', { class: 'label', text: `${l[0]} ` }) : null, h('span', { class: l[2] ? 'numeral' : '', text: l[1] })]))),
    ]);
    if (fixtureFor) strip.appendChild(h('mdj-fixture-mark', { for: fixtureFor }));
    return strip;
  }
  const face = h('div', { class: `recording-hero__face recording-hero__face--${ring}` }, [
    h('div', { class: 'recording-hero__marks', 'aria-hidden': 'true' }, Array.from({ length: 12 }, () => h('span', { class: 'index-mark' }))),
    h('p', { class: 'recording-hero__numeral numeral', 'aria-label': numeralLabel, text: numeral }),
    statusWord(word, tone, iconName),
  ]);
  const box = h('div', { class: `recording-hero titanium${fixtureFor ? ' recording-fixture-box' : ''}` }, [
    face,
    lines.length ? h('ul', { class: 'recording-hero__lines' }, lines.map((l) => h('li', { class: 'body' }, [h('span', { class: 'label', text: l[0] }), h('span', { class: l[2] ? 'numeral recording-hero__value' : 'recording-hero__value', text: l[1] })]))) : null,
  ]);
  if (fixtureFor) box.appendChild(h('mdj-fixture-mark', { for: fixtureFor }));
  return box;
}

// Mark a button as sent: the screen has no engine/store to acknowledge it, so it stays SENT honestly.
function markSent(btn, text) {
  btn.dataset.state = 'pending';
  btn.setAttribute('aria-disabled', 'true');
  const lab = btn.querySelector('.btn-label');
  if (lab) lab.textContent = text;
}
function sentButton({ label, sentText, ...rest }) {
  const b = button({ label, fr: FR, ...rest, on: { click: () => { if (b.dataset.state !== 'pending') markSent(b, sentText); } } });
  return b;
}

function eligibilityList(s) {
  const decks = Object.values(s.decks).filter((d) => d.enabled && d.track);
  const list = h('ul', { class: 'recording-elig' });
  for (const d of decks) {
    const local = d.track.source === 'local' || d.track.source === 'demo';
    list.appendChild(h('li', { class: `recording-elig__row deck-${d.letter.toLowerCase()}` }, [
      h('span', { class: 'recording-deck numeral', 'aria-hidden': 'true', text: d.letter }),
      h('span', { class: 'recording-elig__title' }, [
        h('span', { class: 'title truncate', text: d.track.title }),
        h('span', { class: 'muted recording-elig__src', text: local ? `Deck ${d.letter} · imported local file · you manage the rights for your use` : `Deck ${d.letter} · ${d.track.actualSource || d.track.source}` }),
      ]),
      h('mdj-chip', { kind: 'capability', label: 'Record', value: local ? 'allowed' : 'unknown', size: 'sm' }),
    ]));
  }
  return list;
}

const SOURCE_NOTE = 'Records the master after the limiter; headphone cue is not recorded. Phone volume does not change the file.';

// ---------- states ----------
function renderIdle(ctx, { sheet = false } = {}) {
  const s = ctx.session;
  const f = formatById(chosenFormat);
  const est = estimateSec(s, f);
  const parts = {};
  parts.hero = hero({
    word: 'Ready · not recording', tone: 'neutral', iconName: 'rec', numeral: '0:00', numeralLabel: 'Elapsed 0:00, not recording',
    lines: [['Format', `${f.label} · ${f.detail}`], ['Time available', roughHours(est), true]], ring: 'idle', fixtureFor: 'storage estimate', compact: sheet,
  });
  const start = button({ label: 'Start recording', icon: 'rec', hit: 56, cls: 'btn--primary recording-start', fr: FR, on: { click: () => ctx.setState('recording') } });
  const fmtBtn = button({ label: 'Change format', icon: 'settings', hit: 48, cls: 'btn--secondary', fr: FR, on: { click: () => ctx.setState('format-choice') }, attrs: { 'aria-haspopup': 'dialog' } });
  parts.actions = [start, fmtBtn];
  parts.main = [
    facts([
      fact('Free space', gb(s.storage.freeBytes)),
      fact('Safety reserve', gb(REC.safetyMarginBytes), { note: REC.safetyMarginNote }),
      fact('Usable', gb(usableBytes(s)), { note: 'Free space minus the reserve' }),
      fact('Rate', `${(f.bytesPerSec * 8 / 1e6).toFixed(2)} Mbit/s`, { note: `${f.label}: ${f.rateNote}` }),
    ], 'free space and estimate'),
    panelSection('Sources on the decks', [eligibilityList(s), note('Recording is checked for every source that reaches the master. A source with unknown permission is not recorded.', 'lock')]),
    note(SOURCE_NOTE, 'master'),
  ];
  if (sheet) parts.sheet = formatSheet(ctx);
  return parts;
}

function formatSheet(ctx) {
  const s = ctx.session;
  const group = h('div', { class: 'recording-formats', role: 'radiogroup', 'aria-label': 'Recording format' });
  const confirm = button({ label: `Use ${formatById(chosenFormat).label}`, icon: 'check', hit: 48, cls: 'btn--primary', fr: FR, on: { click: () => ctx.setState('idle') } });
  const paint = () => {
    for (const b of group.querySelectorAll('[role="radio"]')) {
      const on = b.dataset.format === chosenFormat;
      b.setAttribute('aria-checked', String(on));
      b.classList.toggle('recording-format--on', on);
    }
    confirm.querySelector('.btn-label').textContent = `Use ${formatById(chosenFormat).label}`;
  };
  for (const f of REC.formats) {
    const est = estimateSec(s, f);
    group.appendChild(h('button', {
      type: 'button', role: 'radio', class: 'recording-format', dataset: { hit: '48', fr: FR.join(' '), format: f.id },
      'aria-label': `${f.label}, ${f.detail}, ${roughHours(est)} on this phone`,
      on: { click: () => { chosenFormat = f.id; paint(); } },
    }, [
      h('span', { class: 'recording-format__dot', 'aria-hidden': 'true' }),
      h('span', { class: 'recording-format__text' }, [
        h('span', { class: 'title', text: f.label }),
        h('span', { class: 'muted', text: f.detail }),
        h('span', { class: 'muted recording-format__why', text: f.rateNote }),
      ]),
      h('span', { class: 'recording-format__est numeral', text: roughHours(est) }),
    ]));
  }
  const sheet = h('mdj-sheet', { variant: 'sheet', title: 'Recording format', 'dismiss-label': 'Close', icon: 'rec', class: 'recording-sheet' }, [
    h('p', { class: 'sheet__p', text: `Estimated from ${gb(s.storage.freeBytes)} free minus the ${gb(REC.safetyMarginBytes)} safety reserve. The recorder checks real free space while it writes.` }),
    h('div', { class: 'recording-fixture-box' }, [group, h('mdj-fixture-mark', { for: 'format estimates' })]),
    h('div', { class: 'recording-sheet__actions' }, [confirm]),
  ]);
  sheet.addEventListener('mdj:sheet-dismiss', () => ctx.setState('idle'));
  queueMicrotask(paint);
  return sheet;
}

function recordingHero(ctx, extra = {}) {
  const r = ctx.session.recording;
  if (extra.compact) extra = { lines: [['', r.format], ['', `${fmt.bytes(r.bytes)} written`, true]], ...extra };
  return hero({
    word: 'Recording', tone: 'critical', iconName: 'rec', numeral: hms(r.elapsedSec), numeralLabel: `Recording, ${hms(r.elapsedSec)} elapsed`,
    lines: [['Format', r.format], ['Written', fmt.bytes(r.bytes), true]], ring: 'live', fixtureFor: 'recorder elapsed and bytes', ...extra,
  });
}

function renderRecording(ctx) {
  const s = ctx.session;
  const r = s.recording;
  const f = REC.formats.find((x) => x.scenarioFormat === r.format) || formatById('flac');
  const left = estimateSec(s, f, 0);
  const parts = { hero: recordingHero(ctx) };
  parts.actions = [
    button({ label: 'Stop recording', icon: 'record-stop', hit: 56, cls: 'btn--primary recording-stop', fr: FR, on: { click: () => ctx.setState('finalizing') } }),
    button({ label: 'Add marker', icon: 'marker', hit: 48, cls: 'btn--secondary', fr: FR, on: { click: () => ctx.setState('markers') } }),
  ];
  parts.main = [
    facts([
      fact('Time left', roughHours(left), { note: `Estimate · stops at the ${gb(REC.safetyMarginBytes)} reserve` }),
      fact('Free space', gb(s.storage.freeBytes)),
      fact('Markers', String(r.markers ?? 0)),
      fact('Segment', `${Math.floor(r.elapsedSec / REC.segmentSec) + 1}`, { note: `New file segment every ${REC.segmentSec / 60} min; journal every ${REC.chunkSec} s` }),
    ], 'recorder figures'),
    note('Recording continues if you browse. The REC button at the top brings you back.', 'history'),
    h('div', { class: 'recording-row' }, [
      button({ label: 'Browse library', icon: 'library', hit: 48, cls: 'btn--secondary', on: { click: () => ctx.navigate('launch/library') } }),
    ]),
    panelSection('Sources on the decks', [eligibilityList(s)]),
    note(SOURCE_NOTE, 'master'),
  ];
  return parts;
}

function renderMarkers(ctx) {
  const parts = renderRecording(ctx);
  parts.hero = recordingHero(ctx, { compact: true });
  parts.actions = [
    button({ label: 'Back to recorder', icon: 'chevron-left', hit: 48, cls: 'btn--secondary', fr: FR, on: { click: () => ctx.setState('recording') } }),
    button({ label: 'Stop recording', icon: 'record-stop', hit: 56, cls: 'btn--primary recording-stop', fr: FR, on: { click: () => ctx.setState('finalizing') } }),
  ];
  const list = h('ol', { class: 'recording-markers' });
  for (const m of [...REC.markers].sort((a, b) => b.atSec - a.atSec)) {
    list.appendChild(h('li', { class: `recording-marker${m.new ? ' recording-marker--new' : ''}` }, [
      h('mdj-marker', { kind: 'memory', n: String(m.n), color: m.new ? 'yellow' : 'none', label: m.name, size: 22 }),
      h('span', { class: 'recording-marker__time numeral', text: hms(m.atSec) }),
      h('span', { class: 'recording-marker__name' }, [
        h('span', { class: 'title', text: m.name }),
        m.note ? h('span', { class: 'muted', text: m.note }) : h('span', { class: 'muted', text: 'Saved in the recording journal' }),
      ]),
    ]));
  }
  parts.main = [
    panelSection('Markers in this recording · newest first', [
      h('div', { class: 'recording-fixture-box' }, [list, h('mdj-fixture-mark', { for: 'marker times' })]),
      note('Markers are stored with the recording and appear in its history and export. Names can be edited after the set.', 'marker'),
    ]),
    note('Recording continues while this list is open.', 'rec'),
  ];
  return parts;
}

function renderRestricted(ctx) {
  const s = ctx.session;
  const rr = REC.restricted;
  const t = ctx.fixtures.track(rr.trackId);
  const parts = { hero: recordingHero(ctx, { compact: true }) };
  const finalize = button({ label: 'Finalize this recording before the restricted track plays', icon: 'record-stop', hit: 56, cls: 'btn--primary recording-choice', fr: ['FR-031', 'FR-036'], on: { click: () => ctx.setState('finalizing') } });
  const skip = sentButton({ label: 'Skip the track', sentText: 'Skip sent · waiting for the queue to confirm', icon: 'chevron-right', hit: 48, cls: 'btn--secondary recording-choice', fr: ['FR-036'] });
  const cont = sentButton({ label: 'Continue without recording it', sentText: 'Sent · the recorder confirms the gap before the track starts', icon: 'rec', hit: 48, cls: 'btn--secondary recording-choice', fr: ['FR-031', 'FR-036'] });
  parts.actions = [finalize, skip, cont];
  parts.main = [
    panelSection('Next track cannot be recorded', [
      h('div', { class: 'recording-restricted' }, [
        h('p', { class: 'title recording-restricted__title', text: t ? t.title : rr.trackId }),
        h('p', { class: 'muted', text: `${t ? t.artist : ''} · ${rr.position}` }),
        h('div', { class: 'recording-chips' }, [
          h('mdj-chip', { kind: 'capability', label: 'Record', value: rr.capability }),
          h('mdj-chip', { kind: 'capability', label: 'Play', value: 'allowed' }),
        ]),
        h('p', { class: 'body recording-fixture-box' }, [`Starts in about ${hms(rr.plannedInSec)} if nothing changes.`, h('mdj-fixture-mark', { for: 'queue timing', inline: true })]),
      ]),
    ], { tone: 'warning' }),
  ];
  parts.after = [
    panelSection('Why, and what each choice does', [
      h('p', { class: 'body', text: rr.reason }),
      h('ul', { class: 'recording-bullets body' }, [
        h('li', { text: 'Finalize: the file ends cleanly before SODA LIGHTS starts. It stays complete for what it contains.' }),
        h('li', { text: 'Skip: the queue moves to the next eligible track; recording continues.' }),
        h('li', { text: `Continue without recording it: the track plays to the room, the file has a gap of about ${hms(t ? t.durationSec : 0)} and is marked Partial in history. It never claims the whole set was captured.` }),
      ]),
    ]),
  ];
  return parts;
}

function segmentList(segs) {
  return h('ol', { class: 'recording-segs' }, segs.map((g) => h('li', { class: `recording-seg recording-seg--${g.state}` }, [
    h('span', { class: 'recording-seg__n numeral', text: `Segment ${g.n}` }),
    h('span', { class: 'numeral', text: `${hms(g.fromSec)}–${hms(g.toSec)}` }),
    h('span', { class: 'numeral muted', text: fmt.bytes(g.bytes) }),
    h('span', { class: `recording-seg__state label ${g.state === 'valid' ? 'tone-ok' : 'tone-critical'}` }, [icon(g.state === 'valid' ? 'check' : 'x', { size: 12 }), g.state === 'valid' ? 'Valid' : 'Not usable']),
  ])));
}

function deckStillPlaying(s) {
  const playing = Object.values(s.decks).filter((d) => d.enabled && d.state === 'playing');
  if (!playing.length) return 'No deck was playing.';
  return `Playback continued: ${playing.map((d) => `Deck ${d.letter} ${d.track.title}`).join(', ')} is still playing on the master.`;
}

function renderStorageFull(ctx) {
  const s = ctx.session;
  const r = s.recording;
  const sf = REC.storageFull;
  const parts = {};
  parts.hero = hero({
    word: 'Stopped · storage low', tone: 'warning', iconName: 'storage', numeral: hms(sf.stoppedAtSec), numeralLabel: `Recording stopped at ${hms(sf.stoppedAtSec)} because storage is low`,
    lines: [['Format', r.format], ['Kept', `${r.recoveredSegments} segments · ${fmt.bytes(r.bytes)}`, true]], ring: 'stopped', fixtureFor: 'recorder stop point and bytes',
  });
  parts.actions = [
    sentButton({ label: 'Free space', sentText: 'Opening Android storage settings (outside this app)', icon: 'storage', hit: 48, cls: 'btn--primary', fr: ['FR-031', 'FR-042'] }),
    sentButton({ label: 'Keep segments', sentText: 'Sent · history shows them once the store confirms', icon: 'save', hit: 48, cls: 'btn--secondary', fr: FR }),
  ];
  parts.main = [
    panelSection('Recording stopped, music did not', [
      h('p', { class: 'body', text: `${sf.reason}. ${deckStillPlaying(s)}` }),
      h('p', { class: 'body', text: `Free space now: ${gb(s.storage.freeBytes)}; the reserve is ${gb(REC.safetyMarginBytes)}.` }),
    ], { tone: 'warning' }),
    panelSection(`${r.recoveredSegments} recoverable segments`, [
      h('div', { class: 'recording-fixture-box' }, [segmentList(sf.segments), h('mdj-fixture-mark', { for: 'segment manifest' })]),
      note('The file is incomplete: it ends at the stop point. Free space before starting a new recording; the next one is a separate file.', 'segment'),
    ]),
  ];
  return parts;
}

function renderInterrupted(ctx) {
  const s = ctx.session;
  const wf = REC.writerFailure;
  const parts = {};
  parts.hero = hero({
    word: 'Incomplete · writer failed', tone: 'critical', iconName: 'warning', numeral: hms(wf.lastValidSec), numeralLabel: `Recording incomplete; last valid chunk ends at ${hms(wf.lastValidSec)}`,
    lines: [['Last valid chunk', hms(wf.lastValidSec), true], ['Status', 'Incomplete · playback unaffected']], ring: 'stopped', fixtureFor: 'writer failure and last valid chunk',
  });
  parts.actions = [
    sentButton({ label: 'Keep valid segments', sentText: 'Sent · history shows them once the store confirms', icon: 'save', hit: 48, cls: 'btn--primary', fr: FR }),
    button({ label: 'Start a new recording', icon: 'rec', hit: 48, cls: 'btn--secondary', fr: FR, on: { click: () => ctx.setState('idle') } }),
  ];
  parts.main = [
    panelSection('The recorder stopped; playback is unaffected', [
      h('p', { class: 'body', text: `${wf.error}. ${deckStillPlaying(s)}` }),
      h('p', { class: 'body', text: `The recording is kept up to ${hms(wf.lastValidSec)}, the last chunk the journal confirmed. Nothing after that point is claimed.` }),
    ], { tone: 'critical' }),
    panelSection('Segments', [
      h('div', { class: 'recording-fixture-box' }, [segmentList(wf.segments), h('mdj-fixture-mark', { for: 'segment manifest' })]),
    ]),
  ];
  return parts;
}

function renderFinalizing(ctx) {
  const s = ctx.session;
  const fz = REC.finalizing;
  const parts = {};
  parts.hero = hero({
    word: 'Finalizing · progress unknown', tone: 'info', iconName: 'loader', numeral: hms(fz.durationSec), numeralLabel: `Finalizing a ${hms(fz.durationSec)} recording; progress unknown`,
    lines: [['Format', formatById('flac').scenarioFormat], ['Size so far', fmt.bytes(fz.bytes), true]], ring: 'stopped', fixtureFor: 'finalization',
  });
  parts.actions = [
    sentButton({ label: 'Cancel finalization', sentText: 'Cancel sent · segments are kept as they are', icon: 'cancel', hit: 48, cls: 'btn--secondary', fr: FR }),
  ];
  const stepWord = { acknowledged: ['Done (acknowledged)', 'check', 'ok'], running: ['In progress', 'loader', 'info'], waiting: ['Waiting', 'clock', 'neutral'] };
  parts.main = [
    panelSection('Finishing the file', [
      h('div', { class: 'recording-unknown recording-fixture-box', role: 'status', 'aria-label': 'Finalization progress unknown' }, [
        h('span', { class: 'recording-unknown__bar', 'aria-hidden': 'true' }),
        h('span', { class: 'label', text: 'Progress unknown — the writer reports steps, not a percentage' }),
        h('mdj-fixture-mark', { for: 'finalization steps' }),
      ]),
      h('ol', { class: 'recording-steps' }, fz.steps.map((st) => {
        const [w, ic, tone] = stepWord[st.state];
        return h('li', { class: 'recording-step' }, [h('span', { class: 'body', text: st.label }), h('span', { class: `recording-seg__state label tone-${tone}` }, [icon(ic, { size: 12 }), w])]);
      })),
    ]),
    note(`Cancel keeps the segments already written; you can recover them from history. ${deckStillPlaying(s)}`, 'segment'),
  ];
  return parts;
}

// ---------- layout ----------
function layout(ctx, parts, state) {
  const root = h('div', { class: `recording-panel recording-panel--${state}`, dataset: { orientation: ctx.orientation } });
  const head = h('header', { class: 'recording-head' }, [
    h('h2', { class: 'title recording-head__title', text: 'Record the mix' }),
    h('button', { type: 'button', class: 'btn btn--ghost recording-head__link', dataset: { hit: '48', fr: 'FR-034' }, on: { click: () => ctx.navigate('rec/history') } }, [icon('history', { size: 18 }), h('span', { class: 'btn-label', text: 'History' })]),
  ]);
  const actions = h('div', { class: 'recording-actions' }, parts.actions);
  const main = h('div', { class: 'recording-main' }, parts.main);
  root.append(head, parts.hero, actions, main);
  if (parts.after) { root.classList.add('recording-panel--after'); root.appendChild(h('div', { class: 'recording-after' }, parts.after)); }
  if (parts.sheet) { root.classList.add('recording-panel--sheet'); root.appendChild(h('div', { class: 'recording-sheet-wrap' }, [parts.sheet])); }
  return root;
}

const RENDER = {
  idle: (ctx) => renderIdle(ctx),
  'format-choice': (ctx) => renderIdle(ctx, { sheet: true }),
  recording: renderRecording,
  markers: renderMarkers,
  'restricted-source': renderRestricted,
  'storage-full': renderStorageFull,
  'interrupted-writer': renderInterrupted,
  finalizing: renderFinalizing,
};

register({
  id: 'rec/panel',
  family: 'recording',
  title: 'Recording panel',
  order: 1,
  fr: ['FR-031', 'FR-036', 'FR-042'],
  shell: true,
  dock: { portrait: true, landscape: true },
  states: {
    idle: { label: 'Ready to record (eligible)', exercised: true, scenario: 'set-ready' },
    recording: { label: 'Recording', exercised: true, scenario: 'recording', via: { from: 'idle', control: 'Start recording' } },
    'restricted-source': { label: 'Restricted source next', exercised: false, scenario: 'recording' },
    'storage-full': { label: 'Storage full — recording stopped, playback continued', exercised: false, scenario: 'low-storage' },
    'interrupted-writer': { label: 'Interrupted writer — incomplete', exercised: false, scenario: 'a-playing' },
    finalizing: { label: 'Finalizing — progress unknown', exercised: true, scenario: 'a-playing', via: { from: 'recording', control: 'Stop recording' } },
    'format-choice': { label: 'Format choice', exercised: true, scenario: 'set-ready', via: { from: 'idle', control: 'Change format' } },
    markers: { label: 'Markers', exercised: true, scenario: 'recording', via: { from: 'recording', control: 'Add marker' } },
  },
  defaultState: 'idle',
  render(ctx) {
    const build = RENDER[ctx.state] || RENDER.idle;
    return layout(ctx, build(ctx), ctx.state);
  },
});

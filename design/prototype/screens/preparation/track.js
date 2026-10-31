// prep/track — the track preparation editor (Document 19 §3 step 2 "inspect an uncertain grid, edit a cue
// and preserve the correction"; Document 03 §2 "Track preparation"; Document 02 FR-005/006/007/008/009/011/018;
// Document 07 §2 UserPreparation vs AnalysisVersion and the cue media-time basis; Document 06 AE-02).
//
// Not a shell screen: a full-height editor. It edits the PREPARATION STORE for one track in the library, not a
// deck. That is why it does not use the deck-bound components (mdj-deck-summary, mdj-pad-bank, mdj-loop-controls,
// mdj-value-inspector all carry a deck letter and an EngineCommand); its track summary, cue slots, loop list and
// gain trim are built locally (see componentsMissing in the handoff).
//
// Honesty rules carried here:
//   - Every waveform, BPM, key, loudness, confidence and analysis status is a fixture (FIXTURE marks).
//   - User preparation (cues, corrected grid, locks) is printed separately from detected analysis, with a
//     "Detected" or "Yours" tag, and reanalysis never overwrites a locked edit silently.
//   - "Saved · revision N" only appears where the fixture states that revision was acknowledged.
//   - Controls that would write to the store but are not wired in this prototype print "not wired, nothing
//     changed" in the status line instead of pretending to work.
//   - Cues keep a source-time position (m:ss.s on this rendition). Half/double changes the musical
//     interpretation only; it never moves cue audio.
import { register } from '../../app/registry.js';
import { load, fixtures } from '../../app/fixtures.js';
import { h, button, icon, fmt } from '../../components/base.js';

const PREP = await load('preparation');

// ---- derived preparation revisions --------------------------------------------------------------------
// mdj-waveform reads cues, locks and the uncertain region from fixtures.track(id) / fixtures.waveform(id).
// The editor's draft and saved revision 5 of TIDE SIGNAL are registered as in-memory derived track ids so the
// waveform draws the edited cue at its new position. Nothing is written to the shared fixture files.
function derive(baseId, id, patch, wavePatch = {}) {
  if (fixtures.track(id)) return id;
  const base = fixtures.track(baseId);
  const wave = fixtures.waveform(baseId);
  if (!base) return baseId;
  fixtures.trackById.set(id, { ...base, ...patch, id });
  if (wave) fixtures.waveforms[id] = { ...wave, ...wavePatch, trackId: id };
  return id;
}
const D = PREP.tideDraft;
const tideBase = fixtures.track('tide');
const draftCues = (tideBase?.cues || []).map((c) => (c.n === 2 ? { ...c, name: D.cue2.name, sec: D.cue2.sec } : c));
const TIDE_DRAFT = derive('tide', 'tide@draft', { cues: draftCues });
const TIDE_R5 = derive('tide', 'tide@r5', { cues: draftCues, gridLocked: true, gridConfidence: 'low' }, { uncertainAfterSec: null });

// ---- small formatters -----------------------------------------------------------------------------------
const t1 = (sec) => {
  if (sec == null) return '—';
  const m = Math.floor(sec / 60), s = sec - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
};
const COLOR_NAME = { cyan: 'Cyan', green: 'Green', purple: 'Purple', orange: 'Orange', red: 'Red', yellow: 'Yellow', none: 'No colour' };

// ---- per-state model --------------------------------------------------------------------------------------
// Every state names the track, the waveform revision it draws, the cursor, and what each tool may do.
function model(state, ctx) {
  const tide = PREP.tracks.tide, calypso = PREP.tracks.calypso, glass = PREP.tracks.glasswork, longp = PREP.tracks.longtitle;
  const uncertainAt = fixtures.waveform('tide')?.uncertainAfterSec ?? 141;
  const ua = fmt.time(uncertainAt);
  const routeName = ctx.session?.route?.name || 'the current output';
  const base = {
    trackId: 'tide', wave: 'tide', prep: tide, cursor: 141, editMode: false, gridLocked: false,
    gridUnavailable: null, gridLockedReason: null, reanalyze: { enabled: true, note: 'Refreshes detected fields only; your cues are kept.' },
    halfDouble: { enabled: true }, lockLabel: 'Lock grid', cueEditReason: 'Cue changes need edit mode: tap Edit cues. There is no long-press shortcut.',
    loopsReason: null, banner: null, sheet: null, order: ['grid', 'cues', 'loops', 'gain', 'phrases', 'tags'],
    save: { tone: 'ok', icon: 'check', text: `Saved · revision ${tide.savedRevision} · cues bind to this rendition`, undo: { enabled: false, reason: `Nothing to undo since revision ${tide.savedRevision}.` }, primary: { label: 'Save', enabled: false, reason: 'No unsaved changes.' }, extra: null },
    revisionTag: `Rev ${tide.savedRevision} saved`, cueStates: {}, analysisLine: null, gridSource: 'Detected', route: routeName,
  };
  if (state === 'uncertain') {
    return { ...base,
      cueStates: { 2: 'uncertain' },
      banner: { tone: 'warning', icon: 'grid-uncertain', title: `Uncertain grid after ${ua} — tap a downbeat to correct`,
        body: `${tide.analysis.tempoRange}. After the bridge, beats are drawn dashed over a hatched region and nothing there snaps or quantizes. Cue 2 sits in that region, so its beat position is unknown; its time position is kept.` },
    };
  }
  if (state === 'cue-edit') {
    return { ...base, wave: TIDE_DRAFT, cursor: D.downbeatSec, editMode: true, cueStates: { 2: 'edited' }, selectedCue: 2,
      order: ['cues', 'grid', 'loops', 'gain', 'phrases', 'tags'],
      banner: { tone: 'info', icon: 'edit', title: 'Editing cues — draft not saved',
        body: `Cue 2 “${D.cue2.fromName}” → “${D.cue2.name}”, moved ${t1(D.cue2.fromSec)} → ${t1(D.cue2.sec)} onto the downbeat you tapped. Keep correction saves revision ${D.revision} and locks the grid after ${t1(D.downbeatSec)}.`,
        actions: [
          { label: 'Discard draft', icon: 'discard', go: 'uncertain' },
          { label: 'Keep correction', icon: 'check', primary: true, go: 'edited' },
        ] },
      save: { tone: 'warning', icon: 'edit', text: `Unsaved draft · ${D.changes.length} changes · last saved revision ${tide.savedRevision}`, undo: { enabled: true, label: 'Undo step', reason: null }, primary: { label: 'Save', enabled: true, go: 'edited' }, extra: null },
      revisionTag: 'Draft · unsaved',
    };
  }
  if (state === 'edited' || state === 'undo') {
    const m = { ...base, wave: TIDE_R5, cursor: D.downbeatSec, gridLocked: true, cueStates: { 2: 'edited' }, gridSource: 'Yours after 2:19',
      gridLockedReason: 'Grid locked after your correction. Unlock grid to edit it.', lockLabel: 'Unlock grid',
      reanalyze: { enabled: true, note: 'Reanalyze keeps your locked grid and cue edits; it cannot overwrite them.' },
      banner: { tone: 'ok', icon: 'grid-locked', title: `Correction kept · revision ${D.revision} saved`,
        body: `Cue 2 is “${D.cue2.name}” at ${t1(D.cue2.sec)}. The grid after ${t1(D.downbeatSec)} follows your downbeat and is locked, so reanalysis cannot overwrite it. Undo reverts to revision ${tide.savedRevision}.` },
      save: { tone: 'ok', icon: 'check', text: `Saved · revision ${D.revision} · cues bind to this rendition`, undo: { enabled: true, label: 'Undo', go: 'undo' }, primary: { label: 'Save', enabled: false, reason: 'No unsaved changes.' }, extra: null },
      revisionTag: `Rev ${D.revision} saved`,
    };
    if (state === 'undo') {
      m.save = { ...m.save, undo: { enabled: true, label: 'Undo', pressed: true } };
      m.sheet = { variant: 'confirm', icon: 'undo', title: `Undo revision ${D.revision}?`,
        lead: `This reverts the saved preparation to revision ${tide.savedRevision}. Playback and the library are not affected.`,
        list: ['Cue 2 name: Bridge drop → Bridge', `Cue 2 position: ${t1(D.cue2.sec)} → ${t1(D.cue2.fromSec)}`, `Downbeat correction at ${t1(D.downbeatSec)} removed; the grid after the bridge is uncertain again`, 'Grid lock after the bridge removed'],
        foot: `Revision ${D.revision} stays in history, so you can redo it.`,
        actions: [{ id: 'keep', label: `Keep revision ${D.revision}`, go: 'edited' }, { id: 'confirm', label: `Undo to revision ${tide.savedRevision}`, tone: 'danger', go: 'uncertain' }] };
    }
    return m;
  }
  if (state === 'locked' || state === 'half-double') {
    const a = calypso.analysis;
    const m = { ...base, trackId: 'calypso', wave: 'calypso', prep: calypso, cursor: 56.5, gridLocked: true, gridSource: 'Yours (doubled)',
      gridLockedReason: 'Grid locked at 136.0 BPM. Unlock grid to edit it.', lockLabel: 'Unlock grid',
      reanalyze: { enabled: false, reason: `Reanalyze can't overwrite your locked ${a.correctedBpm.toFixed(1)} BPM grid. Unlock grid first; cues keep their positions either way.` },
      order: ['grid', 'cues', 'loops', 'gain', 'phrases', 'tags'],
      banner: { tone: 'ok', icon: 'grid-locked', title: `Grid locked at ${a.correctedBpm.toFixed(1)} BPM (your correction)`,
        body: `Detected ${a.detectedBpm.toFixed(1)} BPM (half-time). You doubled it to ${a.correctedBpm.toFixed(1)} and locked the grid, so reanalysis keeps it. Half / Double reopens the choice.` },
      save: { tone: 'ok', icon: 'check', text: `Saved · revision ${calypso.savedRevision} · cues bind to this rendition`, undo: { enabled: false, reason: 'Undo history starts with your next edit in this session.' }, primary: { label: 'Save', enabled: false, reason: 'No unsaved changes.' }, extra: null },
      revisionTag: `Rev ${calypso.savedRevision} saved`,
    };
    if (state === 'half-double') {
      m.sheet = { variant: 'dialog', icon: 'bpm', title: 'Choose the BPM interpretation',
        lead: 'The detector cannot tell half-time from double-time in this track. The choice changes beat numbering, loop lengths and sync. It never moves cue audio: cues keep their source positions.',
        choices: [
          { bpm: a.detectedBpm, title: `${a.detectedBpm.toFixed(1)} BPM`, tag: 'Detected', note: 'Half-time feel; bars twice as long. Choosing it unlocks the grid.' },
          { bpm: a.correctedBpm, title: `${a.correctedBpm.toFixed(1)} BPM`, tag: 'Yours · current · locked', note: 'Matches the horn hits and the chorus loop (8 bars).', current: true },
        ],
        foot: `Saving a change writes revision ${calypso.savedRevision + 1}.`,
        actions: [{ id: '68', label: `Use ${a.detectedBpm.toFixed(1)} BPM` }, { id: 'keep', label: `Keep ${a.correctedBpm.toFixed(1)} BPM`, primary: true, go: 'locked' }] };
    }
    return m;
  }
  if (state === 'pending-analysis') {
    const a = glass.analysis;
    const why = 'Grid tools need a detected grid. Analysis is queued for this track; Play is available now.';
    return { ...base, trackId: 'glasswork', wave: 'glasswork', prep: glass, cursor: 0, gridUnavailable: why,
      reanalyze: { enabled: false, reason: 'Already queued. Analysis runs outside playback.' }, halfDouble: { enabled: false },
      loopsReason: 'Loop in / out need a grid to size loops in bars. Wait for analysis.',
      order: ['cues', 'grid', 'loops', 'gain', 'phrases', 'tags'],
      banner: { tone: 'info', icon: 'analysis-pending', title: 'Analysis queued — Play is available',
        body: `This track plays now without analysis. BPM, grid, key, waveform and loudness arrive when analysis finishes (${a.queueText}). Cues you set now keep their time positions.`,
        actions: [{ label: 'Preview from start', icon: 'play', inert: 'Preview from start' }] },
      save: { tone: 'neutral', icon: 'info', text: 'No preparation saved yet · cues will bind to this rendition', undo: { enabled: false, reason: 'Nothing to undo yet.' }, primary: { label: 'Save', enabled: false, reason: 'No unsaved changes.' }, extra: null },
      revisionTag: 'Not prepared yet',
    };
  }
  if (state === 'save-failure') {
    const f = PREP.saveFailure;
    return { ...base, wave: TIDE_R5, cursor: D.downbeatSec, gridLocked: true, cueStates: { 2: 'edited' }, gridSource: 'Yours after 2:19 (unsaved)',
      gridLockedReason: 'Grid locked in your unsaved draft. Unlock grid to edit it.', lockLabel: 'Unlock grid',
      banner: { tone: 'critical', icon: 'warning', title: `Save failed — revision ${D.revision} not written`,
        body: `The preparation store reported a write error and did not confirm revision ${D.revision}. ${f.storageFree}. Your edits are kept in memory on this screen: cue 2 renamed and moved, the downbeat correction and the grid lock. Retry, or export them before leaving.`,
        actions: [{ label: 'Export preparation', icon: 'export', inert: `Export to “${f.exportName}”` }] },
      save: { tone: 'critical', icon: 'warning', text: `Not saved · revision ${D.revision} kept in memory · last saved revision ${tide.savedRevision}`, undo: { enabled: true, label: 'Undo step', reason: null }, primary: { label: 'Retry save', enabled: true, inert: 'Retry save' }, extra: null },
      revisionTag: 'Unsaved · in memory',
    };
  }
  if (state === 'longtitle') {
    return { ...base, trackId: 'longtitle', wave: 'longtitle', prep: longp, cursor: 243,
      save: { ...base.save, text: `Saved · revision ${longp.savedRevision} · cues bind to this rendition`, undo: { enabled: false, reason: `Nothing to undo since revision ${longp.savedRevision}.` } },
      revisionTag: `Rev ${longp.savedRevision} saved`,
    };
  }
  return base;
}

// ---- rendering --------------------------------------------------------------------------------------------
register({
  id: 'prep/track',
  family: 'preparation',
  title: 'Track preparation',
  order: 1,
  fr: ['FR-005', 'FR-006', 'FR-007', 'FR-008', 'FR-009', 'FR-011', 'FR-018', 'FR-033', 'FR-034', 'FR-038', 'FR-039'],
  shell: false,
  states: {
    uncertain: { label: 'Uncertain grid after the bridge (TIDE SIGNAL)', exercised: true, scenario: 'set-ready' },
    'cue-edit': { label: 'Cue edit mode — draft correction', exercised: true, scenario: 'set-ready', via: { from: 'uncertain', control: 'Edit cues' } },
    edited: { label: 'Edited — correction kept, grid locked', exercised: true, scenario: 'set-ready', via: { from: 'cue-edit', control: 'Keep correction' } },
    undo: { label: 'Undo confirmation — what reverts', exercised: true, scenario: 'set-ready', via: { from: 'edited', control: 'Undo' } },
    locked: { label: 'Locked grid — 136 BPM correction (CALYPSO WIRE)', exercised: false, scenario: 'set-ready' },
    'half-double': { label: 'Half / double BPM choice (68 or 136)', exercised: true, scenario: 'set-ready', via: { from: 'locked', control: 'Half / Double' } },
    'pending-analysis': { label: 'Analysis pending — playable (GLASSWORK)', exercised: false, scenario: 'set-ready' },
    'save-failure': { label: 'Save failed — edits kept in memory', exercised: false, scenario: 'set-ready' },
    longtitle: { label: 'Long title, complete analysis', exercised: false, scenario: 'set-ready' },
  },
  defaultState: 'uncertain',
  render(ctx) {
    const m = model(ctx.state, ctx);
    const track = fixtures.track(m.trackId);
    const prepTrack = fixtures.track(m.wave) || track;
    const landscape = ctx.orientation === 'landscape';
    const colorClass = `preparation--color-${track.color || 'none'}`;
    const root = h('div', { class: `preparation stage ${colorClass} preparation--${ctx.state}`, dataset: { orientation: ctx.orientation } });

    // live status line: the honest "not wired" feedback for controls the prototype does not implement
    const note = h('p', { class: 'preparation-save__note', role: 'status', 'aria-live': 'polite' });
    const inert = (what) => () => { note.textContent = `${what}: not wired in this prototype — nothing changed.`; };
    const go = (state) => () => ctx.setState(state);

    // tool button: a real 48 dp button; a disabled tool keeps its place and prints why
    const tool = ({ label, name = null, ic = null, fr = [], reason = null, primary = false, onClick = null, pressed = null, cls = '' }) => {
      const b = button({ label, icon: ic, fr, cls: `preparation-tool${primary ? ' btn--primary' : ''}${cls ? ` ${cls}` : ''}`, attrs: { 'aria-label': name || undefined, 'aria-disabled': reason ? 'true' : undefined, 'aria-pressed': pressed == null ? undefined : String(pressed) } });
      b.addEventListener('click', () => { if (reason) { note.textContent = reason; return; } (onClick || inert(name || label))(); });
      return b;
    };
    const why = (text) => (text ? h('p', { class: 'preparation-why' }, [icon('info', { size: 14 }), h('span', { text })]) : null);

    // ---- top bar ----
    const top = h('header', { class: 'preparation-top' }, [
      button({ label: 'Library', icon: 'chevron-left', cls: 'btn--ghost preparation-back', fr: ['FR-033'], on: { click: () => ctx.navigate('launch/library') } }),
      h('div', { class: 'preparation-top__title' }, [
        m.editMode
          ? h('span', { class: 'preparation-editbadge', role: 'status' }, [icon('edit', { size: 14 }), h('span', { text: 'EDITING CUES' })])
          : h('span', { class: 'label', text: 'Prepare track' }),
        h('span', { class: 'preparation-top__track title truncate', 'aria-hidden': 'true', text: track.title }),
      ]),
      tool({ label: 'Preview', name: `Preview from cursor on ${m.route}`, ic: 'play', fr: ['FR-033'], cls: 'preparation-preview' }),
    ]);

    // ---- track summary (deck-less: this edits the preparation store, not a deck) ----
    const a = m.prep.analysis;
    const pending = a.status !== 'complete';
    const bpmText = pending ? '—' : fmt.bpm(m.trackId === 'calypso' ? a.correctedBpm : track.bpm);
    const userGrid = m.trackId === 'tide' && m.gridLocked;
    const conf = userGrid ? 'tone-ok' : { low: 'tone-warning', medium: 'tone-info', high: 'tone-ok', unknown: 'tone-neutral' }[a.confidence] || 'tone-neutral';
    const readout = (lbl, val, sub) => h('span', { class: 'preparation-readout ink-backing' }, [
      h('span', { class: 'label', text: lbl }), h('span', { class: 'preparation-readout__val numeral', text: val }), sub ? h('span', { class: 'preparation-readout__sub', text: sub }) : null,
    ]);
    const summary = h('section', { class: 'preparation-summary raised', 'aria-label': `Track: ${track.title} by ${track.artist}` }, [
      h('div', { class: 'preparation-summary__id' }, [
        h('span', { class: 'preparation-swatch', 'aria-hidden': 'true' }),
        h('div', { class: 'preparation-summary__names' }, [
          h('h1', { class: 'preparation-summary__title title wrap-2', text: track.title }),
          h('p', { class: 'preparation-summary__artist truncate', text: `${track.artist} · ${m.prep.rendition}` }),
        ]),
      ]),
      h('div', { class: 'preparation-readouts' }, [
        readout('BPM', bpmText, pending ? 'pending' : m.trackId === 'calypso' ? `yours · det. ${a.detectedBpm.toFixed(0)}` : m.trackId === 'tide' ? '120.4–123.6' : 'detected'),
        readout('Key', pending ? '—' : track.key, pending ? 'pending' : 'detected'),
        readout('Length', fmt.time(track.durationSec), 'file'),
        readout('LUFS', track.loudnessLufs == null ? '—' : `${track.loudnessLufs.toFixed(1)}`, track.loudnessLufs == null ? 'pending' : 'detected'),
      ]),
      h('div', { class: `preparation-analysis ${conf}` }, [
        icon(pending ? 'analysis-pending' : userGrid ? 'grid-locked' : a.confidence === 'low' ? 'grid-uncertain' : m.gridLocked ? 'grid-locked' : 'check', { size: 14 }),
        h('span', { class: 'preparation-analysis__text' }, [
          h('strong', { text: pending ? 'Analysis queued' : userGrid ? `Your grid after ${t1(D.downbeatSec)}${ctx.state === 'save-failure' ? ' (unsaved)' : ''} · locked` : `Grid confidence ${a.confidence}` }),
          pending ? ` · ${a.queueText} · will detect ${a.method} · grid confidence unknown`
            : `${userGrid ? ' · detected confidence was low there' : ` · ${a.confidenceText}`} · ${a.method} · ${a.version}`,
        ]),
        h('mdj-fixture-mark', { for: 'analysis status' }),
      ]),
    ]);

    // ---- state banner ----
    let banner = null;
    if (m.banner) {
      const acts = (m.banner.actions || []).map((x) => tool({ label: x.label, ic: x.icon, primary: x.primary, fr: ['FR-008'], onClick: x.go ? go(x.go) : inert(x.inert || x.label) }));
      banner = h('section', { class: `preparation-banner tone-${m.banner.tone}`, role: m.banner.tone === 'critical' || m.banner.tone === 'warning' ? 'alert' : 'status' }, [
        h('div', { class: 'preparation-banner__text' }, [
          h('p', { class: 'preparation-banner__title' }, [icon(m.banner.icon, { size: 16 }), h('span', { text: m.banner.title })]),
          h('p', { class: 'preparation-banner__body', text: m.banner.body }),
        ]),
        acts.length ? h('div', { class: 'preparation-banner__actions' }, acts) : null,
      ]);
    }

    // ---- waveforms ----
    const overview = h('mdj-waveform', { track: m.wave, mode: 'overview', position: m.cursor, height: 48, markers: 'cues loops phrases', 'no-head': true, fixture: `wave:${m.trackId}` });
    const detailed = h('mdj-waveform', { track: m.wave, mode: 'detailed', position: m.cursor, zoom: 8, height: landscape ? 60 : 80, markers: 'cues loops phrases grid', fixture: `wave:${m.trackId}` });
    const zoom = h('mdj-zoom-controls', { zoom: 8, min: 1, max: 64, fit: 16 });
    const cursorText = h('span', { class: 'preparation-cursor__val numeral' });
    const beatInfo = (sec) => {
      if (pending) return 'no grid yet';
      const w = fixtures.waveform(m.wave);
      if (m.editMode && m.trackId === 'tide' && Math.abs(sec - D.downbeatSec) < 0.05) return 'your tapped downbeat (draft)';
      if (w?.uncertainAfterSec != null && sec >= w.uncertainAfterSec) return 'beat position uncertain';
      if (m.trackId === 'tide' && m.gridLocked && sec >= D.downbeatSec - 0.05) return 'on your downbeat grid';
      return m.gridLocked ? 'on your locked grid' : 'on detected grid';
    };
    const setCursor = (sec) => {
      m.cursor = sec;
      overview.setAttribute('position', String(sec)); detailed.setAttribute('position', String(sec));
      cursorText.textContent = `${t1(sec)} · ${beatInfo(sec)}`;
    };
    cursorText.textContent = `${t1(m.cursor)} · ${beatInfo(m.cursor)}`;
    const waves = h('section', { class: 'preparation-waves', 'aria-label': 'Waveforms' }, [
      h('div', { class: 'preparation-wave preparation-wave--overview' }, [overview]),
      h('div', { class: 'preparation-wave preparation-wave--detailed' }, [detailed]),
      h('div', { class: 'preparation-wavebar' }, [
        h('p', { class: 'preparation-cursor ink-backing' }, [h('span', { class: 'label', text: 'Cursor' }), cursorText]),
        zoom,
      ]),
    ]);
    root.addEventListener('mdj:seek', (e) => { if (Number.isFinite(e.detail?.sec)) setCursor(e.detail.sec); });
    root.addEventListener('mdj:zoom', (e) => {
      if (e.target.tagName === 'MDJ-ZOOM-CONTROLS' && Number.isFinite(e.detail?.bars)) { detailed.setAttribute('zoom', String(e.detail.bars)); zoom.setAttribute('zoom', String(e.detail.bars)); }
      else if (e.detail?.phase === 'end' && Number.isFinite(e.detail?.bars)) zoom.setAttribute('zoom', String(e.detail.bars));
    });

    // ---- sections ----
    const sectionHead = (title, extra = {}) => h('mdj-section-header', { title, level: 3, ...extra });
    const sections = {};

    // Grid
    const gReason = m.gridUnavailable || m.gridLockedReason;
    const tapPrimary = ctx.state === 'uncertain';
    sections.grid = h('section', { class: 'preparation-section preparation-section--grid', 'aria-label': 'Beatgrid' }, [
      sectionHead('Beatgrid', { note: `${m.gridSource === 'Detected' ? 'Detected grid' : `Grid: ${m.gridSource}`}${m.gridLocked ? ' · locked' : ' · unlocked'}` }),
      h('div', { class: 'preparation-tools' }, [
        tool({ label: 'Tap downbeat', ic: 'marker', fr: ['FR-008'], primary: tapPrimary, reason: gReason }),
        tool({ label: 'Nudge −', name: 'Nudge grid earlier', ic: 'chevron-left', fr: ['FR-008'], reason: gReason }),
        tool({ label: 'Nudge +', name: 'Nudge grid later', ic: 'chevron-right', fr: ['FR-008'], reason: gReason }),
        tool({ label: 'Local tempo', ic: 'tempo-bend', fr: ['FR-007', 'FR-008'], reason: gReason }),
        tool({ label: 'Half / Double', ic: 'bpm', fr: ['FR-008'], reason: m.halfDouble.enabled ? null : m.gridUnavailable, onClick: m.trackId === 'calypso' ? go('half-double') : null }),
        tool({ label: m.lockLabel, ic: m.gridLocked ? 'unlock' : 'lock', fr: ['FR-008'], reason: m.gridUnavailable, pressed: m.gridLocked }),
        tool({ label: 'Reanalyze', ic: 'refresh', fr: ['FR-006', 'FR-008'], reason: m.reanalyze.enabled ? null : m.reanalyze.reason }),
      ]),
      why(m.gridUnavailable || (m.gridLockedReason ? `${m.gridLockedReason} ${m.reanalyze.enabled ? m.reanalyze.note : m.reanalyze.reason}` : m.reanalyze.note)),
    ]);

    // Cues: eight slots (FR-011). Edit mode is explicit; outside it Set / Rename / Colour / Delete say why.
    const cues = (prepTrack.cues || []).slice().sort((x, y) => x.n - y.n);
    const sel = m.selectedCue ? cues.find((c) => c.n === m.selectedCue) : null;
    const nextFree = [1, 2, 3, 4, 5, 6, 7, 8].find((n) => !cues.some((c) => c.n === n));
    const cueRows = h('ol', { class: 'preparation-cues', 'aria-label': 'Hot cues, 8 slots' });
    for (const c of cues) {
      const st = m.cueStates[c.n] || 'active';
      const draftMoved = m.editMode && c.n === D.cue2.n && m.trackId === 'tide';
      const unc = st === 'uncertain';
      const rowBody = [
        h('mdj-marker', { kind: 'cue', n: c.n, color: c.color, label: c.name, state: st, size: 22 }),
        h('span', { class: 'preparation-cue__name' }, [h('span', { class: 'title truncate', text: c.name }), h('span', { class: 'preparation-cue__meta', text: `${COLOR_NAME[c.color] || 'No colour'} · ${st === 'edited' ? 'edited by you' : unc ? 'beat position uncertain' : 'set by you'}` })]),
        h('span', { class: 'preparation-cue__time numeral' }, [h('span', { text: t1(c.sec) }), draftMoved ? h('span', { class: 'preparation-cue__was', text: `was ${t1(D.cue2.fromSec)}` }) : null]),
      ];
      if (m.editMode) {
        cueRows.appendChild(h('li', { class: 'preparation-cue preparation-cue--edit' }, [
          h('button', { type: 'button', class: 'preparation-cue__select', dataset: { hit: '48', fr: 'FR-011' }, 'aria-pressed': String(sel?.n === c.n), 'aria-label': `Select cue ${c.n}, ${c.name}, ${t1(c.sec)}`, on: { click: inert(`Select cue ${c.n}`) } }, rowBody),
        ]));
      } else {
        cueRows.appendChild(h('li', { class: 'preparation-cue' }, rowBody));
      }
    }
    const empties = 8 - cues.length;
    if (empties > 0) cueRows.appendChild(h('li', { class: 'preparation-cue preparation-cue--empty' }, [h('span', { class: 'muted', text: `${empties} empty ${empties === 1 ? 'slot' : 'slots'} (cue ${nextFree}${empties > 1 ? '–8' : ''})` })]));
    const cueReason = m.editMode ? null : m.cueEditReason;
    const selName = sel ? `cue ${sel.n}` : 'cue';
    sections.cues = h('section', { class: `preparation-section preparation-section--cues${m.editMode ? ' preparation-section--editing' : ''}`, 'aria-label': 'Hot cues' }, [
      sectionHead('Hot cues', { count: cues.length, action: m.editMode ? null : 'Edit cues', 'action-icon': m.editMode ? null : 'edit', note: m.editMode ? 'Edit mode: set, rename, recolour and delete are on. Nothing is saved until you keep the correction.' : 'Cue times are source positions on this rendition.' }),
      cueRows,
      h('div', { class: 'preparation-tools' }, [
        tool({ label: `Set cue ${nextFree ?? ''}`.trim(), name: `Set cue ${nextFree} at cursor`, ic: 'plus', fr: ['FR-011'], reason: cueReason }),
        tool({ label: 'Name / colour', name: `Rename or recolour ${selName}`, ic: 'color-tag', fr: ['FR-011'], reason: cueReason }),
        tool({ label: 'Move to cursor', name: `Move ${selName} to cursor`, ic: 'seek', fr: ['FR-011'], reason: cueReason }),
        tool({ label: 'Delete', name: `Delete ${selName}`, ic: 'trash', fr: ['FR-011'], reason: cueReason, cls: m.editMode ? 'btn--danger' : '' }),
      ]),
      why(cueReason),
    ]);
    sections.cues.addEventListener('mdj:section-action', () => ctx.setState('cue-edit'));

    // Loops (FR-018): saved loops are preparation; In / Out set them at the cursor.
    const loops = prepTrack.loops || [];
    sections.loops = h('section', { class: 'preparation-section', 'aria-label': 'Saved loops' }, [
      sectionHead('Saved loops', { count: loops.length }),
      loops.length ? h('ul', { class: 'preparation-list' }, loops.map((l) => h('li', { class: 'preparation-list__row' }, [
        h('mdj-marker', { kind: 'loop', n: 1, label: l.name, size: 20 }),
        h('span', { class: 'title', text: l.name }),
        h('span', { class: 'numeral', text: `${t1(l.inSec)} · ${l.bars} bars` }),
      ]))) : h('p', { class: 'preparation-empty muted', text: 'No saved loops yet.' }),
      h('div', { class: 'preparation-tools' }, [
        tool({ label: 'Loop in', name: 'Loop in at cursor', ic: 'loop-in', fr: ['FR-018'], reason: m.loopsReason }),
        tool({ label: 'Loop out', name: 'Loop out at cursor', ic: 'loop-out', fr: ['FR-018'], reason: m.loopsReason }),
      ]),
      why(m.loopsReason),
    ]);

    // Gain trim: numeral with − / + and Reset to the loudness suggestion (fixture value).
    const gainVal = track.gainDb;
    sections.gain = h('section', { class: 'preparation-section', 'aria-label': 'Gain trim' }, [
      sectionHead('Gain trim'),
      h('div', { class: 'preparation-gain' }, [
        h('span', { class: 'preparation-gain__val ink-backing' }, [
          h('span', { class: 'numeral', text: gainVal == null ? '0.0 dB' : fmt.db(gainVal) }),
          h('span', { class: 'preparation-readout__sub', text: gainVal == null ? 'manual · no loudness yet' : 'suggested from loudness' }),
          h('mdj-fixture-mark', { for: 'gain suggestion' }),
        ]),
        tool({ label: '−0.5', name: 'Gain trim down 0.5 dB', fr: ['FR-006'] }),
        tool({ label: '+0.5', name: 'Gain trim up 0.5 dB', fr: ['FR-006'] }),
        tool({ label: 'Reset', name: 'Reset gain trim to the loudness suggestion', ic: 'undo', fr: ['FR-006'], reason: gainVal == null ? 'No loudness suggestion until analysis finishes.' : null }),
      ]),
    ]);

    // Phrase markers (detected hints, FR-007)
    const phrases = prepTrack.phrases || [];
    sections.phrases = h('section', { class: 'preparation-section', 'aria-label': 'Phrase markers' }, [
      sectionHead('Phrase markers', { count: phrases.length }),
      phrases.length ? h('ul', { class: 'preparation-list' }, phrases.map((p) => h('li', { class: 'preparation-list__row' }, [
        h('mdj-marker', { kind: 'phrase', label: p.label, size: 20 }),
        h('span', { class: 'title', text: p.label }),
        h('span', { class: 'numeral', text: `${t1(p.sec)} · detected` }),
      ]))) : h('p', { class: 'preparation-empty muted', text: pending ? 'Phrase hints arrive with analysis.' : 'No phrase markers.' }),
      h('div', { class: 'preparation-tools' }, [tool({ label: 'Add phrase', name: 'Add phrase marker at cursor', ic: 'phrase', fr: ['FR-007'] })]),
    ]);

    // Tags, comment, rating, colour (FR-005)
    const stars = Math.max(0, Math.min(5, track.rating || 0));
    sections.tags = h('section', { class: 'preparation-section', 'aria-label': 'Tags, comment, rating and colour' }, [
      sectionHead('Tags and notes'),
      h('div', { class: 'preparation-chips' }, [
        ...(track.tags || []).map((t) => h('mdj-chip', { kind: 'status', label: t, icon: 'color-tag', size: 'sm' })),
        track.explicit ? h('mdj-chip', { kind: 'status', label: 'Explicit', tone: 'warning', icon: 'explicit', size: 'sm' }) : null,
      ]),
      h('dl', { class: 'preparation-meta' }, [
        h('dt', { class: 'label', text: 'Rating' }), h('dd', { 'aria-label': `${stars} of 5 stars` }, [h('span', { class: 'preparation-stars', 'aria-hidden': 'true', text: '★'.repeat(stars) + '☆'.repeat(5 - stars) }), h('span', { class: 'numeral', text: ` ${stars}/5` })]),
        h('dt', { class: 'label', text: 'Colour' }), h('dd', {}, [h('span', { class: 'preparation-swatch preparation-swatch--sm', 'aria-hidden': 'true' }), h('span', { text: ` ${m.prep.colorName}` })]),
        h('dt', { class: 'label', text: 'Comment' }), h('dd', { class: 'preparation-comment', text: m.prep.comment || 'No comment.' }),
      ]),
      h('div', { class: 'preparation-tools' }, [
        tool({ label: 'Edit tags', ic: 'edit', fr: ['FR-005'] }),
        tool({ label: 'Rating', name: 'Change rating', ic: 'rating', fr: ['FR-005'] }),
        tool({ label: 'Colour', name: 'Change track colour', ic: 'color-tag', fr: ['FR-005'] }),
      ]),
    ]);

    // ---- save strip ----
    const s = m.save;
    const undoBtn = tool({ label: s.undo.label || 'Undo', ic: 'undo', fr: ['FR-008', 'FR-034'], reason: s.undo.enabled ? null : s.undo.reason, pressed: s.undo.pressed ? true : null, onClick: s.undo.go ? go(s.undo.go) : null });
    const saveBtn = tool({ label: s.primary.label, ic: s.primary.label === 'Retry save' ? 'retry' : 'save', fr: ['FR-034'], primary: s.primary.enabled, reason: s.primary.enabled ? null : s.primary.reason, onClick: s.primary.go ? go(s.primary.go) : s.primary.inert ? inert(s.primary.inert) : null });
    const saveText = h('div', { class: `preparation-save__text preparation-save--${s.tone}` }, [
      h('p', { class: `preparation-save__status tone-${s.tone}` }, [icon(s.icon, { size: 14 }), h('span', { text: s.text })]),
      note,
    ]);
    const saveActions = h('div', { class: 'preparation-save__actions' }, [undoBtn, saveBtn]);

    // ---- sheet (undo confirmation / half-double choice) ----
    let sheet = null;
    if (m.sheet) {
      const sh = m.sheet;
      const body = [h('p', { text: sh.lead })];
      if (sh.list) body.push(h('ul', { class: 'preparation-sheet__list' }, sh.list.map((x) => h('li', { text: x }))));
      if (sh.choices) body.push(h('div', { class: 'preparation-choices' }, sh.choices.map((c) => h('div', { class: `preparation-choice ink-backing${c.current ? ' preparation-choice--current' : ''}` }, [
        h('span', { class: 'preparation-choice__bpm numeral', text: c.title }),
        h('span', { class: 'label', text: c.tag }),
        h('span', { class: 'preparation-choice__note', text: c.note }),
      ]))));
      if (sh.foot) body.push(h('p', { class: 'muted', text: sh.foot }));
      sheet = h('mdj-sheet', { title: sh.title, variant: sh.variant, icon: sh.icon, actions: JSON.stringify(sh.actions.map(({ id, label, tone, primary }) => ({ id, label, tone, primary }))), class: 'preparation-sheet' }, body);
      sheet.addEventListener('mdj:sheet-action', (e) => {
        const a = sh.actions.find((x) => x.id === e.detail.id);
        if (a?.go) ctx.setState(a.go); else note.textContent = `${a?.label || 'Action'}: not wired in this prototype — nothing changed.`;
      });
      sheet.addEventListener('mdj:sheet-dismiss', () => ctx.setState(m.trackId === 'calypso' ? 'locked' : 'edited'));
    }

    // ---- composition ----
    const ordered = m.order.map((k) => sections[k]);
    if (landscape) {
      const left = ordered.filter((_, i) => i % 2 === 0), right = ordered.filter((_, i) => i % 2 === 1);
      // Landscape keeps the height for the waveforms and the two tool columns: Undo / Save join the top bar
      // and the saved-revision indicator sits under the zoom controls beside the waveforms.
      top.insertBefore(saveActions, top.querySelector('.preparation-preview'));
      waves.querySelector('.preparation-wavebar').appendChild(saveText);
      root.append(
        top, waves,
        h('div', { class: 'preparation-body' }, [
          h('div', { class: 'preparation-col' }, [banner, ...left].filter(Boolean)),
          h('div', { class: 'preparation-col' }, [...right, summary]),
        ]),
      );
    } else {
      root.append(top, summary, waves, h('div', { class: 'preparation-body' }, [banner, ...ordered].filter(Boolean)),
        h('footer', { class: 'preparation-save' }, [saveText, saveActions]));
    }
    if (sheet) {
      // A modal choice: the editor behind it is inert and hidden (its controls are not reachable while the
      // dialog is open); the top bar stays visible so the track and the revision remain in view.
      root.classList.add('preparation--modal');
      for (const el of root.querySelectorAll(':scope > .preparation-summary, :scope > .preparation-waves, :scope > .preparation-body')) { el.inert = true; el.setAttribute('aria-hidden', 'true'); }
      root.appendChild(h('div', { class: 'preparation-sheet-layer' }, [sheet]));
    }
    return root;
  },
});

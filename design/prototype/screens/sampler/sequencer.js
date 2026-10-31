// sampler/sequencer — the step-pattern view (Document 03 §7 "Sequencer": explicit sample assignment,
// per-step velocity/mute, length, resolution and swing; a visible pattern revision and next-bar activation
// marker; Start, quantized stop, immediate stop and pattern change are different labelled actions; pattern
// editing does not steal touch focus from the active deck; the stopped/offline editor works without ParDay.
// Document 06 AE-06; FR-027). Shell screen, dock on in both orientations, so deck Play / Cue, crossfader,
// route and master stay reachable while a pattern is edited.
//
// Composition: a status lead (brass index bar) that says what is sounding and what is queued, the
// <mdj-step-grid> (transport actions moved to the top of the grid by this screen's CSS so Stop now is never
// below the fold; lanes, edit tool, length / resolution / swing), the pattern bank (A1–B4), a readout panel
// (length, resolution, swing, clock leader, sounding vs queued revision) and the takeover note.
// Portrait: one column, four lanes, beat page tabs as the non-scroll path. Landscape: all sixteen steps
// fit; two lanes per view with a Lanes 1–2 / Lanes 3–4 switch (four lanes would be ~390 dp tall), the
// pattern bank and readouts in a side strip above the dock.
//
// Honesty: no engine and no clock exist. The current step / bar is a FIXTURE (the grid's own mark) and it
// does not move — it is the snapshot of one moment. Start / Stop / Pattern change move to the acknowledged
// fixture state the screen stands in for; "Stops at bar end" stays pending (the engine has not reached the
// bar). A step edit during playback is queued as the next revision and keeps its dashed Q mark; the sounding
// pattern is still the old revision.
//
// States (scenario a-playing: Deck A audible and the tempo leader)
//   stopped                   Pattern A1 rev 6, stopped
//   playing-sounding          A1 rev 6 sounding · bar 1 step 6 (fixture)
//   queued-next-bar-revision  a step edited while sounding → rev 7 queued for bar 2; rev 6 still sounding
//   editing                   stopped editor: velocity tool, lane sample assignment; applies immediately
//   stop-quantized-pending    Stop at bar sent → "Stops at bar end"; still sounding until then
//   stop-immediate            Stop now acknowledged: voices cut at once, pattern and revision kept
//   pattern-change            B1 "Lift" queued for the next bar while A1 sounds
import { register } from '../../app/registry.js';
import { load } from '../../app/fixtures.js';
import { h, button, icon, fmt } from '../../components/base.js';

const data = await load('sampler'); // fixtures/sampler.json
const SEQ = data.sequencer;
const FR = ['FR-027'];
const PATTERN = 'A1';
const SOUNDING_REV = 6;

let pendingEdit = null; // the step tapped on playing-sounding, carried into queued-next-bar-revision

const STATES = {
  stopped: { label: 'Stopped — pattern A1 rev 6', exercised: true, scenario: 'a-playing', via: { from: 'stop-immediate', control: 'Back to stopped pattern' } },
  'playing-sounding': { label: 'Sounding — rev 6, current step is a fixture', exercised: true, scenario: 'a-playing', via: { from: 'stopped', control: `Start, pattern ${PATTERN}` } },
  'queued-next-bar-revision': { label: 'Edit queued as rev 7 for the next bar; rev 6 sounding', exercised: true, scenario: 'a-playing', via: { from: 'playing-sounding', control: 'Clap, step 8, off' } },
  editing: { label: 'Stopped editor — usable offline, no ParDay', exercised: true, scenario: 'a-playing', via: { from: 'stopped', control: 'Edit pattern' } },
  'stop-quantized-pending': { label: 'Stop at bar sent — stops at bar end', exercised: true, scenario: 'a-playing', via: { from: 'playing-sounding', control: `Stop at bar, pattern ${PATTERN}` } },
  'stop-immediate': { label: 'Stop now — voices cut immediately', exercised: true, scenario: 'a-playing', via: { from: 'playing-sounding', control: `Stop now, pattern ${PATTERN}` } },
  'pattern-change': { label: 'Pattern change — B1 queued for the next bar', exercised: true, scenario: 'a-playing', via: { from: 'playing-sounding', control: 'Queue pattern B1 Lift for the next bar' } },
};

// Grid attributes per state (sounding position is a fixture snapshot).
const SETUP = {
  stopped: { grid: 'stopped' },
  'playing-sounding': { grid: 'playing', current: 6, bar: 1 },
  'queued-next-bar-revision': { grid: 'queued-revision', current: 11, bar: 1, queued: true },
  editing: { grid: 'editing', tool: 'velocity' },
  'stop-quantized-pending': { grid: 'playing', current: 14, bar: 2 },
  'stop-immediate': { grid: 'stopped', stoppedAt: 'bar 1, step 7' },
  'pattern-change': { grid: 'playing', current: 9, bar: 2, nextPattern: 'B1' },
};

register({
  id: 'sampler/sequencer',
  family: 'sampler',
  title: 'Sequencer — step patterns',
  order: 2,
  fr: FR,
  shell: true,
  // Landscape: four 48 dp lanes are ~390 dp tall, so landscape shows two lanes per view and hides the dock
  // (the content area is then ~320 dp, enough for header, transport, ruler and two lanes without a
  // vertical scroller around the grid). The status strip (route, REC, ParDay) stays.
  dock: { portrait: true, landscape: false },
  states: STATES,
  defaultState: 'stopped',
  render(ctx) {
    const root = h('div', { class: `sampler-seq sampler-seq--${ctx.state} sampler-seq--${ctx.orientation}`, dataset: { state: ctx.state } });
    mount(ctx, root);
    return root;
  },
});

function mount(ctx, root) {
  const state = ctx.state;
  const setup = SETUP[state] || SETUP.stopped;
  const landscape = ctx.orientation === 'landscape';
  const sounding = setup.grid === 'playing' || setup.grid === 'queued-revision';
  const leader = ctx.session.decks.A;
  const bpm = leader?.track?.analysis === 'complete' ? fmt.bpm(leader.track.bpm) : null;

  // ---- pattern data (local copy; edits stay in this view) ----
  const lanes = SEQ.lanes.map((l) => ({ ...l, cells: l.cells.slice(), muted: (l.muted || []).slice(), mute: !!l.mute }));
  const view = { revision: SOUNDING_REV, queued: 0, queuedCells: new Set(), page: 1, pair: 0, bars: 2, resolution: '1/16', swing: 54, nextPattern: setup.nextPattern || null };
  if (setup.queued) {
    const edit = pendingEdit || { lane: 1, step: 7, tool: 'steps' };
    pendingEdit = null;
    applyTool(lanes[edit.lane], edit.step, edit.tool);
    view.queued = SOUNDING_REV + 1;
    view.queuedCells.add(`${edit.lane}:${edit.step}`);
    view.page = Math.floor(edit.step / 4) + 1;
    view.pair = edit.lane >= 2 ? 1 : 0;
  }

  const live = h('p', { class: 'sampler-note body', role: 'status', 'aria-live': 'polite' });
  const say = (text) => { live.textContent = text; live.hidden = !text; };
  say('');

  // ---------------------------------------------------------------- lead
  const editedLane = [...view.queuedCells][0];
  const queuedWord = editedLane ? (() => { const [l, s] = editedLane.split(':').map(Number); return `${lanes[l].name} step ${s + 1}`; })() : '';
  const copy = {
    stopped: { eyebrow: 'Stopped', shape: 'ring', title: `Pattern ${PATTERN} “Groove” · rev ${SOUNDING_REV} · stopped.`, body: 'Start begins on the next bar of the master clock. Stopped, every edit applies immediately and works offline without ParDay.' },
    'playing-sounding': { eyebrow: 'Sounding · rev 6', shape: 'full', title: `${PATTERN} rev ${SOUNDING_REV} sounding — bar 1, step 6.`, body: 'Position is a fixture snapshot, not a running clock. Edits you make now are queued as rev 7 and start at the next bar.' },
    'queued-next-bar-revision': { eyebrow: 'Queued · rev 7 at next bar', shape: 'half', title: `Rev 7 queued for bar 2 — rev 6 is still sounding.`, body: `Your edit (${queuedWord}) is not heard yet: it carries a dashed Q mark until the engine switches revisions at the bar line. Discard queued drops it before then.` },
    editing: { eyebrow: 'Editing · stopped', shape: 'dotted', title: 'Stopped editor — edits apply immediately.', body: 'Velocity tool selected: each tap cycles a step 1 → 2 → 3. Choose each lane’s sample below. Works offline; ParDay is not needed and does not edit patterns.' },
    'stop-quantized-pending': { eyebrow: 'Stop at bar · sent', shape: 'half', title: 'Stops at bar end — still sounding until then.', body: 'Stop at bar was sent and admitted; the pattern stops on the bar line after bar 2, step 16. Stop now still cuts it immediately.' },
    'stop-immediate': { eyebrow: 'Stopped now', shape: 'cross', title: 'Stopped immediately at bar 1, step 7.', body: 'Stop now is not quantized: sequencer voices were cut at once (acknowledged fixture). Pattern A1 and rev 6 are kept; Deck A kept playing.' },
    'pattern-change': { eyebrow: 'Pattern change · B1 queued', shape: 'half', title: 'B1 “Lift” queued — switches at the next bar.', body: `${PATTERN} keeps sounding until the bar line; then B1 starts from its step 1. Tap ${PATTERN} to cancel the change.` },
  }[state];
  const lead = h('section', { class: `sampler-lead raised sampler-lead--${state}`, 'aria-labelledby': 'sampler-seq-lead' }, [
    h('p', { class: 'sampler-eyebrow label' }, [h('span', { class: `sampler-shape sampler-shape--${copy.shape}`, 'aria-hidden': 'true' }), h('span', { text: copy.eyebrow })]),
    h('h2', { id: 'sampler-seq-lead', class: 'sampler-lead__title title', text: copy.title }),
    landscape ? h('p', { class: 'sampler-lead__body body', text: copy.body }) : null,
    leadActions(),
  ]);
  // Portrait: the explanation follows the grid so the lanes are reached sooner.
  const explain = landscape ? null : h('p', { class: 'sampler-explain body', text: copy.body });
  function leadActions() {
    const acts = [];
    if (state === 'stopped' || state === 'stop-immediate') acts.push(button({ label: 'Edit pattern', icon: 'edit', cls: 'btn--secondary', fr: FR, on: { click: () => ctx.setState('editing') } }));
    if (state === 'editing') acts.push(button({ label: 'Done editing', icon: 'check', cls: 'btn--secondary', fr: FR, on: { click: () => ctx.setState('stopped') } }));
    if (state === 'stop-immediate') acts.push(button({ label: 'Back to stopped pattern', icon: 'pattern', cls: 'btn--ghost', fr: FR, on: { click: () => ctx.setState('stopped') } }));
    if (state === 'stop-quantized-pending') acts.push(button({ label: 'Keep playing — cancel stop', icon: 'play', cls: 'btn--secondary', fr: FR, on: { click: () => ctx.setState('playing-sounding') } }));
    return acts.length ? h('div', { class: 'sampler-actions' }, acts) : null;
  }

  // ---------------------------------------------------------------- grid
  const rows = landscape ? 2 : 4;
  const grid = h('mdj-step-grid', { rows: String(rows), steps: '16', pattern: PATTERN });
  const pairTabs = landscape ? h('div', { class: 'sampler-pairs', role: 'tablist', 'aria-label': 'Lanes shown' }) : null;
  function paintGrid() {
    const off = landscape ? view.pair * 2 : 0;
    const shown = lanes.slice(off, off + rows);
    const qc = [...view.queuedCells].map((k) => k.split(':').map(Number)).filter(([l]) => l >= off && l < off + rows).map(([l, s]) => `${l - off}:${s}`).join(',');
    const gridState = setup.grid === 'playing' && view.queued ? 'queued-revision' : setup.grid;
    const attrs = {
      state: gridState, bars: String(view.bars), resolution: view.resolution, swing: String(view.swing), revision: String(view.revision), page: String(view.page),
      lanes: JSON.stringify(shown), tool: grid.getAttribute('tool') || setup.tool || 'steps',
    };
    if (sounding || setup.grid === 'playing') { attrs.current = String(setup.current); attrs.bar = String(setup.bar); }
    if (view.queued) { attrs.queued = String(view.queued); attrs['queued-cells'] = qc; } else { grid.removeAttribute('queued'); grid.removeAttribute('queued-cells'); }
    for (const [k, v] of Object.entries(attrs)) grid.setAttribute(k, v);
    if (pairTabs) pairTabs.replaceChildren(...[0, 1].map((p) => h('button', {
      type: 'button', role: 'tab', class: 'sampler-pairs__tab', 'aria-selected': String(view.pair === p), dataset: { hit: '48', fr: 'FR-027' },
      'aria-label': `Lanes ${p * 2 + 1} to ${p * 2 + 2}, ${lanes[p * 2].name} and ${lanes[p * 2 + 1].name}`,
      on: { click: () => { view.pair = p; paintGrid(); } },
    }, [h('span', { class: 'numeral', text: `${p * 2 + 1}–${p * 2 + 2}` }), h('span', { class: 'label', text: `${lanes[p * 2].name} · ${lanes[p * 2 + 1].name}` })])));
    paintReadouts();
  }

  // ---------------------------------------------------------------- pattern bank
  const bank = h('section', { class: 'sampler-patterns raised', 'aria-labelledby': 'sampler-patterns-title' });
  function paintBank() {
    bank.replaceChildren(
      h('h3', { id: 'sampler-patterns-title', class: 'label sampler-panel__title', text: sounding ? 'Pattern bank · changes wait for the next bar' : 'Pattern bank' }),
      h('div', { class: 'sampler-patterns__grid', role: 'group', 'aria-label': 'Patterns' }, SEQ.patterns.map((p) => {
        const current = p.id === PATTERN;
        const next = view.nextPattern === p.id;
        const empty = !p.bars;
        const word = current ? (sounding ? 'Sounding' : 'Current') : next ? 'Queued · next bar' : empty ? 'Empty' : `${p.bars} ${p.bars === 1 ? 'bar' : 'bars'}`;
        const name = current
          ? (view.nextPattern ? `Keep pattern ${p.id}${p.name ? ` ${p.name}` : ''}, cancel the queued change` : `Pattern ${p.id}${p.name ? ` ${p.name}` : ''}, ${sounding ? 'sounding' : 'current'}`)
          : empty ? `Pattern ${p.id}, empty${sounding ? '' : ', create'}`
            : sounding ? `Queue pattern ${p.id} ${p.name} for the next bar` : `Select pattern ${p.id} ${p.name}`;
        return h('button', {
          type: 'button', class: `sampler-pat${current ? ' is-current' : ''}${next ? ' is-next' : ''}${empty ? ' is-empty' : ''}`, dataset: { hit: '48', fr: 'FR-027' }, 'aria-label': name,
          'aria-pressed': String(current), 'aria-disabled': empty && sounding ? 'true' : undefined,
          on: { click: () => pickPattern(p) },
        }, [h('span', { class: 'numeral sampler-pat__id', text: p.id }), h('span', { class: 'sampler-pat__name truncate', text: p.name || '—' }), h('span', { class: 'label sampler-pat__word', text: word })]);
      })),
    );
  }
  function pickPattern(p) {
    if (p.id === PATTERN) {
      if (view.nextPattern) { if (state === 'pattern-change') { ctx.setState('playing-sounding'); return; } view.nextPattern = null; paintBank(); say(`Queued change cancelled; ${PATTERN} keeps sounding.`); }
      return;
    }
    if (!p.bars) { if (!sounding) say(`Pattern ${p.id} is empty. Creating it copies nothing: you start from sixteen empty steps (fixture: not built in this prototype).`); else say(`Pattern ${p.id} is empty — nothing to queue.`); return; }
    if (sounding) {
      if (state === 'playing-sounding' && p.id === 'B1') { ctx.setState('pattern-change'); return; }
      view.nextPattern = p.id; paintBank(); paintReadouts();
      say(`Pattern ${p.id} queued for the next bar; ${PATTERN} keeps sounding until then.`);
    } else say(`Stopped: pattern ${p.id} ${p.name} would open immediately (fixture: this prototype keeps ${PATTERN} on screen).`);
  }

  // ---------------------------------------------------------------- readouts
  const readouts = h('section', { class: 'sampler-readouts raised', 'aria-labelledby': 'sampler-readouts-title' });
  function paintReadouts() {
    const cells = [
      ['Length', `${view.bars} ${view.bars === 1 ? 'bar' : 'bars'} · ${view.bars * 16} steps`],
      ['Resolution', view.resolution === '1/16' ? '1/16 straight' : '1/16 triplet'],
      ['Swing', `${view.swing} %`],
      ['Clock', bpm ? `Deck A leader · ${bpm} BPM` : 'Master clock'],
      ['Sounding', sounding ? `${PATTERN} rev ${view.revision}` : `none · ${PATTERN} rev ${view.revision} stopped`],
      ['Next bar', view.queued ? `rev ${view.queued} from bar ${setup.bar + 1 > view.bars ? 1 : setup.bar + 1}` : view.nextPattern ? `pattern ${view.nextPattern} from its step 1` : state === 'stop-quantized-pending' ? 'stop at bar end' : 'no change queued'],
    ];
    readouts.replaceChildren(
      h('h3', { id: 'sampler-readouts-title', class: 'label sampler-panel__title', text: 'Pattern readouts' }),
      h('dl', { class: 'sampler-readouts__grid' }, cells.map(([k, v]) => h('div', { class: `sampler-readouts__cell${k === 'Next bar' && (view.queued || view.nextPattern || state === 'stop-quantized-pending') ? ' is-next' : ''}` }, [h('dt', { class: 'label', text: k }), h('dd', { class: 'numeral', text: v })]))),
      h('p', { class: 'body muted sampler-hint', text: `${SEQ.clockNote}. Tempo and position are fixtures; events are stored in musical units and scheduled by the engine clock.` }),
      h('mdj-fixture-mark', { for: 'clock and position' }),
    );
  }

  // ---------------------------------------------------------------- lane sample assignment (editing)
  const loaded = data.slots.filter((s) => s.state === 'loaded');
  const assign = state === 'editing' ? h('section', { class: 'sampler-lanes raised', 'aria-labelledby': 'sampler-lanes-title' }) : null;
  function paintAssign() {
    if (!assign) return;
    assign.replaceChildren(
      h('h3', { id: 'sampler-lanes-title', class: 'label sampler-panel__title', text: 'Lane samples · explicit assignment' }),
      h('ul', { class: 'sampler-lanes__rows' }, lanes.map((l, i) => h('li', { class: 'sampler-lanes__row' }, [
        h('span', { class: 'title sampler-lanes__name', text: l.name }),
        h('span', { class: 'numeral sampler-lanes__sample truncate', text: l.sample }),
        button({ label: `Change sample, ${l.name} lane`, icon: 'sampler', cls: 'btn--secondary', fr: FR, on: { click: () => {
          const curN = Number((l.sample.match(/slot (\d+)/) || [])[1]);
          const idx = loaded.findIndex((s) => s.n === curN);
          const nx = loaded[(idx + 1) % loaded.length];
          l.sample = `slot ${nx.n} · ${nx.file.replace(/\.wav$/, '')}`;
          paintAssign(); paintGrid();
          say(`${l.name} lane now plays slot ${nx.n} ${nx.name}. Applied immediately (stopped); the bank's choke groups and voice limit still apply.`);
        } } }),
      ]))),
    );
  }

  // ---------------------------------------------------------------- takeover note
  const takeover = h('section', { class: 'sampler-takeover raised', 'aria-labelledby': 'sampler-takeover-title' }, [
    h('h3', { id: 'sampler-takeover-title', class: 'label sampler-panel__title' }, [icon('takeover', { size: 14 }), h('span', { text: ' Manual takeover' })]),
    h('p', { class: 'body', text: 'The sequencer is yours: ParDay never starts, stops or edits a pattern. Stop now always works, including during an armed ParDay plan, and cancels queued revisions first.' }),
    h('p', { class: 'body muted', text: 'Editing here does not move deck focus — the dock’s Play and Cue still control the decks.' }),
  ]);

  // ---------------------------------------------------------------- grid events
  grid.addEventListener('mdj:seq-transport', (e) => {
    const { cmd } = e.detail;
    if (cmd === 'start') { ctx.setState('playing-sounding'); return; }
    if (cmd === 'stop-at-bar') { ctx.setState('stop-quantized-pending'); return; }
    if (cmd === 'stop-now') { ctx.setState('stop-immediate'); return; }
    if (cmd === 'discard-queued') {
      if (state === 'queued-next-bar-revision') { ctx.setState('playing-sounding'); return; }
      view.queued = 0; view.queuedCells.clear(); paintGrid(); say('Queued revision discarded before the bar line; the sounding pattern did not change.'); return;
    }
    if (cmd === 'pattern') { const b = bank.querySelector('.sampler-pat:not(.is-current):not(.is-empty)'); b?.scrollIntoView({ block: 'nearest' }); b?.focus(); }
  });
  grid.addEventListener('mdj:seq-cell', (e) => {
    const off = landscape ? view.pair * 2 : 0;
    const lane = e.detail.lane + off, step = e.detail.step, tool = e.detail.tool;
    view.page = Math.floor(step / 4) + 1;
    if (state === 'playing-sounding') { pendingEdit = { lane, step, tool }; ctx.setState('queued-next-bar-revision'); return; }
    applyTool(lanes[lane], step, tool);
    if (sounding) {
      view.queued = view.queued || view.revision + 1;
      view.queuedCells.add(`${lane}:${step}`);
      paintGrid();
      say(`${lanes[lane].name} step ${step + 1} queued in rev ${view.queued}; heard from the next bar.`);
    } else {
      view.revision += 1;
      paintGrid();
      say(`${lanes[lane].name} step ${step + 1} changed — applied immediately as rev ${view.revision} (stopped).`);
    }
  });
  grid.addEventListener('mdj:seq-lane-mute', (e) => {
    const off = landscape ? view.pair * 2 : 0;
    const l = lanes[e.detail.lane + off];
    l.mute = e.detail.mute;
    paintGrid();
    say(`${l.name} lane ${l.mute ? 'muted' : 'unmuted'} immediately — lane mute is not quantized${sounding ? ' (acknowledged fixture)' : ''}.`);
  });
  grid.addEventListener('mdj:seq-page', (e) => { view.page = e.detail.page; });
  grid.addEventListener('mdj:seq-setting', (e) => {
    const d = e.detail;
    if ('bars' in d) view.bars = Number(d.bars);
    if ('resolution' in d) view.resolution = d.resolution;
    if ('swing' in d) view.swing = Math.min(100, Math.max(0, Number(d.swing)));
    paintReadouts();
    say(sounding ? 'Setting queued with the next revision; heard from the next bar.' : 'Setting applied immediately (stopped).');
  });

  paintGrid(); paintBank(); paintAssign();
  // A marker beside the lane switch names a pending transport change, so it is visible above the lanes in
  // landscape too (the grid header already carries the queued revision chip).
  const markText = { 'pattern-change': ['quantize', 'B1 Lift queued · next bar', 'next'], 'stop-quantized-pending': ['quantize', 'Stops at bar end · sent', 'next'], 'stop-immediate': ['stop', 'Stopped now · acknowledged', 'stop'] }[state];
  const marker = markText ? h('p', { class: `sampler-marker sampler-marker--${markText[2]}`, role: 'status' }, [icon(markText[0], { size: 14 }), h('span', { text: markText[1] })]) : null;
  const top = pairTabs || marker ? h('div', { class: 'sampler-gridtop' }, [pairTabs, marker].filter(Boolean)) : null;
  const gridWrap = h('section', { class: 'sampler-gridwrap raised', 'aria-label': `Step pattern ${PATTERN}` }, [top, grid].filter(Boolean));
  if (landscape) {
    // All sixteen steps need the full width: the grid leads, the panels follow in one row below it.
    root.append(h('div', { class: 'sampler-scroll' }, [gridWrap, live, h('div', { class: 'sampler-row' }, [lead, bank, readouts, assign, takeover].filter(Boolean))]));
  } else {
    root.append(h('div', { class: 'sampler-scroll' }, [lead, live, gridWrap, explain, assign, bank, readouts, takeover].filter(Boolean)));
  }
}

function applyTool(lane, step, tool) {
  const v = lane.cells[step] | 0;
  if (tool === 'velocity') lane.cells[step] = v >= 3 ? 1 : v + 1;
  else if (tool === 'mute') { const i = lane.muted.indexOf(step); if (i >= 0) lane.muted.splice(i, 1); else lane.muted.push(step); }
  else lane.cells[step] = v > 0 ? 0 : 2;
}

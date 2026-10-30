// <mdj-step-grid rows="4" steps="16" bars="1|2|4" resolution="1/16|1/16T" swing="0..100"
//                current="step index (1-based, 0 = none)" bar="1" revision="7" queued="8"
//                pattern="A3" tool="steps|velocity|mute" page="1..4" queued-cells="1:7,3:12"
//                lanes='[{"name":"Kick","sample":"kick_909","cells":[3,0,…16],"muted":[11],"mute":false}]'
//                state="stopped|playing|queued-revision|editing">
//
// Engine binding: the grid edits PatternRevision(pattern, revision) in MUSICAL units (step index,
// velocity 0..3, step mute, lane mute); the engine schedules events against its own beat clock.
// While the pattern sounds, every edit is admitted as the NEXT revision and activates at the next
// bar boundary (AE-06, FR-027): the header shows "Sounding rev N" and "Rev N+1 queued · next bar"
// as two different chips, the ruler carries a "next bar" marker, and queued cells keep a dashed
// ring with a Q corner mark until the engine acknowledges the switch. Stopped, the editor applies
// immediately and stays usable offline without ParDay. Start, Stop at bar, Stop now and Pattern
// are four distinct commands (sequencer.start, sequencer.stopAtBar, sequencer.stopNow,
// sequencer.pattern) and four labelled buttons: Stop now is immediate, Stop at bar is quantized.
// Units / range: 16 steps per bar; bars 1, 2 or 4 (pattern length = bars × 16; the grid shows the
// 16 steps of the current bar with a bar counter); resolution 1/16 straight or 1/16T triplet;
// swing 0..100 %; velocity 0 (off), 1, 2, 3 drawn as one, two or three filled bars. `current`
// (1-based) and `bar` are the sounding position: here they are fixture values, so the position
// readout carries an inline FIXTURE mark (static fixture = true).
// Gesture: taps only. The edit tool decides what a tap does — Steps toggles the step, Velocity
// cycles 1 → 2 → 3 → 1, Mute mutes / unmutes the step. No long-press, no drag painting, so a
// parent scroll cannot swallow a performance gesture: scrolling the lane is the only drag.
// Hit-bound rule: every step cell is a 48 × 48 dp <button> and hit boxes never overlap, so sixteen
// cells need 16 × 48 + 15 × 2 = 798 dp. Portrait content is 380 dp, so the lanes are one
// horizontally scrollable strip (ruler and all lanes scroll together, snapping to beats) and the
// beat page tabs 1–4 / 5–8 / 9–12 / 13–16 are the non-scroll alternative. From 852 dp (landscape
// content 860 dp) all sixteen cells fit beside the 48 dp mute button and the page tabs hide
// (container query). Lane names sit ABOVE each lane so the mute button keeps a full 48 dp cell
// and the name can scale to 200 % without squeezing a cell.
// Pending vs acknowledged: queued revision (dashed, "queued") vs sounding revision (solid,
// "sounding"); the current-step highlight comes from the engine clock snapshot, never a UI timer,
// and does not animate.
// Cancellation: "Discard queued" drops a queued revision before the bar boundary; Stop now cancels
// queued revisions and sounding voices; app background and route loss stop the transport per
// AE-07 while the grid keeps the pattern and revision.
// Accessible: cells are buttons named "Kick, step 6, velocity 2 of 3, queued for next bar" with
// aria-pressed; lane mute is aria-pressed; page tabs are role=tablist; bars, resolution and the
// edit tool are role=radiogroup; swing has −/+ buttons with the value announced.
import { MdjElement, define, h, s, icon } from './base.js';

const FIXTURE_LANES = [
  { name: 'Kick', sample: 'kick_909', cells: [3, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 2] },
  { name: 'Clap', sample: 'clap_tight', cells: [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0] },
  { name: 'Hat', sample: 'hat_closed', cells: [1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 1] },
  { name: 'Perc', sample: 'perc_wood', cells: [0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0], muted: [11] },
];
const TOOLS = [['steps', 'Steps', 'sequencer'], ['velocity', 'Velocity', 'velocity'], ['mute', 'Mute', 'step-mute']];
const CELL = 48, GAP = 2;

export class MdjStepGrid extends MdjElement {
  static tag = 'mdj-step-grid';
  static states = ['stopped', 'playing', 'queued-revision', 'editing'];
  static fr = ['FR-027'];
  static hit = 0; // layout container: cells, mutes, tabs and actions carry data-hit="48"
  static fixture = true; // the sounding position (current step / bar) is a fixture; the mark is inline in the readout
  static observed = ['rows', 'steps', 'bars', 'resolution', 'swing', 'current', 'bar', 'revision', 'queued', 'pattern', 'tool', 'page', 'queued-cells', 'lanes'];
  static samples = {
    default: { rows: 4, steps: 16, bars: 2, resolution: '1/16', swing: 54, revision: 7, pattern: 'A3', tool: 'steps', style: 'width:min(100%, 380px)' },
    variants: [{}],
    playing: { current: 6, bar: 2 },
    'queued-revision': { current: 5, bar: 1, queued: 8, 'queued-cells': '1:2,3:5', page: 1 },
    editing: { revision: 8, tool: 'velocity' },
  };

  ensureFixtureMark() { /* rendered inline in the position readout by render() */ }

  render() {
    const rows = Math.min(8, Math.max(1, Math.round(this.num('rows', 4))));
    const steps = 16; // one bar per grid page (Document 06 proposed grid); `steps` is accepted for forward compatibility
    const bars = [1, 2, 4].includes(Math.round(this.num('bars', 1))) ? Math.round(this.num('bars', 1)) : 1;
    const resolution = this.attr('resolution', '1/16') === '1/16T' ? '1/16T' : '1/16';
    const swing = Math.min(100, Math.max(0, Math.round(this.num('swing', 50))));
    const state = this.state;
    const sounding = state === 'playing' || state === 'queued-revision';
    const current = sounding ? Math.min(steps, Math.max(0, Math.round(this.num('current', 0)))) : 0;
    const bar = Math.min(bars, Math.max(1, Math.round(this.num('bar', 1))));
    const revision = Math.max(1, Math.round(this.num('revision', 1)));
    const queued = state === 'queued-revision' ? Math.max(revision + 1, Math.round(this.num('queued', revision + 1))) : 0;
    const pattern = this.attr('pattern', 'A1');
    const toolAttr = this.attr('tool', 'steps');
    const tool = TOOLS.some(([id]) => id === toolAttr) ? toolAttr : 'steps';
    const page = Math.min(4, Math.max(1, Math.round(this.num('page', 1))));
    const queuedCells = parseQueued(this.attr('queued-cells', ''));
    const lanes = readLanes(this.attr('lanes', ''), rows, steps);
    this.className = `seq seq--${state}`;

    // ---- header ----
    const revs = h('div', { class: 'seq__revs', role: 'status' }, [
      sounding ? h('span', { class: 'seq__rev seq__rev--sounding' }, [icon('play', { size: 12 }), h('span', { text: `Sounding rev ${revision}` })])
        : state === 'editing' ? h('span', { class: 'seq__rev seq__rev--editing' }, [icon('edit', { size: 12 }), h('span', { text: `Editing rev ${revision} · stopped` })])
          : h('span', { class: 'seq__rev seq__rev--stopped' }, [icon('stop', { size: 12 }), h('span', { text: `Stopped · rev ${revision}` })]),
      queued ? h('span', { class: 'seq__rev seq__rev--queued' }, [icon('quantize', { size: 12 }), h('span', { text: `Rev ${queued} queued · next bar` })]) : null,
    ]);
    const pos = h('span', { class: 'seq__pos numeral', 'aria-label': sounding ? `Position bar ${bar} of ${bars}, step ${current}` : `Position: stopped, ${bars} ${bars === 1 ? 'bar' : 'bars'}` }, [
      h('span', { 'aria-hidden': 'true', text: sounding ? `BAR ${bar}/${bars} · STEP ${current}` : `${bars} ${bars === 1 ? 'BAR' : 'BARS'} · STOPPED` }),
      h('mdj-fixture-mark', { inline: '', for: 'sequencer position' }),
    ]);
    const head = h('div', { class: 'seq__head' }, [
      h('div', { class: 'seq__title' }, [h('span', { class: 'label', text: `Sequencer · ${resolution} · swing ${swing} %` }), h('span', { class: 'title', text: `Pattern ${pattern}` })]),
      revs, pos,
    ]);

    // ---- beat page tabs (portrait alternative to scrolling) ----
    const pages = h('div', { class: 'seq__pages', role: 'tablist', 'aria-label': 'Step page' });
    for (let p = 1; p <= 4; p++) {
      const a = (p - 1) * 4 + 1, b = p * 4;
      pages.appendChild(h('button', {
        type: 'button', role: 'tab', class: 'seq__page numeral', 'aria-selected': String(p === page), 'aria-label': `Steps ${a} to ${b}, beat ${p}`, dataset: { hit: '48' }, text: `${a}–${b}`,
        on: { click: () => { this.setAttribute('page', String(p)); this.emit('mdj:seq-page', { page: p }); } },
      }));
    }

    // ---- ruler + lanes ----
    const scrollers = [];
    const ruler = h('div', { class: 'seq__cells seq__ruler-cells', 'aria-hidden': 'true' });
    for (let i = 0; i < steps; i++) {
      const beat = i % 4 === 0;
      const cls = ['seq__ruler-cell', beat ? 'seq__ruler-cell--beat' : '', i + 1 === current ? 'seq__ruler-cell--current' : ''].filter(Boolean).join(' ');
      ruler.appendChild(h('span', { class: cls, text: beat ? String(i / 4 + 1) : '·' }));
    }
    scrollers.push(ruler);
    const rulerRow = h('div', { class: 'seq__ruler' }, [
      h('span', { class: 'seq__ruler-corner label', 'aria-hidden': 'true', text: queued ? 'next bar ▸' : 'beat' }), ruler,
    ]);
    const laneEls = lanes.map((lane, li) => {
      const cells = h('div', { class: 'seq__cells', role: 'group', 'aria-label': `${lane.name} steps` });
      for (let i = 0; i < steps; i++) {
        const v = Math.min(3, Math.max(0, lane.cells[i] | 0));
        const muted = lane.muted.includes(i);
        const q = queuedCells.has(`${li}:${i}`);
        const isCurrent = i + 1 === current;
        const cls = ['seq__cell', i % 4 === 0 ? 'seq__cell--beat' : '', v > 0 ? 'seq__cell--on' : '', muted ? 'seq__cell--muted' : '', q ? 'seq__cell--queued' : '', isCurrent ? 'seq__cell--current' : ''].filter(Boolean).join(' ');
        const name = `${lane.name}, step ${i + 1}${v > 0 ? `, velocity ${v} of 3` : ', off'}${muted ? ', muted' : ''}${q ? ', queued for next bar' : ''}${isCurrent ? ', sounding now' : ''}`;
        cells.appendChild(h('button', {
          type: 'button', class: cls, 'aria-label': name, 'aria-pressed': String(v > 0), dataset: { hit: '48', step: String(i + 1) },
          on: { click: () => this.emit('mdj:seq-cell', { lane: li, step: i, tool, velocity: v, muted }) },
        }, [velocityGlyph(v, muted)]));
      }
      scrollers.push(cells);
      const mute = h('button', {
        type: 'button', class: 'seq__mute', 'aria-pressed': String(!!lane.mute), 'aria-label': `Mute ${lane.name} lane`, dataset: { hit: '48' },
        on: { click: () => this.emit('mdj:seq-lane-mute', { lane: li, mute: !lane.mute }) },
      }, [icon('mute', { size: 14 }), h('span', { class: 'seq__mute-text', text: 'M' })]);
      return h('div', { class: `seq__lane${lane.mute ? ' seq__lane--muted' : ''}` }, [
        h('div', { class: 'seq__lane-head' }, [
          h('span', { class: 'seq__lane-name label label-strong', text: lane.name }),
          h('span', { class: 'seq__lane-sample numeral', text: lane.sample ? `${lane.sample} · fixture` : 'no sample assigned' }),
          lane.mute ? h('span', { class: 'seq__lane-flag label', text: 'muted' }) : null,
        ]),
        h('div', { class: 'seq__lane-row' }, [mute, cells]),
      ]);
    });
    const lanesWrap = h('div', { class: 'seq__lanes' }, [rulerRow, ...laneEls]);

    // ---- edit tool ----
    const toolSeg = h('div', { class: 'seq__seg', role: 'radiogroup', 'aria-label': 'Edit tool' });
    for (const [id, text, ic] of TOOLS) {
      toolSeg.appendChild(h('button', { type: 'button', role: 'radio', class: 'seq__segbtn', 'aria-checked': String(id === tool), 'aria-label': `Edit tool ${text}`, dataset: { hit: '48' }, on: { click: () => { this.setAttribute('tool', id); this.emit('mdj:seq-tool', { tool: id }); } } }, [icon(ic, { size: 16 }), h('span', { text })]));
    }
    const tools = h('div', { class: 'seq__tools' }, [
      h('span', { class: 'label seq__rowlabel', text: 'Edit tool' }), toolSeg,
      h('span', { class: 'seq__hint', text: sounding ? `Edits queue as rev ${queued || revision + 1} and sound from the next bar.` : 'Stopped: edits apply immediately; works offline without ParDay.' }),
    ]);

    // ---- transport actions ----
    const act = (text, ic, cls, enabled, cmd) => h('button', {
      type: 'button', class: `btn ${cls}`.trim(), dataset: { hit: '48' }, 'aria-disabled': enabled ? undefined : 'true', 'aria-label': `${text}, pattern ${pattern}`,
      on: { click: () => { if (enabled) this.emit('mdj:seq-transport', { cmd, pattern, revision }); } },
    }, [icon(ic, { size: 18 }), h('span', { class: 'btn-label', text })]);
    const actions = h('div', { class: 'seq__actions', role: 'group', 'aria-label': 'Sequencer transport' }, [
      act('Start', 'play', 'btn--primary', !sounding, 'start'),
      act('Stop at bar', 'quantize', 'btn--secondary', sounding, 'stop-at-bar'),
      act('Stop now', 'stop', 'btn--danger', sounding, 'stop-now'),
      h('button', { type: 'button', class: 'btn btn--secondary', dataset: { hit: '48' }, 'aria-label': `Pattern change, current pattern ${pattern}${sounding ? ', takes effect at next bar' : ''}`, 'aria-haspopup': 'listbox', on: { click: () => this.emit('mdj:seq-transport', { cmd: 'pattern', pattern }) } }, [icon('pattern', { size: 18 }), h('span', { class: 'btn-label', text: `Pattern ${pattern}` }), icon('chevron-down', { size: 14 })]),
      queued ? act('Discard queued', 'discard', 'btn--secondary', true, 'discard-queued') : null,
    ]);

    // ---- settings: bars · resolution · swing ----
    const seg = (name, options, value, attr) => {
      const g = h('div', { class: 'seq__seg', role: 'radiogroup', 'aria-label': name });
      for (const [val, text] of options) g.appendChild(h('button', { type: 'button', role: 'radio', class: 'seq__segbtn numeral', 'aria-checked': String(val === value), 'aria-label': `${name} ${text}${sounding ? ', from next bar' : ''}`, dataset: { hit: '48' }, text, on: { click: () => { this.setAttribute(attr, String(val)); this.emit('mdj:seq-setting', { [attr]: val }); } } }));
      return g;
    };
    const swingBtn = (d) => h('button', { type: 'button', class: 'seq__segbtn seq__swingbtn', 'aria-label': `Swing ${d > 0 ? 'up' : 'down'}, now ${swing} %`, dataset: { hit: '48' }, on: { click: () => { this.setAttribute('swing', String(Math.min(100, Math.max(0, swing + d)))); this.emit('mdj:seq-setting', { swing: swing + d }); } } }, [icon(d > 0 ? 'plus' : 'minus', { size: 16 })]);
    const settings = h('div', { class: 'seq__settings' }, [
      h('span', { class: 'seq__setting' }, [h('span', { class: 'label seq__rowlabel', text: 'Bars' }), seg('Pattern length in bars', [[1, '1'], [2, '2'], [4, '4']], bars, 'bars')]),
      h('span', { class: 'seq__setting' }, [h('span', { class: 'label seq__rowlabel', text: 'Grid' }), seg('Resolution', [['1/16', '1/16'], ['1/16T', '1/16T']], resolution, 'resolution')]),
      h('span', { class: 'seq__setting' }, [h('span', { class: 'label seq__rowlabel', text: 'Swing' }), h('span', { class: 'seq__seg', role: 'group', 'aria-label': `Swing ${swing} %` }, [swingBtn(-2), h('span', { class: 'seq__swing numeral', 'aria-hidden': 'true', text: `${swing} %` }), swingBtn(2)])]),
    ]);

    this.replaceChildren(head, pages, lanesWrap, tools, actions, settings);

    // Keep ruler and lanes scrolled together; the page tabs set the shared offset.
    let syncing = false;
    for (const sc of scrollers) sc.addEventListener('scroll', () => { if (syncing) return; syncing = true; for (const o of scrollers) if (o !== sc) o.scrollLeft = sc.scrollLeft; syncing = false; });
    const target = (page - 1) * 4 * (CELL + GAP);
    requestAnimationFrame(() => { for (const sc of scrollers) sc.scrollLeft = target; });
  }
}

function velocityGlyph(v, muted) {
  const svg = s('svg', { viewBox: '0 0 24 24', class: 'seq__glyph', 'aria-hidden': 'true', focusable: 'false' });
  if (v <= 0) svg.appendChild(s('circle', { cx: 12, cy: 12, r: 2.2, class: 'seq__glyph-off' }));
  for (let i = 1; i <= 3; i++) svg.appendChild(s('rect', { x: 5, y: 21 - i * 6, width: 14, height: 4, rx: 1, class: `seq__glyph-bar${v >= i ? ' seq__glyph-bar--on' : ''}` }));
  if (muted) svg.appendChild(s('path', { d: 'M4 20 L20 4', class: 'seq__glyph-mute' }));
  return svg;
}
function parseQueued(text) {
  const set = new Set();
  for (const part of String(text).split(',')) { const m = part.trim().match(/^(\d+):(\d+)$/); if (m) set.add(`${Number(m[1])}:${Number(m[2])}`); }
  return set;
}
function readLanes(json, rows, steps) {
  let list = null;
  if (json) { try { list = JSON.parse(json); } catch { list = null; } }
  if (!Array.isArray(list)) list = FIXTURE_LANES;
  const out = [];
  for (let r = 0; r < rows; r++) {
    const src = list[r] || FIXTURE_LANES[r % FIXTURE_LANES.length] || {};
    const cells = Array.isArray(src.cells) ? src.cells.slice(0, steps) : [];
    while (cells.length < steps) cells.push(0);
    out.push({ name: src.name || `Lane ${r + 1}`, sample: src.sample || '', cells, muted: Array.isArray(src.muted) ? src.muted : [], mute: !!src.mute });
  }
  return out;
}

define(MdjStepGrid);

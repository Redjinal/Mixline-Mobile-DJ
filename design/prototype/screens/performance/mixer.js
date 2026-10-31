// perform/mixer — the full mixer workspace (Document 03 §2 "Mixer": gain, EQ, filter, faders,
// assignments, headphone mix and meters; FR-020, FR-021, FR-022).
//
// Per channel: trim, HI / MID / LO EQ (centre detent), filter (LP ← OFF → HP), headphone Cue select
// (48 dp, the word "Cue"), Mute, channel fader with a full-scale vertical meter, and the crossfader
// assignment (A side / Thru / B side). Global: crossfader curve (linear / equal power / cut) and
// Reverse. The crossfader itself and the master meter stay in the shell dock (not duplicated here).
// Headphone cue only monitors on a route with an isolated cue output (FR-022); otherwise the
// selection is kept and the screen says it cannot be heard.
// No engine: every level, peak and dB value is a fixture; continuous controls show SENT until the
// prototype stands in for the engine and acknowledges.
import { register } from '../../app/registry.js';
import { h, button, icon, fmt } from '../../components/base.js';
import { prepare, withShell, standInEngine, inspectorHost, toggle, fixtureNote, wrapC } from './ab.js';

const CURVES = [['linear', 'Linear'], ['equal-power', 'Equal power'], ['cut', 'Cut']];

register({
  id: 'perform/mixer', family: 'performance', title: 'Perform — mixer', order: 3,
  fr: ['FR-020', 'FR-021', 'FR-022'],
  shell: true,
  dock: { portrait: true, landscape: true },
  states: {
    normal: { label: 'Normal — two channels, cue route available', exercised: true, scenario: 'transition' },
    'cue-selected': { label: 'Headphone cue on channel B', exercised: true, scenario: 'transition', via: { from: 'normal', control: 'Headphone cue, channel B' } },
    'bypass-crossfader': { label: 'Channel A set to Thru (bypasses the crossfader)', exercised: true, scenario: 'transition', via: { from: 'normal', control: 'Thru, channel A' } },
    'muted-channel': { label: 'Channel B muted', exercised: false, scenario: 'transition' },
    clipping: { label: 'Channel A clipping, master limiting', exercised: false, scenario: 'clipping' },
    'four-channel': { label: 'Four channels (pair switch in portrait)', exercised: false, scenario: 'four-deck' },
  },
  defaultState: 'normal',
  render(ctx) { return renderMixer(ctx); },
});

function renderMixer(ctx) {
  const s = prepare(ctx);
  const st = ctx.state;
  const land = ctx.orientation === 'landscape';
  const cueRoute = s.route.cue && s.route.cue !== 'none';
  const root = h('div', { class: `performance-mixer performance-mixer--${land ? 'landscape' : 'portrait'}`, dataset: { state: st } });
  const decks = ['A', 'B', 'C', 'D'].filter((L) => s.decks[L].enabled);
  const view = { ctx, s, st, land, cueRoute, decks, curve: 'equal-power', reverse: false };

  root.appendChild(h('header', { class: 'performance-mixer__head ink-backing' }, [
    h('h1', { class: 'title performance-mixer__title' }, [icon('eq', { size: 18 }), h('span', { text: 'Mixer' })]),
    h('p', { class: `performance-mixer__route body ${cueRoute ? '' : 'performance-mixer__route--nocue'}`.trim() }, [
      icon(cueRoute ? 'headphones' : 'warning', { size: 14 }),
      h('span', { text: cueRoute ? `${s.route.name}: headphone cue on ${s.route.cue}.` : `${s.route.name}: no isolated cue output. Cue selects a channel but you will not hear it on headphones.` }),
    ]),
  ]));
  if (st === 'clipping') {
    root.appendChild(h('section', { class: 'performance-banner tone-warning', role: 'status', 'aria-label': 'Clipping' }, [
      h('div', { class: 'performance-banner__text' }, [
        h('p', { class: 'title performance-banner__title' }, [icon('warning', { size: 18 }), h('span', { text: 'Channel A is clipping' })]),
        h('p', { class: 'body' }, ['Trim A is ', h('strong', { class: 'numeral', text: fmt.db(s.decks.A.gainDb) }), '; the master limiter is reducing ', h('strong', { class: 'numeral', text: fmt.db(s.master.limiterGrDb) }), ' (fixture). Lower trim A.']),
      ]),
      button({ label: 'Open Master', icon: 'master', fr: ['FR-021'], on: { click: () => ctx.navigate('perform/master', { state: 'clipping' }) } }),
    ]));
  }

  // Four channels in portrait: a pair switch (view only) instead of four squeezed strips.
  let shown = decks;
  if (!land && decks.length > 2) {
    shown = ['A', 'B'];
    const sw = h('div', { class: 'performance-mixer__pairsw', role: 'group', 'aria-label': 'Channels shown' }, [
      h('span', { class: 'label', text: 'Showing' }),
    ]);
    for (const p of [['A', 'B'], ['C', 'D']]) {
      const key = p.join('/');
      sw.appendChild(button({ label: `Channels ${key}`, attrs: { 'aria-pressed': String(key === 'A/B') }, on: { click: (e) => showPair(root, view, p, e.currentTarget) } }));
    }
    root.appendChild(sw);
  }
  const strips = h('section', { class: `performance-mixer__strips performance-mixer__strips--${shown.length}`, 'aria-label': 'Channels' });
  for (const L of shown) strips.appendChild(strip(view, s.decks[L]));
  root.appendChild(strips);
  root.appendChild(globalSection(view));
  root.appendChild(fixtureNote('Levels, peaks and dB readouts are fixtures. Controls show SENT until the prototype acknowledges; fader and EQ laws are DSP contracts.'));

  wire(root, view);
  return root;
}

function showPair(root, view, pair, btn) {
  const strips = root.querySelector('.performance-mixer__strips');
  strips.replaceChildren(...pair.map((L) => strip(view, view.s.decks[L])));
  root.querySelectorAll('.performance-mixer__pairsw .btn').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
}

function xfSide(view, L) {
  if (view.st === 'bypass-crossfader' && L === 'A') return 'thru';
  if (view.s.decks[L].xf) return view.s.decks[L].xf;
  return L === 'A' || L === 'C' ? 'a' : 'b';
}

function strip(view, d) {
  const { s, st, cueRoute, ctx } = view;
  const L = d.letter;
  const lost = s.route.status === 'lost';
  const muted = !!d.muted;
  const clipping = st === 'clipping' && d.levelL >= 0.97;
  const cueOn = s.cue.deck === L;
  const side = xfSide(view, L);
  const el = h('article', { class: `performance-strip glass deck-${L.toLowerCase()}${muted ? ' performance-strip--muted' : ''}`, 'aria-label': `Channel ${L}` });
  el.appendChild(h('div', { class: 'performance-strip__head' }, [
    h('span', { class: 'performance-chip numeral', text: L }),
    h('span', { class: 'label label-strong', text: `CH ${L}` }),
    h('span', { class: 'performance-strip__title truncate', text: d.track ? d.track.title : 'No track' }),
  ]));
  const dial = (kind, label, value) => h('mdj-dial', { kind, deck: L, label, value, size: 48, default: 0, state: lost ? 'disabled' : null });
  const cueBtn = button({
    label: 'Cue', icon: 'headphones', cls: 'performance-strip__cue', fr: ['FR-022'],
    attrs: { 'aria-label': `Headphone cue, channel ${L}`, 'aria-pressed': String(cueOn) },
    on: { click: (e) => {
      if (st === 'normal' && L === 'B') ctx.setState('cue-selected');
      else if (st === 'cue-selected' && L === 'B') ctx.setState('normal');
      else ackPress(e.currentTarget);
    } },
  });
  if (cueOn && !cueRoute) cueBtn.appendChild(h('span', { class: 'performance-strip__cue-note label', text: 'Not audible' }));
  el.appendChild(h('div', { class: 'performance-strip__dials' }, [
    dial('gain', 'Trim', d.gainDb || 0), dial('eq-hi', 'Hi', d.eq?.hi || 0), dial('eq-mid', 'Mid', d.eq?.mid || 0),
    dial('eq-lo', 'Lo', d.eq?.lo || 0), dial('filter', 'Filter', d.filter || 0), cueBtn,
  ]));
  const meterState = lost || muted ? 'muted' : clipping ? 'clipping' : d.levelL > 0 ? 'active' : 'idle';
  el.appendChild(h('div', { class: 'performance-strip__levels' }, [
    h('mdj-fader', { deck: L, value: d.fader ?? 1, label: `CH ${L}`, height: 160, scale: 'on', state: lost ? 'disabled' : muted ? 'muted' : null }),
    wrapC('performance-strip__meter', h('mdj-meter', { kind: 'channel', deck: L, l: muted ? 0 : d.levelL, r: muted ? 0 : d.levelR, peak: clipping ? 1 : (d.levelL ? Math.min(1, d.levelL + 0.08) : null), clip: clipping ? true : null, 'clip-latched': clipping ? true : null, orientation: 'vertical', scale: 'full', label: `Ch ${L}`, state: meterState })),
  ]));
  el.appendChild(toggle({ label: muted ? 'Muted' : 'Mute', name: `Mute, channel ${L}`, pressed: muted, deck: L, fr: ['FR-020'], iconName: 'mute', cls: 'performance-strip__mute' }));
  const assign = h('div', { class: 'performance-strip__assign', role: 'group', 'aria-label': `Crossfader assignment, channel ${L}` });
  for (const [id, text] of [['a', 'A side'], ['thru', 'Thru'], ['b', 'B side']]) {
    assign.appendChild(button({
      label: text, fr: ['FR-020'], cls: 'performance-strip__side',
      attrs: { 'aria-label': `${text}, channel ${L}`, 'aria-pressed': String(side === id) },
      on: { click: (e) => {
        if (st === 'normal' && L === 'A' && id === 'thru') { ctx.setState('bypass-crossfader'); return; }
        if (st === 'bypass-crossfader' && L === 'A' && id === 'a') { ctx.setState('normal'); return; }
        selectIn(assign, e.currentTarget);
      } },
    }));
  }
  el.appendChild(assign);
  if (side === 'thru') el.appendChild(h('p', { class: 'performance-strip__note body', text: `Channel ${L} bypasses the crossfader: its fader alone sets its level in the master.` }));
  if (muted) el.appendChild(h('p', { class: 'performance-strip__note body', text: 'Muted: the fader keeps its position; unmute to return to it.' }));
  if (cueOn) el.appendChild(h('p', { class: 'performance-strip__note body', text: cueRoute ? `Channel ${L} is in the headphones (${s.route.cue}).` : 'Selected for cue, but this route has no isolated cue output.' }));
  return el;
}

// Local SENT → acknowledged for a selection button that has no declared state.
function ackPress(btn) {
  if (!btn || btn.dataset.state === 'pending') return;
  btn.dataset.state = 'pending';
  setTimeout(() => { if (!btn.isConnected) return; btn.setAttribute('aria-pressed', String(btn.getAttribute('aria-pressed') !== 'true')); delete btn.dataset.state; }, 450);
}
function selectIn(group, btn) {
  if (btn.getAttribute('aria-pressed') === 'true') return;
  group.querySelectorAll('.btn').forEach((b) => { b.dataset.state = b === btn ? 'pending' : ''; });
  setTimeout(() => { if (!btn.isConnected) return; group.querySelectorAll('.btn').forEach((b) => { b.setAttribute('aria-pressed', String(b === btn)); delete b.dataset.state; }); }, 450);
}

function globalSection(view) {
  const { s } = view;
  const sec = h('section', { class: 'performance-mixer__global glass', 'aria-label': 'Crossfader settings' }, [
    h('p', { class: 'label label-strong performance-mixer__gtitle' }, [icon('crossfader', { size: 14 }), h('span', { text: 'Crossfader' })]),
    h('p', { class: 'body performance-mixer__gnote' }, ['Position ', h('strong', { class: 'numeral', text: `${Math.round((1 - s.crossfader) * 100)} % ${s.focus[0]} · ${Math.round(s.crossfader * 100)} % ${s.focus[1]}` }), ' (fixture). The crossfader itself is in the dock.']),
  ]);
  const curves = h('div', { class: 'performance-mixer__curves', role: 'group', 'aria-label': 'Crossfader curve' });
  for (const [id, text] of CURVES) curves.appendChild(button({ label: text, fr: ['FR-020'], attrs: { 'aria-label': `Curve ${text}`, 'aria-pressed': String(id === view.curve) }, on: { click: (e) => selectIn(curves, e.currentTarget) } }));
  sec.appendChild(curves);
  sec.appendChild(toggle({ label: 'Reverse', name: 'Reverse crossfader', pressed: view.reverse, fr: ['FR-020'], iconName: 'reverse' }));
  return sec;
}

function wire(root, view) {
  standInEngine(root);
  withShell(root, (shell) => { const dock = shell.querySelector('.shell__dock'); if (dock) standInEngine(dock); });
  inspectorHost(root);
}

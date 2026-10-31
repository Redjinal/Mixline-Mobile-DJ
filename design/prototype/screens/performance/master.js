// perform/master — the Master panel opened from the dock's Master button (Document 03 §1; FR-021,
// FR-022, FR-023, FR-031).
//
// Master level, a full-scale master meter, the limiter state with its gain-reduction numeral, the
// headroom readout, the clip latch and its explicit Reset, the headphone cue mix and cue gain, the
// split-cue option (only on a route with an isolated cue), and links to the recording panel and the
// route check. On a route without an isolated cue the cue controls are replaced by a plain statement
// and a Change route action (never implying isolation without route evidence, FR-022).
// No engine: levels, peak, gain reduction and headroom are fixtures (meters print FIXTURE).
import { register } from '../../app/registry.js';
import { h, button, icon, fmt } from '../../components/base.js';
import { prepare, withShell, standInEngine, inspectorHost, toggle, fixtureNote, wrapC } from './ab.js';

register({
  id: 'perform/master', family: 'performance', title: 'Perform — master panel', order: 4,
  fr: ['FR-021', 'FR-022', 'FR-023', 'FR-031'],
  shell: true,
  dock: { portrait: true, landscape: true },
  states: {
    normal: { label: 'Normal — USB 4-out, cue available', exercised: false, scenario: 'a-playing' },
    'limiter-active': { label: 'Limiter reducing (no clip)', exercised: false, scenario: 'transition' },
    clipping: { label: 'Clipping — clip latched', exercised: false, scenario: 'clipping' },
    'muted-route-lost': { label: 'Output lost — master muted', exercised: false, scenario: 'route-lost' },
    'cue-unavailable': { label: 'Phone speaker — cue unavailable', exercised: false, scenario: 'a-playing' },
    'split-cue': { label: 'Split cue in the headphones', exercised: false, scenario: 'a-playing' },
  },
  defaultState: 'normal',
  render(ctx) { return renderMaster(ctx); },
});

const dbfs = (lin) => (lin > 0 ? 20 * Math.log10(lin) : null);

function renderMaster(ctx) {
  const s = prepare(ctx);
  const st = ctx.state;
  const land = ctx.orientation === 'landscape';
  const m = s.master;
  const lost = s.route.status === 'lost';
  const cueRoute = !lost && s.route.cue && s.route.cue !== 'none';
  const root = h('div', { class: `performance-master performance-master--${land ? 'landscape' : 'portrait'}`, dataset: { state: st } });

  const rec = s.recording?.state === 'recording' ? `Recording ${fmt.time(s.recording.elapsedSec)}` : 'Not recording';
  root.appendChild(h('header', { class: 'performance-master__head ink-backing' }, [
    h('h1', { class: 'title performance-master__title' }, [icon('master', { size: 18 }), h('span', { text: 'Master' })]),
    h('div', { class: 'performance-master__links' }, [
      button({ label: `Route: ${s.route.name}`, icon: lost ? 'route-lost' : 'route', fr: ['FR-023'], cls: 'performance-master__link', attrs: { 'aria-label': `Route summary: ${s.route.name}. ${s.route.summary || ''} Open route check.` }, on: { click: () => ctx.navigate('route/check') } }),
      button({ label: rec, icon: 'rec', fr: ['FR-031'], cls: 'performance-master__link', attrs: { 'aria-label': `${rec}. Open recording.` }, on: { click: () => ctx.navigate('rec/panel') } }),
    ]),
  ]));

  if (lost) {
    root.appendChild(h('section', { class: 'performance-banner tone-critical', role: 'alert', 'aria-label': 'Output lost' }, [
      h('div', { class: 'performance-banner__text' }, [
        h('p', { class: 'title performance-banner__title' }, [icon('route-lost', { size: 18 }), h('span', { text: 'Output lost — master muted' })]),
        h('p', { class: 'body', text: 'The decks are paused and muted. Master and cue controls are unavailable until an output is chosen; cue audio is never moved to the phone speaker.' }),
      ]),
      button({ label: 'Check output', icon: 'route', cls: 'btn--primary', fr: ['FR-023'], on: { click: () => ctx.navigate('route/check') } }),
    ]));
  }

  // ---- master section
  const gr = m.limiterGrDb || 0;
  const limiting = gr < -0.05;
  const peakDb = dbfs(m.peakHold ?? 0);
  const latched = !!(m.clip || m.clipLatched);
  const masterSec = h('section', { class: 'performance-master__main glass', 'aria-label': 'Master output' });
  masterSec.appendChild(wrapC('performance-master__meter', h('mdj-meter', { kind: 'master', l: m.levelL, r: m.levelR, peak: m.peakHold ?? null, clip: m.clip ? true : null, 'clip-latched': latched ? true : null, gr: limiting ? gr : null, orientation: 'vertical', scale: 'full', label: 'Master', state: lost || m.muted ? 'muted' : m.clip ? 'clipping' : m.levelL > 0 ? 'active' : 'idle' })));
  const readouts = h('div', { class: 'performance-master__readouts' });
  readouts.appendChild(h('mdj-dial', { kind: 'gain', label: 'Master level', value: m.levelDb ?? 0, min: -24, max: 6, default: 0, unit: 'dB', size: 64, state: lost ? 'disabled' : null }));
  const lim = h('div', { class: `performance-master__stat ${limiting ? 'performance-master__stat--active' : ''}`.trim(), role: 'status', 'aria-label': `Limiter ${limiting ? `reducing ${fmt.db(gr)}` : 'idle'}, fixture` }, [
    h('span', { class: 'label', text: 'Limiter' }),
    h('span', { class: 'numeral performance-master__big', text: limiting ? fmt.db(gr) : '0.0 dB' }),
    h('span', { class: 'performance-master__word label', text: limiting ? 'Reducing · gain reduction' : 'Idle · no reduction' }),
  ]);
  const head = h('div', { class: 'performance-master__stat', role: 'status', 'aria-label': `Peak ${peakDb == null ? 'none' : `${peakDb.toFixed(1)} dBFS`}, headroom ${peakDb == null ? 'unknown' : `${(-peakDb).toFixed(1)} dB`}, fixture` }, [
    h('span', { class: 'label', text: 'Headroom' }),
    h('span', { class: 'numeral performance-master__big', text: peakDb == null ? '—' : `${Math.max(0, -peakDb).toFixed(1)} dB` }),
    h('span', { class: 'performance-master__word label', text: peakDb == null ? 'No signal' : `Peak ${peakDb.toFixed(1)} dBFS` }),
  ]);
  readouts.appendChild(h('div', { class: 'performance-master__stats' }, [lim, head]));
  const clipBox = h('div', { class: `performance-master__clip ${latched ? 'tone-critical' : ''}`.trim() }, [
    h('span', { class: 'performance-master__clipword label' }, [icon(latched ? 'warning' : 'check', { size: 14 }), h('span', { text: m.clip ? 'Clipping now · latched' : latched ? 'Clip latched' : 'No clip since reset' })]),
    button({ label: 'Reset clip', icon: 'undo', fr: ['FR-021'], attrs: { disabled: latched && !lost ? null : true, 'aria-label': latched ? 'Reset clip latch' : 'Reset clip latch (nothing latched)' }, on: { click: (e) => resetClip(e.currentTarget, clipBox, !!m.clip) } }),
  ]);
  readouts.appendChild(clipBox);
  masterSec.appendChild(readouts);
  root.appendChild(masterSec);

  // ---- cue section
  const cueSec = h('section', { class: 'performance-master__cue glass', 'aria-label': 'Headphone cue' });
  cueSec.appendChild(h('p', { class: 'label label-strong performance-master__cuetitle' }, [icon('headphones', { size: 14 }), h('span', { text: 'Headphone cue' })]));
  if (cueRoute) {
    const split = !!s.cue.split;
    cueSec.appendChild(h('p', { class: 'body performance-master__cuenote', text: `${s.route.name}: cue on ${s.route.cue}, master on ${s.route.master}. Cue channel: ${s.cue.deck ? `Deck ${s.cue.deck}` : 'none selected'}.` }));
    cueSec.appendChild(h('div', { class: 'performance-master__cuedials' }, [
      h('mdj-dial', { kind: 'generic', label: 'Cue mix', value: Math.round((s.cue.mix ?? 0.5) * 100), min: 0, max: 100, default: 50, unit: '% master', size: 56 }),
      h('mdj-dial', { kind: 'gain', label: 'Phones level', value: s.cue.gainDb ?? 0, min: -24, max: 6, default: 0, unit: 'dB', size: 56 }),
      wrapC('performance-master__cuemeter', h('mdj-meter', { kind: 'cue', l: s.cue.deck ? (s.decks[s.cue.deck].levelL || 0.45) : 0, r: s.cue.deck ? (s.decks[s.cue.deck].levelR || 0.43) : 0, orientation: 'horizontal', scale: 'full', label: 'Cue', state: s.cue.deck ? 'active' : 'idle' })),
    ]));
    cueSec.appendChild(toggle({ label: 'Split cue', name: 'Split cue: cue in the left ear, master in the right', pressed: split, fr: ['FR-022'], iconName: 'split-mono', cls: 'performance-master__split' }));
    cueSec.appendChild(h('p', { class: 'body performance-master__cuenote', text: split ? 'Split on: cue (mono) in the left ear, master (mono) in the right. Cue mix is fixed while split.' : 'Split off: the cue mix blends cue and master in both ears.' }));
  } else {
    cueSec.appendChild(wrapC('performance-master__cuemeter', h('mdj-meter', { kind: 'cue', orientation: 'horizontal', scale: 'full', label: 'Cue', state: 'unavailable' })));
    cueSec.appendChild(h('p', { class: 'body performance-master__nocue' }, [h('strong', { text: 'Cue unavailable on this route. ' }), lost ? 'No output is connected.' : (s.route.detail || 'This output has no isolated cue channel.')]));
    cueSec.appendChild(button({ label: 'Change route', icon: 'route', cls: 'btn--primary', fr: ['FR-022', 'FR-023'], on: { click: () => ctx.navigate('route/check') } }));
  }
  root.appendChild(cueSec);
  root.appendChild(fixtureNote('Levels, peak, gain reduction and headroom are fixtures; no meter here measures audio. Limiter law and ballistics are DSP contracts.'));

  standInEngine(root);
  inspectorHost(root);
  withShell(root, (shell) => { const dock = shell.querySelector('.shell__dock'); if (dock) standInEngine(dock); });
  return root;
}

// Reset is explicit and honest: while the signal still clips, the latch sets again.
function resetClip(btn, box, stillClipping) {
  if (btn.dataset.state === 'pending') return;
  btn.dataset.state = 'pending';
  btn.querySelector('.btn-label').textContent = 'Reset sent';
  setTimeout(() => {
    if (!box.isConnected) return;
    delete btn.dataset.state;
    const word = box.querySelector('.performance-master__clipword span:last-child');
    if (stillClipping) { word.textContent = 'Latched again — still clipping'; btn.querySelector('.btn-label').textContent = 'Reset clip'; }
    else { word.textContent = 'No clip since reset'; box.classList.remove('tone-critical'); btn.querySelector('.btn-label').textContent = 'Reset clip'; btn.disabled = true; }
  }, 450);
}

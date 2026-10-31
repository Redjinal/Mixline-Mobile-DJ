// pads/loops — loops, roll, beat jump and saved loops for the focused deck (Document 03 §4 "Hot cues /
// loop pads": quantized commands display pending execution; Document 06 AE-02: exact loop points,
// half/double, roll, beat jump, saved loops, slip shadow position; FR-017 / FR-018 / FR-019).
//
// Composition: workspace row, deck line (deck, track, BPM, quantize), a detailed <mdj-waveform> window
// (8 bars, playhead fixed at the centre) with the loop region drawn over it by this screen — the
// waveform draws only prepared loops from the track record, so the live loop band, the pending in-point
// and the track-end clamp are screen overlays on opaque labels — then <mdj-loop-controls> (In / Out /
// Reloop-Exit / readout / ½ / ×2, roll row, beat-jump row), a state lead that says what is happening in
// words, and the saved-loops list (48 dp Recall rows). Landscape: waveform + controls on the left, lead +
// saved loops on the right, each column scrolls on its own.
//
// No engine exists. The screen stands in for it: Loop in (inactive) → pending (In admitted, waiting for
// the beat); Loop out (pending) → active 8-beat loop; Exit (active) → inactive; tapping the pending In
// again cancels. Everything else prints SENT and stays unacknowledged. The waveform, the position and the
// loop region are fixtures.
import { register } from '../../app/registry.js';
import { h, button, icon, fmt } from '../../components/base.js';
import { padsNav, deckLine, statusNote, fixtureLine, padsData, QUANTIZE } from './pads.js';

const ZOOM_BARS = 8; // detailed window: 8 bars = 32 beats, playhead at the centre
const BEATS_IN_VIEW = ZOOM_BARS * 4;

const CFG = {
  inactive: { comp: 'inactive', length: 8, saved: true },
  pending: { comp: 'pending', length: 8, pending: 'in', saved: true },
  'active-8': { comp: 'active', length: 8 },
  roll: { comp: 'roll', length: 8, roll: '1/4', saved: true },
  'saved-loops': { comp: 'inactive', length: 8, saved: true },
  'edge-of-track': { comp: 'active', length: 11, position: 366 },
};

register({
  id: 'pads/loops', family: 'pads', title: 'Loops and beat jump', order: 2,
  fr: ['FR-017', 'FR-018', 'FR-019'],
  shell: true,
  dock: { portrait: true, landscape: true },
  states: {
    inactive: { label: 'No loop — deck A playing', exercised: true, scenario: 'a-playing', via: { from: 'active-8', control: 'Exit loop, deck A, 8 beats looping' } },
    pending: { label: 'Loop in admitted — waits for the next beat; Loop out not set', exercised: true, scenario: 'a-playing', via: { from: 'inactive', control: 'Loop in, deck A' } },
    'active-8': { label: 'Active 8-beat loop', exercised: true, scenario: 'a-playing', via: { from: 'pending', control: 'Loop out, deck A' } },
    roll: { label: 'Loop roll 1/4 held — slip returns on release', exercised: false, scenario: 'a-playing' },
    'saved-loops': { label: 'Saved loops — recall list', exercised: true, scenario: 'a-playing', via: { from: 'inactive', control: 'Show saved loops, deck A' } },
    'edge-of-track': { label: 'Loop out beyond track end — clamped', exercised: false, scenario: 'a-playing' },
  },
  defaultState: 'inactive',
  render(ctx) {
    const state = ctx.state;
    const cfg = CFG[state] || CFG.inactive;
    const land = ctx.orientation === 'landscape';
    const deck = ctx.session.decks.A;
    if (cfg.position != null) { deck.positionSec = cfg.position; deck.remainingSec = Math.max(0, deck.track.durationSec - cfg.position); }
    const t = deck.track;
    const spb = 60 / t.bpm; // seconds per beat
    const { note, say } = statusNote();

    // ---- deck line with position (fixture) ----
    const pos = h('span', { class: 'pads-pos numeral' }, [h('span', { text: fmt.time(deck.positionSec) }), h('span', { class: 'muted', text: ` / ${fmt.time(t.durationSec)}` })]);
    const line = deckLine(deck, { extra: [h('span', { class: 'pads-qchip label' }, [icon('quantize', { size: 12 }), h('span', { text: `Q ${QUANTIZE}` })])] });

    // ---- waveform window with screen-drawn loop overlay ----
    const wave = h('div', { class: 'pads-wave' }, [
      h('div', { class: 'pads-wave__head' }, [
        h('span', { class: 'label', text: `Deck A · detailed · ${ZOOM_BARS} bars` }),
        pos,
      ]),
      h('div', { class: 'pads-wave__lane' }, [
        h('mdj-waveform', { track: t.id, deck: 'A', mode: 'detailed', position: String(deck.positionSec), zoom: String(ZOOM_BARS), height: land ? '56' : '72', markers: 'cues loops phrases grid', 'no-head': '' }),
        overlay(state, deck, t, spb),
      ]),
      h('p', { class: 'pads-wave__caption body' }, [waveCaption(state, deck, t, spb)]),
    ]);

    // ---- loop controls ----
    const controls = h('mdj-loop-controls', { deck: 'A', length: String(cfg.length), jump: '4', roll: cfg.roll || '1/4', quantized: QUANTIZE, state: cfg.comp, pending: cfg.pending || null, saved: cfg.saved ? '' : null });
    controls.addEventListener('mdj:loop', (e) => {
      const { cmd } = e.detail;
      if (state === 'inactive' && cmd === 'in') return ctx.setState('pending');
      if (state === 'pending' && cmd === 'in') return ctx.setState('inactive'); // second tap before the beat cancels
      if (state === 'pending' && cmd === 'out') return ctx.setState('active-8');
      if ((state === 'active-8' || state === 'edge-of-track') && cmd === 'exit') return ctx.setState('inactive');
      if (cmd === 'jump-size') { controls.setAttribute('jump', String(e.detail.beats)); say(`Beat jump size ${e.detail.beats} beats on deck A (setting, applied).`); return; }
      if (cmd === 'roll') { say(`Loop roll ${e.detail.roll} is press-and-hold: it plays while held and the deck returns to its slip position on release. A tap sends nothing.`); return; }
      if (cmd === 'jump') { say(`Beat jump ${e.detail.beats > 0 ? '+' : ''}${e.detail.beats} beats on deck A: sent, quantized to ${QUANTIZE}. Not acknowledged — no engine exists in this prototype.`); return; }
      say(`${cmd === 'half' ? 'Halve loop' : cmd === 'double' ? 'Double loop' : cmd === 'reloop' ? 'Reloop' : cmd} on deck A: sent, waiting for ${QUANTIZE}. Not acknowledged — no engine exists in this prototype.`);
    });

    // ---- state lead ----
    const lead = leadFor(ctx, state, deck, t, spb);

    // ---- saved loops ----
    const saved = savedLoops(ctx, state, t, say);

    if (land) {
      root().append(
        padsNav(ctx, 'pads/loops'),
        h('div', { class: 'pads-loops__cols' }, [
          h('div', { class: 'pads-loops__col' }, [wave, lead, saved]),
          h('div', { class: 'pads-loops__col' }, [controls, note]),
        ]),
      );
    } else {
      root().append(padsNav(ctx, 'pads/loops'), line, wave, lead, note, controls, saved);
    }
    return root();

    function root() { return root.el ||= h('div', { class: `pads-screen pads-loops pads-loops--${land ? 'landscape' : 'portrait'}`, dataset: { state } }); }
  },
});

// Loop band / pending in-point / track end, positioned against the 32-beat window (playhead at 50 %).
function overlay(state, deck, t, spb) {
  const box = h('div', { class: 'pads-wave__overlay', 'aria-hidden': 'true' });
  const at = (beatsFromPlayhead) => 50 + (beatsFromPlayhead / BEATS_IN_VIEW) * 100;
  const band = (from, beats, text, cls = '') => {
    const left = Math.max(0, at(from)), right = Math.min(100, at(from + beats));
    box.appendChild(h('span', { class: `pads-wave__band ${cls}`.trim(), style: { left: `${left}%`, width: `${Math.max(0.8, right - left)}%` } }, [h('span', { class: 'pads-wave__tag label', text })]));
  };
  if (state === 'pending') {
    box.appendChild(h('span', { class: 'pads-wave__in', style: { left: `${at(0.4)}%` } }, [h('span', { class: 'pads-wave__tag label', text: 'In · next beat' })]));
  } else if (state === 'active-8') band(-1, 8, 'Loop 8 beats');
  else if (state === 'roll') band(0, 0.25, 'Roll 1/4', 'pads-wave__band--roll');
  else if (state === 'edge-of-track') {
    const endBeats = (t.durationSec - deck.positionSec) / spb;
    band(0, 11, 'Loop 11 · clamped', 'pads-wave__band--clamped');
    box.appendChild(h('span', { class: 'pads-wave__end', style: { left: `${Math.min(99.5, at(endBeats))}%` } }, [h('span', { class: 'pads-wave__tag label', text: 'Track end' })]));
  }
  return box;
}

function waveCaption(state, deck, t, spb) {
  const p = deck.positionSec;
  switch (state) {
    case 'pending': return `Loop in admitted at ${fmt.time(p)}: it lands on the next beat (${QUANTIZE}). Nothing is looping yet.`;
    case 'active-8': return `Looping 8 beats: ${clock(p - spb)} – ${clock(p - spb + 8 * spb)} (${(8 * spb).toFixed(2)} s at ${t.bpm.toFixed(1)} BPM).`;
    case 'roll': return `Rolling 1/4 beat from ${clock(p)}. Release returns to ${clock(p + 0.5 * spb)}, where the track would be now (slip).`;
    case 'edge-of-track': return `Loop ${clock(p)} – ${clock(p + 11 * spb)}; the track ends at ${clock(t.durationSec)}.`;
    default: return `Playhead ${clock(p)} at the centre. No loop on deck A.`;
  }
}
function clock(sec) { const m = Math.floor(sec / 60); const s = sec - m * 60; return `${m}:${s.toFixed(1).padStart(4, '0')}`; }

function leadFor(ctx, state, deck, t, spb) {
  const L = (tone, shape, eyebrow, title, body, extra = []) => h('section', { class: `pads-lead raised pads-lead--${tone}`, 'aria-labelledby': 'pads-loops-lead' }, [
    h('p', { class: 'pads-eyebrow label' }, [h('span', { class: `pads-shape pads-shape--${shape}`, 'aria-hidden': 'true' }), h('span', { text: eyebrow })]),
    h('h2', { id: 'pads-loops-lead', class: 'pads-lead__title title', text: title }),
    ...body.map((b) => h('p', { class: 'body', text: b })),
    ...extra,
  ]);
  switch (state) {
    case 'pending': return L('info', 'ring', 'Pending · Q 1 beat', 'Loop in waits for the next beat.', ['Then tap Loop out to close the loop, or tap Loop in again to cancel before the beat.'], [fixtureLine('Pending is a fixture state: no engine scheduled anything.')]);
    case 'active-8': return L('ok', 'full', 'Looping', '8-beat loop active on deck A.', ['½ and ×2 change the length from the loop in point. Exit returns to normal playback; the loop stays saved for Reloop.']);
    case 'roll': return L('info', 'half', 'Roll · held', 'Loop roll 1/4 — held, slip on.', ['The deck keeps a shadow position while the roll repeats. Releasing returns to where the track would have been, on the beat.', 'Pointer cancel, rotation or route loss release the roll the same way.']);
    case 'saved-loops': return L('neutral', 'full', 'Saved loops', `${(padsData().savedLoops[t.id] || []).length} loops saved for ${t.title}.`, ['Recall jumps to the loop in point on the next beat and engages the loop. Prepared loops come from track preparation; loops saved in this set can be renamed there.']);
    case 'edge-of-track': return L('warning', 'question', 'Clamped', 'Loop out beyond track end — clamped.', [`You asked for 16 beats from ${clock(deck.positionSec)}, but ${t.title} ends at ${clock(t.durationSec)}. The loop out point was clamped to the last whole beat before the end: 11 beats.`, 'No audio past the end is read. Exit, or halve the loop to keep it musical.']);
    default: return L('neutral', 'ring', 'No loop', 'No loop on deck A.', ['Loop in starts a loop on the next beat. Reloop recalls the last 8-beat loop.'], [h('div', { class: 'pads-lead__row' }, [button({ label: 'Saved loops', icon: 'list', fr: ['FR-018'], cls: 'btn--secondary', attrs: { 'aria-label': 'Show saved loops, deck A' }, on: { click: () => ctx.setState('saved-loops') } })])]);
  }
}

function savedLoops(ctx, state, t, say) {
  const list = padsData().savedLoops[t.id] || [];
  const open = state === 'saved-loops';
  const spb = 60 / t.bpm;
  return h('section', { class: `pads-panel raised pads-saved${open ? ' pads-saved--open' : ''}`, 'aria-labelledby': 'pads-saved-title' }, [
    h('div', { class: 'pads-panel__head' }, [
      h('h3', { id: 'pads-saved-title', class: 'label', text: `Saved loops · deck A · ${list.length}` }),
      state === 'active-8' ? button({ label: 'Save loop', icon: 'save', fr: ['FR-018'], cls: 'btn--secondary', attrs: { 'aria-label': 'Save current loop, deck A' }, on: { click: () => say('Save loop sent: the 8-beat loop would be stored with this track. Not acknowledged — no engine or store in this prototype.') } }) : null,
    ]),
    h('ul', { class: 'pads-saved__list', role: 'list' }, list.map((l) => h('li', { class: 'pads-saved__row' }, [
      h('span', { class: 'pads-saved__mark', 'aria-hidden': 'true' }, [icon('loop', { size: 14 })]),
      h('span', { class: 'pads-saved__text' }, [
        h('span', { class: 'pads-saved__name body', text: l.name }),
        h('span', { class: 'pads-saved__meta numeral', text: `${clock(l.inSec)} · ${l.beats} beats · ${(l.beats * spb).toFixed(2)} s` }),
        h('span', { class: 'pads-saved__src label', text: l.source }),
      ]),
      h('button', { type: 'button', class: 'btn btn--secondary pads-saved__recall', dataset: { hit: '48', fr: 'FR-018' }, 'aria-label': `Recall saved loop ${l.name}, deck A`, on: { click: () => say(`Recall ${l.name}: sent, waiting for ${QUANTIZE}. Not acknowledged — no engine exists in this prototype.`) } }, [icon('reloop', { size: 16 }), h('span', { class: 'btn-label', text: 'Recall' })]),
    ]))),
  ]);
}

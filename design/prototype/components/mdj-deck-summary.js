// <mdj-deck-summary deck="A" track="aurora" size="compact|full" position="92" pitch="0" sync keylock loop="8" slip
//                   analysis="complete|pending|uncertain" state="empty|loading|ready|playing|paused|missing">
//
// Engine binding: READ-ONLY. Title, artist, BPM and key come from the preparation store for the loaded
// track (fixtures.track); position, pitch, sync, key lock, loop and slip come from the engine snapshot
// for the deck (acknowledged values only — a sent-but-unacknowledged change is never shown here; the
// control that sent it carries the SENT badge). The embedded <mdj-time-display> is the only control
// (its tap toggles elapsed / remaining; FR-010). No EngineCommand leaves this component.
// Units / range: position seconds 0..durationSec; pitch percent −100..+100 (the pitched BPM =
// bpm × (1 + pitch/100) is the leading numeral when pitch ≠ 0, with the original BPM and the pitch in
// the secondary line; FR-015); loop in bars (printed "Loop 8"); key in the track's notation.
// Layout: full = title wrap-2, artist truncate, BPM / key / time readouts, flags row (Sync, Key lock,
// Loop, Slip as text + icon chips, on / off distinguished by border style and the word "off" in the
// name, never by colour alone), analysis status line. compact = one wrapping row for lane headers:
// title truncate, BPM, key, time, only the ON flags, the analysis line only when it needs attention.
// The 'longtitle' fixture must not break either size at 200 % font scale (rows wrap, text clamps).
// Deck identity: letter chip + "Deck A" in every accessible name; colour is secondary.
// Pending vs acknowledged: the state word (Playing / Paused / Ready / Loading / Empty / Missing) is the
// acknowledged deck state with an icon; "Loading" means the engine has not acknowledged the load.
// Cancellation: n/a. Accessible: region "Deck A summary: AURORA DRIVE by Nyx Meridian, playing,
// 124.0 BPM, key 8A, sync on, key lock on, loop 8 bars, analysis complete".
import { MdjElement, define, h, icon, fmt } from './base.js';
import { fixtures } from '../app/fixtures.js';
import { iconId } from './mdj-marker.js';

const STATES = ['empty', 'loading', 'ready', 'playing', 'paused', 'missing'];
const STATE_TEXT = { empty: 'Empty', loading: 'Loading', ready: 'Ready', playing: 'Playing', paused: 'Paused', missing: 'Missing file' };
const STATE_ICON = { empty: 'plus', loading: 'loader', ready: 'check', playing: 'play', paused: 'pause', missing: 'warning' };

export class MdjDeckSummary extends MdjElement {
  static tag = 'mdj-deck-summary';
  static states = STATES;
  static fr = ['FR-010', 'FR-015', 'FR-016', 'FR-006'];
  static hit = 0;
  static fixture = false;
  static observed = ['deck', 'track', 'size', 'position', 'pitch', 'sync', 'keylock', 'loop', 'slip', 'analysis'];
  static samples = {
    default: { deck: 'A', track: 'aurora', position: 92, pitch: 0, keylock: true, style: 'width:100%' },
    variants: [{ size: 'full' }, { size: 'compact' }],
    empty: { track: '' },
    loading: { track: 'glasswork', deck: 'B', position: 0 },
    ready: { track: 'copper', deck: 'B', position: 15.48, sync: true, loop: 4 },
    playing: { track: 'longtitle', deck: 'C', position: 298, pitch: 2.4, sync: true, slip: true, loop: 8 },
    paused: { track: 'tide', deck: 'D', position: 150, pitch: -1.2 },
    missing: { track: 'brass', deck: 'A', position: 24.5 },
  };

  render() {
    const deck = this.attr('deck', 'A').toUpperCase();
    const id = this.attr('track', '');
    const track = id ? fixtures.track(id) : null;
    const size = this.attr('size', 'full') === 'compact' ? 'compact' : 'full';
    let state = this.hasAttribute('state') ? this.getAttribute('state') : null;
    if (!state) state = !track ? 'empty' : track.availability === 'missing' ? 'missing' : track.analysis === 'pending' ? 'loading' : 'ready';
    if (!STATES.includes(state)) state = 'ready';
    if (!track && state !== 'loading') state = 'empty';
    const duration = track?.durationSec || 0;
    const position = Math.min(duration, Math.max(0, this.num('position', 0)));
    const pitch = this.num('pitch', 0);
    const sync = this.bool('sync'), keylock = this.bool('keylock'), slip = this.bool('slip');
    const loop = this.hasAttribute('loop') && this.getAttribute('loop') !== 'false' && this.getAttribute('loop') !== '' ? this.attr('loop') : null;
    const analysisAttr = this.attr('analysis', '');
    const analysis = ['complete', 'pending', 'uncertain'].includes(analysisAttr) ? analysisAttr : !track ? 'complete' : track.analysis === 'pending' ? 'pending' : track.gridConfidence === 'low' ? 'uncertain' : 'complete';
    this.className = `deck-summary deck-summary--${size} deck-summary--${state} deck-${deck.toLowerCase()}`;
    const hasTrack = !!track;
    const bpm = track?.bpm ?? null;
    const pitched = bpm != null && pitch !== 0 ? bpm * (1 + pitch / 100) : bpm;
    const pitchText = `${pitch > 0 ? '+' : pitch < 0 ? '−' : ''}${Math.abs(pitch).toFixed(1)} %`;
    const remaining = Math.max(0, duration - position);

    // identity
    const head = h('div', { class: 'deck-summary__head' }, [
      h('span', { class: 'deck-summary__letter numeral', text: deck, 'aria-hidden': 'true' }),
      h('div', { class: 'deck-summary__id' }, [
        h('span', { class: `deck-summary__title title ${size === 'full' ? 'wrap-2' : 'truncate'}`, text: hasTrack ? track.title : state === 'loading' ? 'Loading…' : 'No track loaded' }),
        hasTrack ? h('span', { class: 'deck-summary__artist truncate', text: track.artist }) : h('span', { class: 'deck-summary__artist truncate', text: state === 'loading' ? 'Waiting for the engine' : 'Load a track from the library' }),
      ]),
      h('span', { class: `deck-summary__state label deck-summary__state--${state}` }, [icon(STATE_ICON[state], { size: 12, cls: state === 'loading' ? 'deck-summary__spin' : '' }), h('span', { text: STATE_TEXT[state] })]),
    ]);

    // readouts: BPM (pitched when pitch ≠ 0), key, time
    const readouts = h('div', { class: 'deck-summary__readouts' }, [
      h('span', { class: 'deck-summary__readout ink-backing' }, [
        h('span', { class: 'deck-summary__rl label', text: 'BPM' }),
        h('span', { class: 'deck-summary__big numeral', text: hasTrack ? fmt.bpm(pitched) : '—' }),
        hasTrack && pitch !== 0 ? h('span', { class: 'deck-summary__sub numeral', text: `${fmt.bpm(bpm)} orig · ${pitchText}` }) : (hasTrack && size === 'full' ? h('span', { class: 'deck-summary__sub numeral', text: 'pitch 0.0 %' }) : null),
      ]),
      h('span', { class: 'deck-summary__readout ink-backing' }, [
        h('span', { class: 'deck-summary__rl label', text: 'Key' }),
        h('span', { class: 'deck-summary__big numeral', text: hasTrack ? track.key : '—' }),
        hasTrack && size === 'full' ? h('span', { class: 'deck-summary__sub numeral', text: keylock ? 'locked' : pitch !== 0 ? 'shifts with pitch' : 'unlocked' }) : null,
      ]),
      h('mdj-time-display', { deck, elapsed: hasTrack ? position : null, remaining: hasTrack ? remaining : null, mode: 'elapsed', size: size === 'compact' ? 'sm' : 'md', secondary: size === 'full' ? true : null, state: hasTrack ? 'idle' : 'unknown' }),
    ]);

    // flags
    const flags = h('div', { class: 'deck-summary__flags', role: 'list', 'aria-label': `Deck ${deck} flags` });
    const flag = (on, ic, text, nameOff) => {
      if (size === 'compact' && !on) return;
      flags.appendChild(h('span', { class: `deck-summary__flag label ${on ? 'deck-summary__flag--on' : 'deck-summary__flag--off'}`, role: 'listitem', 'aria-label': `${text} ${on ? 'on' : nameOff || 'off'}` }, [
        icon(ic, { size: 12 }), h('span', { text }), on ? null : h('span', { class: 'deck-summary__flag-off', text: 'off' }),
      ]));
    };
    if (hasTrack) {
      flag(sync, 'sync', 'Sync');
      flag(keylock, 'keylock', 'Key lock');
      flag(!!loop, 'loop', loop ? `Loop ${loop}` : 'Loop');
      flag(slip, 'slip', 'Slip');
    }

    // analysis status line
    let aIcon = 'check', aText = '', aTone = '';
    if (state === 'missing') { aIcon = 'warning'; aText = `File missing · ${track.missingNote || 'cues and crate entries are preserved'}`; aTone = 'tone-critical'; }
    else if (!hasTrack) { aText = ''; }
    else if (analysis === 'pending') { aIcon = iconId('analysis-pending', 'loader'); aText = 'Analysis pending · progress unknown · plays without grid'; aTone = 'tone-info'; }
    else if (analysis === 'uncertain') { aIcon = iconId('grid-uncertain', 'warning'); aText = `Grid uncertain · ${track.gridNote ? 'review in preparation' : 'low confidence'}`; aTone = 'tone-warning'; }
    else { aIcon = track.gridLocked ? iconId('grid-locked', 'lock') : 'check'; aText = `Analysis complete · grid ${track.gridConfidence || 'unknown'}${track.gridLocked ? ' · locked' : ''}`; aTone = 'tone-ok'; }
    const showAnalysis = aText && (size === 'full' || analysis !== 'complete' || state === 'missing');
    const analysisEl = showAnalysis ? h('div', { class: `deck-summary__analysis ${aTone}` }, [icon(aIcon, { size: 12, cls: analysis === 'pending' && state !== 'missing' ? 'deck-summary__spin' : '' }), h('span', { text: aText })]) : null;

    const parts = [`Deck ${deck} summary`];
    if (!hasTrack) parts.push(state === 'loading' ? 'loading' : 'empty, load a track');
    else {
      parts.push(`${track.title} by ${track.artist}`, STATE_TEXT[state].toLowerCase(), `${fmt.bpm(pitched)} BPM${pitch !== 0 ? ` (${fmt.bpm(bpm)} at ${pitchText})` : ''}`, `key ${track.key}`);
      parts.push(`sync ${sync ? 'on' : 'off'}`, `key lock ${keylock ? 'on' : 'off'}`, loop ? `loop ${loop} bars` : 'no loop', slip ? 'slip on' : 'slip off');
      if (aText) parts.push(aText.replace(/ · /g, ', '));
    }
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', `${parts[0]}: ${parts.slice(1).join(', ')}`);
    this.replaceChildren(...[head, readouts, flags, analysisEl].filter(Boolean));
  }
}
define(MdjDeckSummary);

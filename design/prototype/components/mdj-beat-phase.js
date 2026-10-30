// <mdj-beat-phase deck="A" beat="3" bar="17" phase="0.12" leader="B" state="idle|synced|drifting|no-grid">
//
// Engine binding: READ-ONLY. Beat, bar and phase come from the engine snapshot's grid position for the
// deck (sample-clock derived, FR-016 "visible leader/follower and phase state"); the component sends no
// command. The leader letter is the sync leader deck id (`leader="self"` when this deck leads). Every
// value drawn here is a FIXTURE in the prototype (mark mandatory).
// Units / range: beat 1..4 within the bar (4/4 assumed by the fixture grids); bar ≥ 1 (the numeral) ;
// phase −0.5..+0.5 beats relative to the leader's beat (0 = aligned, + = this deck is late, − = early).
// Shape and words carry meaning: the current beat dot is filled and beat 1 carries a brass index tick;
// the phase rail has an ink centre mark and the offset marker; the state word (SYNCED / DRIFT +0.12 /
// NO GRID / FREE) is printed, so colour never carries meaning alone.
// Gesture: none (hit 0). Pending vs acknowledged: n/a — it only reflects acknowledged engine state.
// States: idle = manual, no sync (rail neutral, "Free") · synced = |phase| ≤ 0.05 (marker at the centre)
// · drifting = sync on and |phase| > 0.05 (warning word with the signed offset) · no-grid = the track
// has no usable grid (hollow dots, "—" bar, rail disabled; FR-016: an invalid grid cannot be synced).
// Cancellation: n/a. Accessible: role=img "Beat phase, deck A: beat 3 of 4, bar 17, 0.12 beat late
// against leader B, drifting".
import { MdjElement, define, h, icon } from './base.js';
import { iconId } from './mdj-marker.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export class MdjBeatPhase extends MdjElement {
  static tag = 'mdj-beat-phase';
  static states = ['idle', 'synced', 'drifting', 'no-grid'];
  static fr = ['FR-016'];
  static hit = 0;
  static fixture = true;
  static observed = ['deck', 'beat', 'bar', 'phase', 'leader'];
  static samples = {
    default: { deck: 'A', beat: 3, bar: 17, phase: 0, leader: 'B' },
    variants: [{}],
    idle: { leader: null, phase: 0.2 },
    synced: { phase: 0.02 },
    drifting: { phase: 0.18, deck: 'B', leader: 'A' },
    'no-grid': { bar: null, beat: null, phase: null, deck: 'D' },
  };

  render() {
    const deck = this.attr('deck', '').toUpperCase();
    const state = MdjBeatPhase.states.includes(this.state) ? this.state : 'idle';
    const noGrid = state === 'no-grid';
    const beat = noGrid ? null : clamp(Math.round(this.num('beat', 1)), 1, 4);
    const bar = noGrid || !this.hasAttribute('bar') ? null : Math.max(1, Math.round(this.num('bar', 1)));
    const phase = noGrid ? null : clamp(this.num('phase', 0), -0.5, 0.5);
    const leaderAttr = this.attr('leader', '');
    const leader = leaderAttr ? leaderAttr.toUpperCase() : null;
    const self = leader === 'SELF';
    this.className = `beat-phase beat-phase--${state}${deck ? ` deck-${deck.toLowerCase()}` : ' deck-none'}`;
    const signed = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}`;
    const word = noGrid ? 'No grid' : state === 'synced' ? 'Synced' : state === 'drifting' ? `Drift ${signed(phase)}` : 'Free';
    const leaderText = noGrid ? '' : self ? 'Leader' : leader ? `Leader ${leader}` : 'No leader';
    const name = noGrid
      ? `Beat phase, deck ${deck}: no usable grid, sync unavailable`
      : `Beat phase, deck ${deck}: beat ${beat} of 4, bar ${bar ?? 'unknown'}, ${phase === 0 ? 'aligned' : `${Math.abs(phase).toFixed(2)} beat ${phase > 0 ? 'late' : 'early'}`}${self ? ', this deck leads' : leader ? ` against leader ${leader}` : ', no leader'}, ${word.toLowerCase()}`;

    const dots = h('span', { class: 'beat-phase__dots' });
    for (let i = 1; i <= 4; i++) {
      dots.appendChild(h('span', { class: `beat-phase__dot${beat === i ? ' beat-phase__dot--on' : ''}${i === 1 ? ' beat-phase__dot--one' : ''}` }, [i === 1 ? h('span', { class: 'beat-phase__index brass' }) : null]));
    }
    const barEl = h('span', { class: 'beat-phase__bar ink-backing' }, [
      h('span', { class: 'beat-phase__bar-label label', text: 'Bar' }),
      h('span', { class: 'beat-phase__bar-n numeral', text: bar == null ? '—' : String(bar) }),
    ]);
    const wordEl = h('span', { class: `beat-phase__word label${state === 'drifting' ? ' tone-warning' : state === 'synced' ? ' beat-phase__word--synced' : noGrid ? ' tone-critical' : ' tone-neutral'}` }, [
      icon(noGrid ? 'warning' : state === 'idle' ? 'hand' : iconId('phase', 'sync'), { size: 11 }), h('span', { text: word }),
    ]);
    const leaderEl = leaderText ? h('span', { class: 'beat-phase__leader label' }, [icon('sync', { size: 11 }), h('span', { text: leaderText })]) : null;
    const row = h('div', { class: 'beat-phase__row' }, [dots, barEl, wordEl, leaderEl]);

    const p = phase == null ? 0.5 : 0.5 + phase;
    const rail = h('div', { class: 'beat-phase__rail sunken', style: { '--p': String(p) } }, [
      h('span', { class: 'beat-phase__centre index-mark' }),
      h('span', { class: 'beat-phase__fill', style: { left: `${Math.min(50, p * 100)}%`, width: `${Math.abs(p - 0.5) * 100}%` } }),
      h('span', { class: 'beat-phase__marker' }),
    ]);
    const scale = h('div', { class: 'beat-phase__scale numeral' }, [h('span', { text: '−½' }), h('span', { text: 'early · 0 · late' }), h('span', { text: '+½' })]);
    const wrap = h('div', { class: 'beat-phase__wrap', role: 'img', 'aria-label': name }, [row, rail, scale]);
    this.replaceChildren(wrap);
  }
}
define(MdjBeatPhase);

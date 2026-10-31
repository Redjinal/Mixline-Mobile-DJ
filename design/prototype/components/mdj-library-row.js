// <mdj-library-row track="aurora" selected deck-focus="A" playing-on="A" loading-to="B" decks="A,B,C,D"
//                  occupied="A" audible="A" art-state="placeholder|loading|cached" played
//                  state="ready|missing|permission|unsupported|pending|selected|loading|downloaded|demo|duplicate">
//
// One library result (Document 03 §3 "Live browsing"; Document 04 §4 library row). A TAP SELECTS, IT DOES
// NOT LOAD: the row body is role=option (aria-selected) and the Load control is a separate
// <mdj-load-target> rendered only while the row is selected, so the destination (Load A / B / C / D) is a
// deliberate choice and an audible occupied deck is printed "Playing — protected" (FR-035).
// Engine binding: none from the row itself (selection is UI state); the load buttons belong to
// mdj-load-target. BPM, key and duration come from the preparation store (fixtures.track) and are
// ANALYSIS VALUES → the row carries a FIXTURE mark. Analysis pending or impossible prints "—", never a
// guessed BPM.
// Units / range: BPM ×.1, key in the track's notation, duration m:ss, rating 0–5 (printed as stars AND
// "Rating 4 of 5"), played count. Colour tag = shape + colour + spoken name; explicit = boxed "E";
// duplicate, downloaded and demo are printed words with icons. State is derived from the fixture unless
// `state` is set: missing / permission / unsupported / pending / downloaded / demo / duplicate / ready.
//   selected — raised, brass index bar, title wraps to two lines, load target below (A–D, 48 dp each)
//   loading  — a load was SENT to `loading-to` and the engine has not acknowledged it (printed SENT)
// Gesture: tap, or Enter / Space, selects (mdj:select { trackId, selected }). No long-press action.
// Pending vs acknowledged: see loading; "Playing on A" is acknowledged deck state from the session.
// Cancellation: n/a. Accessible: option "AURORA DRIVE by Nyx Meridian, 124.0 BPM, key 8A, 6:12, ready,
// rating 4 of 5, played 3 times, colour cyan". The `longtitle` fixture stays readable at 200 % font scale
// (truncate when idle, wrap-2 when selected; the numerals column keeps its width).
import { MdjElement, define, h, icon, fmt } from './base.js';
import { fixtures } from '../app/fixtures.js';
import { AVAILABILITY, availabilityOf } from './mdj-chip.js';
import { cueColorVar, iconId } from './mdj-marker.js';
import './mdj-art.js';
import './mdj-load-target.js';

const STATES = ['ready', 'missing', 'permission', 'unsupported', 'pending', 'selected', 'loading', 'downloaded', 'demo', 'duplicate'];
const LOADABLE = new Set(['ready', 'downloaded', 'demo', 'duplicate']);

export class MdjLibraryRow extends MdjElement {
  static tag = 'mdj-library-row';
  static states = STATES;
  static fr = ['FR-004', 'FR-005', 'FR-010', 'FR-035', 'FR-036'];
  static hit = 48;
  static fixture = true;
  static observed = ['track', 'selected', 'deck-focus', 'playing-on', 'loading-to', 'decks', 'occupied', 'audible', 'art-state', 'played'];
  static samples = {
    default: { track: 'aurora', 'deck-focus': 'A', decks: 'A,B,C,D', occupied: 'A', audible: 'A', style: 'width:100%' },
    variants: [{}],
    ready: { track: 'aurora', 'art-state': 'cached' },
    missing: { track: 'brass' },
    permission: { track: 'velvet' },
    unsupported: { track: 'zinc' },
    pending: { track: 'glasswork' },
    selected: { track: 'aurora', selected: true, 'playing-on': 'A' },
    loading: { track: 'longtitle', 'loading-to': 'B' },
    downloaded: { track: 'soda-radio' },
    demo: { track: 'demo-1' },
    duplicate: { track: 'north-dup' },
  };

  render() {
    const id = this.attr('track', '');
    const track = id ? fixtures.track(id) : null;
    const given = this.getAttribute('state');
    const selected = this.bool('selected') || given === 'selected';
    let avail = availabilityOf(track);
    if (avail === 'discovered') avail = 'missing'; // a catalogue match is not a file in the library
    if (avail === 'loading') avail = 'ready';
    const state = given && STATES.includes(given) ? given : (selected ? 'selected' : avail);
    const focus = this.attr('deck-focus', '').toUpperCase();
    const playingOn = this.attr('playing-on', '').toUpperCase();
    const loadingTo = this.attr('loading-to', '').toUpperCase();
    const artState = this.attr('art-state', 'placeholder');
    this.className = `library-row library-row--${state}${selected ? ' library-row--selected' : ''}${focus ? ` deck-${focus.toLowerCase()}` : ''}`;
    delete this.dataset.hit; // the option body and the load buttons are the targets

    const title = track?.title || 'Unknown track';
    const artist = track ? `${track.artist}${track.album ? ' · ' + track.album : ''}` : 'Not in the library';
    const analysed = !!track && track.analysis === 'complete';
    const bpm = analysed ? fmt.bpm(track.bpm) : '—';
    const key = analysed ? track.key : '—';
    const time = track ? fmt.time(track.durationSec) : '—';
    const chipKey = (state === 'selected' || state === 'loading') ? avail : state;
    const chipVal = AVAILABILITY[chipKey] ? chipKey : 'ready';

    // Flags: availability chip, colour tag, rating, explicit, played, grid lock, playing-on deck.
    const flags = h('div', { class: 'library-row__flags' });
    flags.appendChild(h('mdj-chip', { kind: 'availability', value: chipVal, size: 'sm' }));
    if (track?.color) {
      const tag = h('span', { class: 'library-row__color', role: 'img', 'aria-label': `Colour tag ${track.color}` }, [h('span', { class: 'library-row__color-dot' })]);
      tag.style.setProperty('--tag', cueColorVar(track.color));
      flags.appendChild(tag);
    }
    if (track && track.rating > 0) flags.appendChild(h('span', { class: 'library-row__rating numeral', role: 'img', 'aria-label': `Rating ${track.rating} of 5`, text: '★'.repeat(track.rating) + '☆'.repeat(5 - track.rating) }));
    if (track?.explicit) flags.appendChild(h('span', { class: 'library-row__flag library-row__flag--explicit label', role: 'img', 'aria-label': 'Explicit', text: 'E' }));
    if ((track?.playedCount || 0) > 0 || this.bool('played')) flags.appendChild(h('span', { class: 'library-row__flag label' }, [icon('clock', { size: 11 }), h('span', { text: `Played ×${track?.playedCount || 1}` })]));
    if (track?.gridLocked) flags.appendChild(h('span', { class: 'library-row__flag label' }, [icon(iconId('grid-locked', 'lock'), { size: 11 }), h('span', { text: 'Grid locked' })]));
    if (playingOn) flags.appendChild(h('span', { class: `library-row__deck deck-${playingOn.toLowerCase()}` }, [icon('play', { size: 11 }), h('span', { class: 'label label-strong', text: `Playing on ${playingOn}` })]));

    // Status line for states that need an explanation and a next action.
    let status = null;
    const st = (tone, ic, text, extra = null) => h('div', { class: `library-row__status tone-${tone}` }, [icon(ic, { size: 12 }), h('span', { text }), extra]);
    if (state === 'missing') status = st('critical', 'unavailable', track?.missingNote || 'File moved or deleted. Cues and crate entries are preserved.');
    else if (state === 'permission') status = st('warning', iconId('permission', 'lock'), track?.missingNote || 'Folder access was revoked. Grant access again to restore this track.');
    else if (state === 'unsupported') status = st('critical', 'warning', track?.missingNote || 'Unsupported format. This file cannot be decoded.');
    else if (state === 'pending') status = st('info', iconId('analysis-pending', 'loader'), 'Analysis pending · progress unknown · plays without a grid');
    else if (state === 'loading') status = st('info', 'loader', `Loading to Deck ${loadingTo || '?'} · sent, waiting for the engine`, h('span', { class: 'library-row__sent', text: 'SENT', 'aria-hidden': 'true' }));
    else if (state === 'downloaded') status = st('info', 'download', `Downloaded · actual source ${track?.actualSource || 'unknown'} · requested ${track?.requestedSource || '—'}`);
    else if (state === 'demo') status = st('neutral', 'demo', 'Demo media (fixture) · bundled with the app and clearly labelled');
    else if (state === 'duplicate') status = st('warning', 'duplicate', track?.duplicateNote || 'Same content as another file in the library');

    const nums = h('div', { class: 'library-row__nums ink-backing', 'aria-hidden': 'true' }, [
      h('span', { class: 'library-row__num' }, [h('span', { class: 'numeral', text: bpm }), h('span', { class: 'library-row__unit label', text: 'BPM' })]),
      h('span', { class: 'library-row__num' }, [h('span', { class: 'numeral', text: key }), h('span', { class: 'library-row__unit label', text: 'Key' })]),
      h('span', { class: 'library-row__num' }, [h('span', { class: 'numeral', text: time })]),
    ]);

    const nameParts = [`${title} by ${track?.artist || 'unknown artist'}`, analysed ? `${bpm} BPM, key ${key}` : 'analysis pending', time, AVAILABILITY[chipVal].text.toLowerCase()];
    if (track?.rating) nameParts.push(`rating ${track.rating} of 5`);
    if (track?.playedCount) nameParts.push(`played ${track.playedCount} times`);
    if (track?.color) nameParts.push(`colour ${track.color}`);
    if (track?.explicit) nameParts.push('explicit');
    if (playingOn) nameParts.push(`playing on Deck ${playingOn}`);
    if (state === 'loading') nameParts.push(`loading to Deck ${loadingTo}, sent`);
    const select = () => this.emit('mdj:select', { trackId: id, selected: !selected });
    const main = h('div', {
      class: 'library-row__main', role: 'option', tabindex: 0, 'aria-selected': String(selected), 'aria-label': nameParts.join(', '), dataset: { hit: '48' },
      on: { click: select, keydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); } } },
    }, [
      h('span', { class: 'library-row__bar', 'aria-hidden': 'true' }),
      h('mdj-art', { seed: id || 'none', size: 40, label: title, state: artState }),
      h('div', { class: 'library-row__body' }, [
        h('span', { class: `library-row__title title ${selected ? 'wrap-2' : 'truncate'}`, text: title }),
        h('span', { class: 'library-row__artist truncate', text: artist }),
        flags,
        status,
      ]),
      nums,
    ]);
    const parts = [main];
    if (selected) {
      const loadable = LOADABLE.has(avail);
      parts.push(h('mdj-load-target', {
        decks: this.attr('decks', 'A,B,C,D'), occupied: this.attr('occupied', ''), audible: this.attr('audible', ''), focus, track: id,
        state: loadable ? 'idle' : 'disabled', reason: loadable ? null : AVAILABILITY[chipVal].text,
      }));
    }
    this.replaceChildren(...parts);
  }
}
define(MdjLibraryRow);

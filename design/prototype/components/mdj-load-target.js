// <mdj-load-target decks="A,B,C,D" occupied="A,B" audible="A" pending="B" loaded="" focus="A" track="copper"
//                  reason="File missing" compact state="idle|pending|acknowledged|protected|disabled">
//
// The deliberate destination control (Document 03 §3 "Live browsing": a tap on a row selects, it does not
// load; Load A / B / C / D is a separate, explicit choice). Rendered by <mdj-library-row> while a row is
// selected and by the confirm sheet; screens may also place it on its own.
// Engine binding: each button issues EngineCommand(load, { deck, trackId, deckGeneration }). The button
// prints the ACKNOWLEDGED outcome only: `pending="B"` marks the deck whose load was SENT and not yet
// acknowledged (dashed deck-coloured border, the printed word SENT); `loaded="B"` marks the acknowledged
// load (solid deck border, the printed word LOADED, check icon). Nothing animates to imply success.
// Protection (FR-035): a deck listed in `audible` is PROTECTED — its button stays reachable but prints
// "Playing — protected" with a lock, and its event carries protected: true, so the screen opens the
// confirm sheet instead of loading. An occupied silent deck prints "Occupied" and may load directly.
// Units / range: deck letters A–D. `focus` marks the focused deck with an ink index mark (a hint, never an
// implicit default destination). `reason` (state=disabled) says why nothing can be loaded.
// Gesture: tap. Pending vs acknowledged: SENT vs LOADED as above. Cancellation: a sent load cannot be
// cancelled from here; route loss or a deck change leaves the SENT mark until the engine answers.
// Accessible: group "Load COPPER SKY to a deck"; buttons "Load COPPER SKY to Deck A, playing, protected".
import { MdjElement, define, h, icon } from './base.js';
import { fixtures } from '../app/fixtures.js';

const LETTERS = ['A', 'B', 'C', 'D'];
const list = (v) => String(v || '').split(',').map((x) => x.trim().toUpperCase()).filter((x) => LETTERS.includes(x));

export class MdjLoadTarget extends MdjElement {
  static tag = 'mdj-load-target';
  static states = ['idle', 'pending', 'acknowledged', 'protected', 'disabled'];
  static fr = ['FR-010', 'FR-035'];
  static hit = 48;
  static fixture = false;
  static observed = ['decks', 'occupied', 'audible', 'pending', 'loaded', 'focus', 'track', 'title', 'reason', 'compact'];
  static samples = {
    default: { decks: 'A,B,C,D', occupied: 'A,B', audible: 'A', focus: 'A', track: 'copper', style: 'width:100%' },
    variants: [{}, { decks: 'A,B', compact: true, style: 'width:auto' }],
    pending: { pending: 'B' },
    acknowledged: { loaded: 'B' },
    protected: { audible: 'A,B' },
    disabled: { track: 'brass', reason: 'File missing' },
  };

  render() {
    const decks = list(this.attr('decks', 'A,B'));
    const occupied = new Set(list(this.attr('occupied', '')));
    const audible = new Set(list(this.attr('audible', '')));
    const pending = this.attr('pending', '').toUpperCase();
    const loaded = this.attr('loaded', '').toUpperCase();
    const focus = this.attr('focus', '').toUpperCase();
    const trackId = this.attr('track', '');
    const track = trackId ? fixtures.track(trackId) : null;
    const title = track?.title || this.attr('title', 'this track');
    const reason = this.attr('reason', '');
    const compact = this.bool('compact');
    const state = this.state;
    const disabled = state === 'disabled';
    this.className = `load-target load-target--${state}${compact ? ' load-target--compact' : ''}`;
    delete this.dataset.hit; // the deck buttons are the targets

    const group = h('div', { class: 'load-target__group', role: 'group', 'aria-label': `Load ${title} to a deck` });
    for (const d of decks) {
      const isAudible = audible.has(d);
      const isOcc = occupied.has(d) || isAudible;
      const isPending = state === 'pending' && pending === d;
      const isLoaded = state === 'acknowledged' && loaded === d;
      const prot = isAudible && !isLoaded && !isPending;
      let note = 'Empty', noteIcon = 'plus', mod = 'empty';
      if (isLoaded) { note = 'Loaded'; noteIcon = 'check'; mod = 'loaded'; }
      else if (isPending) { note = 'Sent · waiting'; noteIcon = 'loader'; mod = 'pending'; }
      else if (prot) { note = 'Playing — protected'; noteIcon = 'lock'; mod = 'protected'; }
      else if (isOcc) { note = 'Occupied'; noteIcon = 'pause'; mod = 'occupied'; }
      if (disabled) { note = reason || 'Unavailable'; noteIcon = 'unavailable'; mod = 'disabled'; }
      const why = isLoaded ? ', loaded' : isPending ? ', sent, waiting for the engine' : prot ? ', playing, protected: asks for confirmation' : isOcc ? ', occupied' : ', empty';
      const name = `Load ${title} to Deck ${d}${why}${disabled ? `, unavailable: ${reason || 'cannot load'}` : ''}`;
      // SENT / LOADED are printed words (never colour alone). Full size: a stamp on the button's top edge;
      // compact: printed inline after the verb so a 48 dp dock row stays 48 dp.
      const stampCls = compact ? ' load-target__badge--inline' : '';
      const sent = isPending ? h('span', { class: `load-target__badge load-target__badge--sent${stampCls}`, text: 'SENT', 'aria-hidden': 'true' }) : null;
      const loadedStamp = isLoaded ? h('span', { class: `load-target__badge load-target__badge--loaded${stampCls}`, text: 'LOADED', 'aria-hidden': 'true' }) : null;
      const btn = h('button', {
        type: 'button', class: `load-target__btn deck-${d.toLowerCase()} load-target__btn--${mod}`, dataset: { hit: '48' },
        'aria-label': name, 'aria-disabled': disabled ? 'true' : undefined,
        on: { click: () => { if (disabled) return; this.emit('mdj:load-request', { deck: d, trackId, protected: prot, occupied: isOcc }); } },
      }, [
        h('span', { class: 'load-target__letter numeral', 'aria-hidden': 'true', text: d }),
        h('span', { class: 'load-target__text' }, [
          h('span', { class: 'load-target__verb', text: 'Load' }),
          compact ? null : h('span', { class: 'load-target__note' }, [icon(noteIcon, { size: 11 }), h('span', { text: note })]),
        ]),
        compact ? sent : null,
        compact ? loadedStamp : null,
        compact ? null : sent,
        compact ? null : loadedStamp,
        prot && !disabled ? h('span', { class: `load-target__badge load-target__badge--protected${stampCls}`, 'aria-hidden': 'true' }, [icon('lock', { size: 9 })]) : null,
        focus === d ? h('span', { class: 'load-target__focus index-mark', 'aria-hidden': 'true' }) : null,
      ]);
      group.appendChild(btn);
    }
    const label = h('span', { class: 'load-target__label label', text: compact ? 'Load' : 'Load to' });
    // The foot line explains the state in full; the compact dock row has no room for it, so there the printed
    // SENT / LOADED stamps and the buttons' accessible names carry the same words.
    let foot = null;
    if (compact) foot = null;
    else if (disabled) foot = h('span', { class: 'load-target__foot tone-critical' }, [icon('unavailable', { size: 12 }), h('span', { text: `Cannot load: ${reason || 'file unavailable'}` })]);
    else if (state === 'pending') foot = h('span', { class: 'load-target__foot tone-info' }, [icon('loader', { size: 12 }), h('span', { text: `Load sent to Deck ${pending || '?'} — waiting for the engine to acknowledge` })]);
    else if (state === 'acknowledged') foot = h('span', { class: 'load-target__foot tone-ok' }, [icon('check', { size: 12 }), h('span', { text: `Deck ${loaded || '?'} acknowledged the load` })]);
    else if (audible.size && !compact) foot = h('span', { class: 'load-target__foot muted' }, [icon('lock', { size: 12 }), h('span', { text: 'A playing deck asks for confirmation before it is replaced.' })]);
    this.replaceChildren(...[label, group, foot].filter(Boolean));
  }
}
define(MdjLoadTarget);

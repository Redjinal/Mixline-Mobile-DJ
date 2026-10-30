// <mdj-transport kind="play|cue|sync|stop" deck="A" state="..." size="56" label="..." no-label>
//
// Engine binding: Play/Cue/Sync/Stop issue EngineCommand(play|cue|sync|stop) carrying the deck
// generation; the visual state reflects the acknowledged engine state, never the tap.
// Units: none. Range: n/a.
// States: idle | playing | paused | held | pending | active | disabled | interrupted
//   held     — finger down (Cue audition while paused; release returns to cue)
//   pending  — quantized command waiting for the next grid point
//   active   — Sync engaged (kind=sync) / Cue selected for headphone (kind=cue + cue-selected)
// kind=stop (FR-010): Stop halts the deck and returns the position to the start of the track
//   (proposed; final semantics follow the engine contract). It uses idle | pending | disabled.
// no-label: label-less variant for slim docks; the accessible name keeps the full label.
// Cancellation: pointer-cancel releases a held Cue safely (returns to cue point);
// a pending command can be cancelled by tapping again before execution.
// Accessible: a single activation maps to one engine action; no duplicate pointer-down + click.
import { MdjElement, define, h, icon } from './base.js';

const ICONS = { play: 'play', cue: 'cue', sync: 'sync', pause: 'pause', stop: 'stop' };
const DEFAULT_LABEL = { play: 'Play', cue: 'Cue', sync: 'Sync', stop: 'Stop' };

export class MdjTransport extends MdjElement {
  static tag = 'mdj-transport';
  static states = ['idle', 'playing', 'paused', 'held', 'pending', 'active', 'disabled', 'interrupted'];
  static fr = ['FR-010', 'FR-016', 'FR-017'];
  static hit = 56;
  static observed = ['kind', 'deck', 'size', 'label', 'cue-selected', 'quantize', 'no-label'];
  static samples = { default: { deck: 'A', size: 56 }, variants: [{ kind: 'play' }, { kind: 'cue' }, { kind: 'sync', deck: 'B' }, { kind: 'stop', deck: 'C' }, { kind: 'cue', deck: 'D', 'no-label': true, size: 48 }], pending: { quantize: '1 beat' } };

  render() {
    const kindAttr = this.attr('kind', 'play');
    const kind = ICONS[kindAttr] && kindAttr !== 'pause' ? kindAttr : 'play';
    const noLabel = this.bool('no-label');
    const deck = this.attr('deck', 'A');
    const size = this.num('size', 56);
    const state = this.state;
    const label = this.attr('label', kind === 'play' ? (state === 'playing' ? 'Pause' : 'Play') : DEFAULT_LABEL[kind]);
    this.className = `transport transport--${kind}${noLabel ? ' transport--nolabel' : ''} deck-${deck.toLowerCase()}`;
    this.style.setProperty('--size', `${size}px`);
    const name = `${label} deck ${deck}${state === 'pending' ? ' (waiting for ' + this.attr('quantize', 'beat') + ')' : ''}${state === 'disabled' ? ' (no track loaded)' : ''}`;
    const btn = h('button', {
      type: 'button', class: 'transport__btn', 'aria-label': name, 'aria-pressed': kind === 'sync' ? String(state === 'active') : undefined,
      disabled: state === 'disabled' ? true : null, dataset: { hit: String(Math.max(48, size)) },
      on: { click: () => this.emit('mdj:transport', { kind, deck, state }) },
    });
    const ic = kind === 'play' && state === 'playing' ? 'pause' : ICONS[kind];
    btn.appendChild(h('span', { class: 'transport__ring', 'aria-hidden': 'true' }));
    btn.appendChild(h('span', { class: 'transport__face' }, [
      icon(ic, { size: kind === 'sync' ? 18 : 22 }),
      kind !== 'play' && !noLabel ? h('span', { class: 'transport__text', text: label.toUpperCase() }) : null,
    ]));
    if (state === 'pending') btn.appendChild(h('span', { class: 'transport__pending label', text: 'Q' }));
    this.replaceChildren(btn);
  }
}
define(MdjTransport);

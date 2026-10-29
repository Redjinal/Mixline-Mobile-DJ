// <mdj-transport kind="play|cue|sync" deck="A" state="..." size="56" label="...">
//
// Engine binding: Play/Cue/Sync issue EngineCommand(play|cue|sync) carrying the deck
// generation; the visual state reflects the acknowledged engine state, never the tap.
// Units: none. Range: n/a.
// States: idle | playing | paused | held | pending | active | disabled | interrupted
//   held     — finger down (Cue audition while paused; release returns to cue)
//   pending  — quantized command waiting for the next grid point
//   active   — Sync engaged (kind=sync) / Cue selected for headphone (kind=cue + cue-selected)
// Cancellation: pointer-cancel releases a held Cue safely (returns to cue point);
// a pending command can be cancelled by tapping again before execution.
// Accessible: a single activation maps to one engine action; no duplicate pointer-down + click.
import { MdjElement, define, h, icon } from './base.js';

const ICONS = { play: 'play', cue: 'cue', sync: 'sync', pause: 'pause' };

export class MdjTransport extends MdjElement {
  static tag = 'mdj-transport';
  static states = ['idle', 'playing', 'paused', 'held', 'pending', 'active', 'disabled', 'interrupted'];
  static fr = ['FR-010', 'FR-016', 'FR-017'];
  static hit = 56;
  static observed = ['kind', 'deck', 'size', 'label', 'cue-selected', 'quantize'];
  static samples = { default: { deck: 'A', size: 56 }, variants: [{ kind: 'play' }, { kind: 'cue' }, { kind: 'sync', deck: 'B' }], pending: { quantize: '1 beat' } };

  render() {
    const kind = this.attr('kind', 'play');
    const deck = this.attr('deck', 'A');
    const size = this.num('size', 56);
    const state = this.state;
    const label = this.attr('label', kind === 'play' ? (state === 'playing' ? 'Pause' : 'Play') : kind === 'cue' ? 'Cue' : 'Sync');
    this.className = `transport transport--${kind} deck-${deck.toLowerCase()}`;
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
      kind !== 'play' ? h('span', { class: 'transport__text', text: label.toUpperCase() }) : null,
    ]));
    if (state === 'pending') btn.appendChild(h('span', { class: 'transport__pending label', text: 'Q' }));
    this.replaceChildren(btn);
  }
}
define(MdjTransport);

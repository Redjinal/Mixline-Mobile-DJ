// <mdj-deck-tab deck="A" state="empty|loading|playing|paused|missing|interrupted" title="..." focused level="0.6" compact>
//
// The deck status selector in the persistent shell (Document 03 §1). Selecting a deck
// changes the visible workspace only; it never changes transport or assignment. Deck
// identity is the letter and label, never the colour alone. A held gesture elsewhere
// keeps its original deck id; focus changes are deferred until release.
// Accessible: role=tab, name "Deck A: AURORA DRIVE, playing". Hit 56 dp.
import { MdjElement, define, h, icon } from './base.js';

const STATE_TEXT = { empty: 'Empty', loading: 'Loading', playing: 'Playing', paused: 'Paused', missing: 'Missing file', interrupted: 'Interrupted' };
const STATE_ICON = { empty: 'plus', loading: 'loader', playing: 'play', paused: 'pause', missing: 'warning', interrupted: 'warning' };

export class MdjDeckTab extends MdjElement {
  static tag = 'mdj-deck-tab';
  static states = ['empty', 'loading', 'playing', 'paused', 'missing', 'interrupted'];
  static fr = ['FR-012', 'FR-035'];
  static hit = 56;
  static observed = ['deck', 'title', 'focused', 'level', 'compact'];
  static samples = { default: { deck: 'A', title: 'AURORA DRIVE', level: 0.6, style: 'width:160px' }, variants: [{}, { deck: 'B', title: 'COPPER SKY', compact: true, style: 'width:112px' }], empty: { title: '' }, missing: { title: 'BRASS CANYON', level: 0 }, playing: { focused: true } };

  render() {
    const deck = this.attr('deck', 'A');
    const state = this.state;
    const title = this.attr('title', '');
    const focused = this.bool('focused');
    const level = Math.min(1, Math.max(0, this.num('level', 0)));
    const compact = this.bool('compact');
    this.className = `deck-tab deck-${deck.toLowerCase()} deck-tab--${state} ${focused ? 'deck-tab--focused' : ''} ${compact ? 'deck-tab--compact' : ''}`.trim();
    const name = `Deck ${deck}: ${title || 'empty'}, ${STATE_TEXT[state] || state}${focused ? ', in focus' : ''}`;
    const btn = h('button', {
      type: 'button', role: 'tab', 'aria-selected': String(focused), 'aria-label': name, class: 'deck-tab__btn', dataset: { hit: '56' },
      on: { click: () => this.emit('mdj:focus-deck', { deck }) },
    });
    btn.appendChild(h('span', { class: 'deck-tab__letter numeral', text: deck, 'aria-hidden': 'true' }));
    btn.appendChild(h('span', { class: 'deck-tab__body' }, [
      h('span', { class: 'deck-tab__title truncate', text: title || '—' }),
      h('span', { class: 'deck-tab__state label' }, [icon(STATE_ICON[state] || 'info', { size: 12 }), h('span', { text: STATE_TEXT[state] || state })]),
    ]));
    const lvl = h('span', { class: 'deck-tab__level sunken', 'aria-hidden': 'true' }, [h('span', { class: 'deck-tab__level-fill', style: { height: `${level * 100}%` } })]);
    btn.appendChild(lvl);
    this.replaceChildren(btn);
    // The level bar is fixture data; compact tabs hide the bar, so no mark is needed there.
    if (!compact && (state === 'playing' || state === 'paused')) this.ensureFixtureMark();
  }
}
define(MdjDeckTab);

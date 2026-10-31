// <mdj-section-header title="Crates" count="5|?" action="New crate" action-icon="plus" level="2|3" collapsible
//                     note="Updated 2 min ago" state="idle|busy|collapsed">
//
// A list / panel section heading (FR-005): the title, an optional count (real or unknown "?"), one
// optional action button (48 dp) and, when `collapsible`, a 48 dp expand / collapse toggle. A brass index
// mark leads the hairline rule under the title (brass on index marks, never as text).
// Engine binding: none. Units / range: count is a non-negative integer or unknown.
//   idle      — plain heading
//   busy      — the section's data is genuinely refreshing (indexing, a crate count being recomputed):
//               prints "Updating…" with a static loader glyph; nothing animates to imply completion and
//               the existing rows stay usable (Document 04 §4 "Loading")
//   collapsed — the section body is hidden by the owning screen; the toggle reads "Expand"
// Gesture: tap the action (mdj:section-action { title }) or the toggle (mdj:section-toggle { collapsed }).
// Pending vs acknowledged: busy prints the last known count until the new one arrives; an unknown count
// is "?", never a stale number pretending to be current. Cancellation: n/a.
// Accessible: heading level `level`; "Crates, 5"; action "New crate"; toggle "Collapse Crates" /
// "Expand Crates" with aria-expanded.
import { MdjElement, define, h, icon } from './base.js';
import { countText } from './mdj-chip.js';

export class MdjSectionHeader extends MdjElement {
  static tag = 'mdj-section-header';
  static states = ['idle', 'busy', 'collapsed'];
  static fr = ['FR-005'];
  static hit = 48;
  static fixture = false;
  static observed = ['title', 'count', 'action', 'action-icon', 'level', 'collapsible', 'note'];
  static samples = {
    default: { title: 'Crates', count: 5, action: 'New crate', 'action-icon': 'plus', collapsible: true, style: 'width:100%' },
    variants: [{}, { title: 'Recently played', count: '?', action: null, 'action-icon': null, note: 'History is being rebuilt', level: 3 }],
  };

  render() {
    // The host's `title` attribute is removed below (no native tooltip); cache it so a later re-render keeps it.
    if (this.hasAttribute('title')) this._title = this.getAttribute('title');
    const title = this._title ?? 'Section';
    const count = this.hasAttribute('count') ? countText(this.getAttribute('count')) : null;
    const action = this.attr('action', '');
    const actionIcon = this.attr('action-icon', '');
    const level = this.num('level', 2) === 3 ? 'h3' : 'h2';
    const collapsible = this.bool('collapsible');
    const note = this.attr('note', '');
    const state = this.state;
    const collapsed = state === 'collapsed';
    this.className = `section-header section-header--${state}`;
    this.removeAttribute('title');
    delete this.dataset.hit; // the action and toggle buttons are the targets
    const heading = h(level, { class: 'section-header__title title' }, [
      h('span', { class: 'section-header__text', text: title }),
      count ? h('span', { class: 'section-header__count numeral', role: 'img', 'aria-label': count.known ? `${count.text} items` : 'unknown count', text: count.text }) : null,
    ]);
    const row = h('div', { class: 'section-header__row' }, [
      heading,
      state === 'busy' ? h('span', { class: 'section-header__busy tone-info', role: 'status' }, [icon('loader', { size: 12 }), h('span', { class: 'label', text: 'Updating…' })]) : null,
      action ? h('button', { type: 'button', class: 'btn btn--ghost section-header__action', dataset: { hit: '48' }, on: { click: () => this.emit('mdj:section-action', { title, action }) } }, [actionIcon ? icon(actionIcon, { size: 16 }) : null, h('span', { class: 'btn-label', text: action })]) : null,
      collapsible ? h('button', { type: 'button', class: 'section-header__toggle', dataset: { hit: '48' }, 'aria-expanded': String(!collapsed), 'aria-label': `${collapsed ? 'Expand' : 'Collapse'} ${title}`, on: { click: () => this.emit('mdj:section-toggle', { title, collapsed: !collapsed }) } }, [icon(collapsed ? 'chevron-down' : 'chevron-up', { size: 18 })]) : null,
    ]);
    this.replaceChildren(...[
      row,
      note ? h('p', { class: 'section-header__note muted', text: note }) : null,
      h('span', { class: 'section-header__rule', 'aria-hidden': 'true' }),
    ].filter(Boolean));
  }
}
define(MdjSectionHeader);

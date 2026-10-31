// <mdj-filter-bar filters='[{"label":"Key 8A","count":6},{"label":"BPM 120–128","count":"?"}]' total="6"
//                 scope="Library" state="active|empty|restored">
//
// Removable filter chips above results (Document 04 §4 "Filters"; FR-004). Each chip is an <mdj-chip
// kind="filter" removable> with its real or unknown count; "Clear all" (48 dp) removes every filter; the
// trailing numeral prints the filtered result count or "?" when unknown.
// Engine binding: none — filters change the browse scope only.
// Units / range: counts are non-negative integers or unknown; never a percentage.
//   active   — one or more filters applied
//   empty    — no filter applied; prints "No filters · showing all N tracks" (useful zero state, nothing
//              to clear)
//   restored — the filters were restored from the last session / saved view (native state restoration;
//              the chips are the same, a small "Restored" note says why they are there). Personal music
//              paths never appear in a filter label or a share link.
// Gesture: tap a chip to toggle it (mdj:chip), its × to remove it (mdj:chip-remove), Clear all
// (mdj:filters-clear). Pending vs acknowledged: counts print the library's last answer; while a new count
// is being computed the owning screen passes "?" rather than a stale number.
// Cancellation: n/a. Accessible: group "Active filters, 2"; chips "Key 8A, 6 results"; "Clear all filters".
import { MdjElement, define, h, icon } from './base.js';
import { countText, parseJsonAttr } from './mdj-chip.js';
import './mdj-chip.js';

export class MdjFilterBar extends MdjElement {
  static tag = 'mdj-filter-bar';
  static states = ['active', 'empty', 'restored'];
  static fr = ['FR-004'];
  static hit = 48;
  static fixture = false;
  static observed = ['filters', 'total', 'scope'];
  static samples = {
    default: { scope: 'Library', filters: JSON.stringify([{ label: 'Key 8A', count: 6, field: 'key' }, { label: 'BPM 120–128', count: '?', field: 'bpm' }, { label: 'Ready', count: 11, field: 'availability' }]), total: 6, style: 'width:100%' },
    variants: [{}],
    empty: { filters: '[]', total: 16 },
    restored: { total: '?' },
  };

  render() {
    const filters = parseJsonAttr(this.getAttribute('filters'), []).filter((f) => f && f.label);
    const total = countText(this.hasAttribute('total') ? this.getAttribute('total') : null);
    const scope = this.attr('scope', 'Library');
    const given = this.getAttribute('state');
    const state = given && this.constructor.states.includes(given) ? given : (filters.length ? 'active' : 'empty');
    this.className = `filter-bar filter-bar--${state}`;
    delete this.dataset.hit; // chips and Clear all are the targets
    const parts = [];
    if (state === 'empty' || !filters.length) {
      parts.push(h('div', { class: 'filter-bar__empty', role: 'status' }, [
        icon('filter', { size: 14 }),
        h('span', { class: 'muted', text: `No filters · showing ${total.known ? `all ${total.text}` : 'all'} ${scope.toLowerCase()} tracks` }),
      ]));
    } else {
      const chips = h('div', { class: 'filter-bar__chips', role: 'group', 'aria-label': `Active filters, ${filters.length}` });
      for (const f of filters) chips.appendChild(h('mdj-chip', { kind: 'filter', label: f.label, value: f.value || f.field || f.label, count: f.count === undefined || f.count === null ? '?' : f.count, removable: true, state: f.selected === false ? 'idle' : 'selected' }));
      parts.push(h('div', { class: 'filter-bar__head' }, [
        h('span', { class: 'filter-bar__label label' }, [icon('filter', { size: 12 }), h('span', { text: state === 'restored' ? 'Filters · restored' : 'Filters' })]),
        h('span', { class: 'filter-bar__total numeral ink-backing', role: 'status', 'aria-label': total.known ? `${total.text} results` : 'result count unknown', text: total.known ? `${total.text} ${total.text === '1' ? 'result' : 'results'}` : '? results' }),
        h('button', { type: 'button', class: 'btn btn--ghost filter-bar__clear', dataset: { hit: '48' }, 'aria-label': 'Clear all filters', on: { click: () => this.emit('mdj:filters-clear', {}) } }, [icon('x', { size: 14 }), h('span', { class: 'btn-label', text: 'Clear all' })]),
      ]));
      parts.push(chips);
      if (state === 'restored') parts.push(h('p', { class: 'filter-bar__note muted', text: 'Restored from your last session. Counts update when the library answers.' }));
    }
    this.replaceChildren(...parts);
  }
}
define(MdjFilterBar);

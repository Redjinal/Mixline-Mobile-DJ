// <mdj-search-bar value="harbour" placeholder="Search library" scope="Library" count="6" filters="2" compact
//                 state="idle|focused|results|no-results|offline">
//
// The library search field (FR-004: title, artist, album, BPM range, key, tags, availability, played
// state). A real <input type="search"> inside role=search, a Clear button (48 dp, only while there is
// text) and a Filters button (48 dp) carrying an <mdj-badge> with the active-filter count. The status line
// prints the result count, the no-results recovery or the offline limit; nothing is a fake count.
// Engine binding: none — searching changes the browse scope only. Transport, crossfader and route stay
// reachable; the keyboard may reduce result rows but never covers live controls (Document 03 §1).
// Units / range: count is a non-negative integer or unknown ("?"); filters is the number of active chips.
//   compact — one 48 dp row for the extreme small-height layout ("compact search workflow"): the status
//             line is kept for assistive technology only (visually hidden) and the field grows no taller.
// Gesture: type (mdj:search { value } on input), Enter submits (mdj:search { value, submit: true }), Clear
// (mdj:search-clear), Filters (mdj:filters-open). Pending vs acknowledged: results update when the
// library answers; the `results` / `no-results` state is the acknowledged answer for the printed query.
// Cancellation: Clear empties the field and the query; Escape clears too. Native search state survives
// navigation and restoration (the owning screen passes `value` / `filters` back in).
// Accessible: search landmark "Search Library"; input name "Search Library"; "Clear search"; "Filters, 2
// active"; status is aria-live=polite.
import { MdjElement, define, h, icon } from './base.js';
import { countText } from './mdj-chip.js';
import './mdj-badge.js';

let uid = 0;

export class MdjSearchBar extends MdjElement {
  static tag = 'mdj-search-bar';
  static states = ['idle', 'focused', 'results', 'no-results', 'offline'];
  static fr = ['FR-004'];
  static hit = 48;
  static fixture = false;
  static observed = ['value', 'placeholder', 'scope', 'count', 'filters', 'compact'];
  static samples = {
    default: { scope: 'Library', filters: 2, style: 'width:100%' },
    variants: [{}, { compact: true, value: 'aurora', count: 1 }],
    idle: { value: '' },
    focused: { value: 'har' },
    results: { value: 'harbour', count: 6 },
    'no-results': { value: 'zinc harbor', count: 0 },
    offline: { value: 'soda', count: 1 },
  };

  render() {
    const value = this.attr('value', '');
    const scope = this.attr('scope', 'Library');
    const placeholder = this.attr('placeholder', `Search ${scope.toLowerCase()} — title, artist, BPM, key, tag`);
    const count = countText(this.hasAttribute('count') ? this.getAttribute('count') : null);
    const filters = Math.max(0, Math.round(this.num('filters', 0)));
    const compact = this.bool('compact');
    const state = this.state;
    this.className = `search-bar search-bar--${state}${compact ? ' search-bar--compact' : ''}`;
    delete this.dataset.hit; // the field, Clear and Filters are the targets
    // One id per instance: several search bars (gallery states, docked + sheet) must not share label / describedby ids.
    this._uid ??= ++uid;
    const inputId = `${this.constructor.tag}-${this._uid}`;
    const keepFocus = this.contains(document.activeElement);

    const input = h('input', {
      id: inputId, class: 'search-bar__input', dataset: { hit: '48' }, type: 'search', value, placeholder, inputmode: 'search', enterkeyhint: 'search', autocomplete: 'off', spellcheck: 'false',
      'aria-label': `Search ${scope}`, 'aria-describedby': `${inputId}-status`,
      on: {
        input: (e) => this.emit('mdj:search', { value: e.target.value }),
        keydown: (e) => {
          if (e.key === 'Enter') { e.preventDefault(); this.emit('mdj:search', { value: e.target.value, submit: true }); }
          if (e.key === 'Escape') { e.preventDefault(); e.target.value = ''; this.emit('mdj:search-clear', {}); }
        },
        focus: () => this.classList.add('search-bar--has-focus'),
        blur: () => this.classList.remove('search-bar--has-focus'),
      },
    });
    const field = h('div', { class: 'search-bar__field raised' }, [
      h('label', { class: 'search-bar__glyph', for: inputId, 'aria-hidden': 'true' }, [icon('search', { size: 18 })]),
      input,
      value ? h('button', { type: 'button', class: 'search-bar__clear', dataset: { hit: '48' }, 'aria-label': 'Clear search', on: { click: () => { input.value = ''; this.emit('mdj:search-clear', {}); } } }, [h('span', { class: 'search-bar__clear-face', 'aria-hidden': 'true' }, [icon('x', { size: 12 })])]) : null,
    ]);
    const filterBtn = h('button', {
      type: 'button', class: `search-bar__filters raised${filters ? ' search-bar__filters--active' : ''}`, dataset: { hit: '48' },
      'aria-label': `Filters, ${filters ? `${filters} active` : 'none active'}`, 'aria-haspopup': 'dialog',
      on: { click: () => this.emit('mdj:filters-open', { filters }) },
    }, [icon('filter', { size: 18 }), compact ? null : h('span', { class: 'search-bar__filters-text label', text: 'Filters' }), h('mdj-badge', { count: filters, label: 'active filters' })]);
    const form = h('form', { class: 'search-bar__form', role: 'search', 'aria-label': `Search ${scope}`, on: { submit: (e) => { e.preventDefault(); this.emit('mdj:search', { value: input.value, submit: true }); } } }, [field, filterBtn]);

    // Status line: real counts or an honest unknown; recovery for no results; the offline limit.
    let statusIcon = null, statusText = '', tone = 'neutral';
    if (state === 'offline') { statusIcon = 'wifi-off'; tone = 'warning'; statusText = `Offline — searching the local ${scope.toLowerCase()} only. Downloads, lookups and ParDay cloud features wait for a connection.`; }
    else if (state === 'no-results') { statusIcon = 'search'; tone = 'neutral'; statusText = `No results for “${value}” in ${scope}. Check the spelling, widen the BPM range${filters ? ' or clear the filters' : ''}.`; }
    else if (state === 'results') { statusIcon = 'check'; statusText = count.known ? `${count.text} ${count.text === '1' ? 'result' : 'results'} in ${scope}${filters ? ` · ${filters} ${filters === 1 ? 'filter' : 'filters'} applied` : ''}` : `Results in ${scope} · count unknown`; }
    else if (state === 'focused') { statusIcon = 'info'; statusText = 'Results update as you type. Enter searches all crates.'; }
    else { statusIcon = 'info'; statusText = `Search ${scope.toLowerCase()} by title, artist, album, BPM range, key, tag, availability or played state.`; }
    const status = h('div', { id: `${inputId}-status`, class: `search-bar__status${compact ? ' search-bar__sr' : ''} tone-${tone}`, role: 'status', 'aria-live': 'polite' }, [
      statusIcon ? icon(statusIcon, { size: 12 }) : null,
      h('span', { text: statusText }),
      state === 'no-results' && filters ? h('button', { type: 'button', class: 'btn btn--ghost search-bar__recover', dataset: { hit: '48' }, on: { click: () => this.emit('mdj:filters-clear', {}) } }, [h('span', { class: 'btn-label', text: 'Clear filters' })]) : null,
    ]);
    this.replaceChildren(form, status);
    if (keepFocus || state === 'focused') { /* the focused visual is the class; real focus is only restored when the user had it */ }
    if (keepFocus) input.focus({ preventScroll: true });
  }
}
define(MdjSearchBar);

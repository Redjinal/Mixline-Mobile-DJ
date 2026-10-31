// <mdj-empty-state icon="library" title="Your library is empty" body="…" query="zinc harbor"
//                  actions='[{"id":"import","label":"Import music","icon":"import","primary":true},{"id":"demo","label":"Use demo media"}]'
//                  state="idle|no-results|offline|denied|missing">
//
// An empty, zero-result, offline, denied or missing-media region with a useful next action (Document 03
// §5 / Document 19 §7: "empty / loading / error / offline / recovery states have useful next actions").
// The actions are real <button>s (48 dp); the first (or `primary: true`) is primary. Each state has
// default copy and icon; title / body / icon / actions attributes override them.
// Engine binding: none — the buttons emit mdj:action { id } for the owning screen (Import, Demo, Clear
// filters, Retry, Choose a folder, Locate file…). Demo media is always printed as demo (fixture).
// Units / range: n/a. Gesture: tap. Pending vs acknowledged: n/a (the screen changes state when the
// library answers). Cancellation: n/a.
// Accessible: region named by the title; body text is plain; icons are decorative.
import { MdjElement, define, h, icon } from './base.js';
import { parseJsonAttr } from './mdj-chip.js';

const PRESET = {
  idle: { icon: 'library', title: 'Your library is empty', body: 'Import music from your phone, or start with the clearly labelled demo media. Nothing is uploaded; the library stays on this device.', actions: [{ id: 'import', label: 'Import music', icon: 'import', primary: true }, { id: 'demo', label: 'Use demo media', icon: 'demo' }] },
  'no-results': { icon: 'search', title: 'No results', body: 'Nothing matches that search. Check the spelling, widen the BPM range or clear the filters.', actions: [{ id: 'clear-filters', label: 'Clear filters', icon: 'filter', primary: true }, { id: 'search-all', label: 'Search all crates', icon: 'search' }] },
  offline: { icon: 'wifi-off', title: 'Offline', body: 'Your local library and prepared sets still work. Downloads, catalogue lookups and ParDay cloud features wait for a connection.', actions: [{ id: 'local', label: 'Show local tracks', icon: 'library', primary: true }, { id: 'retry', label: 'Retry', icon: 'refresh' }] },
  denied: { icon: 'lock', title: 'Folder access was not granted', body: 'Nothing was imported and your existing library is unchanged. Choose a folder again to grant scoped access.', actions: [{ id: 'choose', label: 'Choose a folder', icon: 'folder', primary: true }, { id: 'later', label: 'Not now' }] },
  missing: { icon: 'unavailable', title: 'File missing', body: 'The file was moved or deleted since the last session. Cues, loops and crate entries are preserved until you remove the track.', actions: [{ id: 'locate', label: 'Locate file', icon: 'folder', primary: true }, { id: 'remove', label: 'Remove from crate', icon: 'trash' }] },
};

export class MdjEmptyState extends MdjElement {
  static tag = 'mdj-empty-state';
  static states = ['idle', 'no-results', 'offline', 'denied', 'missing'];
  static fr = ['FR-002', 'FR-004'];
  static hit = 48;
  static fixture = false;
  static observed = ['icon', 'title', 'body', 'query', 'actions'];
  static samples = {
    default: { style: 'width:100%' },
    variants: [{}],
    'no-results': { query: 'zinc harbor' },
  };

  render() {
    const state = this.state;
    const preset = PRESET[state] || PRESET.idle;
    const ic = this.attr('icon', preset.icon);
    const title = this.attr('title', preset.title);
    const query = this.attr('query', '');
    const body = this.attr('body', state === 'no-results' && query ? `Nothing matches “${query}”. Check the spelling, widen the BPM range or clear the filters.` : preset.body);
    const actions = parseJsonAttr(this.getAttribute('actions'), preset.actions).filter((a) => a && a.label);
    this.className = `empty-state glass empty-state--${state}`;
    delete this.dataset.hit; // the action buttons are the targets
    this.removeAttribute('title');
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', title);
    const buttons = h('div', { class: 'empty-state__actions' });
    actions.forEach((a, i) => {
      const primary = a.primary === true || (i === 0 && !actions.some((x) => x.primary));
      buttons.appendChild(h('button', {
        type: 'button', class: `btn ${primary ? 'btn--primary' : ''} empty-state__btn`.trim(), dataset: { hit: '48' },
        on: { click: () => this.emit('mdj:action', { id: a.id || a.label, state }) },
      }, [a.icon ? icon(a.icon, { size: 16 }) : null, h('span', { class: 'btn-label', text: a.label })]));
    });
    this.replaceChildren(
      h('span', { class: 'empty-state__badge brass-rim', 'aria-hidden': 'true' }, [h('span', { class: 'empty-state__disc titanium-radial' }, [icon(ic, { size: 22 })])]),
      h('div', { class: 'empty-state__text ink-backing' }, [
        h('h3', { class: 'empty-state__title title', text: title }),
        h('p', { class: 'empty-state__body body', text: body }),
      ]),
      buttons,
    );
  }
}
define(MdjEmptyState);

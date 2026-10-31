// <mdj-workspace-switcher current="library" items="library,pads,fx,stems,sampler,queue,sources,video,karaoke,broadcast,plugins,settings"
//                         max="5" compact state="idle|more-open|disabled">
//
// The labelled workspace switcher (Document 03 §7; Document 04 §4 "Navigation": phones use labelled
// workspaces / a docked browser, never a desktop sidebar). Every destination has an icon AND a visible
// label. On a phone (default) it shows `max` (5) destinations plus a "More" button; the remaining
// destinations open in an overflow panel (state=more-open, rendered above the bar). If the current
// destination lives in the overflow it is promoted into the visible row, so the current state is always
// visible; the "More" button also prints the count of hidden destinations.
// Engine binding: NONE. Switching a workspace changes the visible content only — never a deck, transport
// or assignment (Document 03 §1), and this control has no swipe gesture, so an unrelated swipe can never
// become a live transport command. Deck focus, recording, automation and routing are unchanged.
//   compact — the landscape dock row: 48 dp high, icon + label side by side, auto width per tab
//   disabled — a destination list that cannot be used right now (e.g. during an uninterruptible
//              recovery step) prints "Unavailable" and keeps the current tab readable
// Units / range: n/a. Gesture: tap. Pending vs acknowledged: n/a (navigation is immediate and local).
// Cancellation: Escape / the More button closes the overflow; the current workspace stays.
// Events: mdj:workspace { id }, mdj:workspace-more { open }.
// Accessible: role=tablist "Workspaces"; tabs "Library, selected"; "More, 7 hidden workspaces" with
// aria-expanded; overflow items are role=menuitemradio inside role=menu.
import { MdjElement, define, h, icon } from './base.js';
import { iconId } from './mdj-marker.js';

export const WORKSPACES = {
  library: { label: 'Library', icon: 'library' },
  pads: { label: 'Pads', icon: 'pads' },
  fx: { label: 'FX', icon: 'fx' },
  stems: { label: 'Stems', icon: 'stems' },
  sampler: { label: 'Sampler', icon: 'sampler' },
  queue: { label: 'Queue', icon: 'queue' },
  sources: { label: 'Sources', icon: 'download' },
  video: { label: 'Video', icon: 'video' },
  karaoke: { label: 'Karaoke', icon: ['karaoke', 'singer'] },
  broadcast: { label: 'Broadcast', icon: 'broadcast' },
  plugins: { label: 'Plugins', icon: 'plugin' },
  settings: { label: 'Settings', icon: 'settings' },
  mic: { label: 'Mic', icon: 'mic' },
  parday: { label: 'ParDay', icon: 'parday' },
  record: { label: 'Record', icon: 'rec' },
};
const iconOf = (def) => (Array.isArray(def.icon) ? iconId(def.icon[0], def.icon[1]) : def.icon);

export class MdjWorkspaceSwitcher extends MdjElement {
  static tag = 'mdj-workspace-switcher';
  static states = ['idle', 'more-open', 'disabled'];
  static fr = ['FR-039', 'FR-047'];
  static hit = 48;
  static fixture = false;
  static observed = ['current', 'items', 'max', 'compact'];
  static samples = {
    default: { current: 'library', items: 'library,pads,fx,stems,sampler,queue,sources,video,karaoke,broadcast,plugins,settings', max: 5, style: 'width:380px;max-width:100%' },
    variants: [{}, { current: 'broadcast' }, { compact: true, current: 'pads', items: 'library,pads,fx,stems,queue,settings', max: 6, style: 'width:auto;max-width:100%' }],
  };

  render() {
    const items = this.attr('items', 'library,pads,fx,stems').split(',').map((s) => s.trim()).filter((s) => WORKSPACES[s]);
    const current = this.attr('current', items[0] || 'library');
    const max = Math.max(2, Math.round(this.num('max', 5)));
    const compact = this.bool('compact');
    const state = this.state;
    const disabled = state === 'disabled';
    const open = state === 'more-open';
    this.className = `ws ws--${state}${compact ? ' ws--compact' : ''}`;
    delete this.dataset.hit; // the tabs and More are the targets
    const needMore = items.length > max;
    let visible = needMore ? items.slice(0, max - 1) : items.slice();
    if (needMore && !visible.includes(current) && items.includes(current)) visible[visible.length - 1] = current;
    const hidden = items.filter((i) => !visible.includes(i));

    const tab = (id, role = 'tab') => {
      const def = WORKSPACES[id];
      const selected = id === current;
      return h('button', {
        type: 'button', role, class: `ws__tab${selected ? ' ws__tab--current' : ''}`, dataset: { hit: '48' },
        'aria-selected': role === 'tab' ? String(selected) : undefined, 'aria-checked': role === 'menuitemradio' ? String(selected) : undefined,
        'aria-label': `${def.label}${selected ? ', current workspace' : ''}${disabled ? ', unavailable' : ''}`, 'aria-disabled': disabled ? 'true' : undefined,
        tabindex: role === 'tab' ? (selected ? 0 : -1) : 0,
        on: { click: () => { if (!disabled) this.emit('mdj:workspace', { id }); } },
      }, [
        h('span', { class: 'ws__mark index-mark', 'aria-hidden': 'true' }),
        icon(iconOf(def), { size: compact ? 18 : 20 }),
        h('span', { class: 'ws__label', text: def.label }),
      ]);
    };
    const list = h('div', { class: 'ws__tabs', role: 'tablist', 'aria-label': 'Workspaces', on: { keydown: (e) => this.onKey(e, visible, current) } });
    for (const id of visible) list.appendChild(tab(id));
    if (needMore) {
      list.appendChild(h('button', {
        type: 'button', class: `ws__tab ws__more${open ? ' ws__more--open' : ''}`, dataset: { hit: '48' }, 'aria-haspopup': 'menu', 'aria-expanded': String(open),
        'aria-label': `More, ${hidden.length} hidden ${hidden.length === 1 ? 'workspace' : 'workspaces'}`, 'aria-disabled': disabled ? 'true' : undefined,
        on: { click: () => { if (!disabled) this.emit('mdj:workspace-more', { open: !open }); } },
      }, [
        h('span', { class: 'ws__mark index-mark', 'aria-hidden': 'true' }),
        h('span', { class: 'ws__more-icon' }, [icon(open ? 'chevron-down' : 'more', { size: compact ? 18 : 20 }), h('span', { class: 'ws__more-count numeral', 'aria-hidden': 'true', text: String(hidden.length) })]),
        h('span', { class: 'ws__label', text: 'More' }),
      ]));
    }
    const bar = h('div', { class: 'ws__bar glass' }, [list, disabled ? h('span', { class: 'ws__disabled label tone-warning', text: 'Workspaces unavailable during recovery' }) : null]);
    const parts = [];
    if (open && hidden.length) {
      const menu = h('div', { class: 'ws__overflow glass', role: 'menu', 'aria-label': 'More workspaces', on: { keydown: (e) => { if (e.key === 'Escape') { e.preventDefault(); this.emit('mdj:workspace-more', { open: false }); } } } });
      for (const id of hidden) menu.appendChild(tab(id, 'menuitemradio'));
      parts.push(menu);
    }
    parts.push(bar);
    this.replaceChildren(...parts);
  }

  onKey(e, visible, current) {
    const i = visible.indexOf(current);
    if (i < 0) return;
    let next = null;
    if (e.key === 'ArrowRight') next = visible[(i + 1) % visible.length];
    else if (e.key === 'ArrowLeft') next = visible[(i - 1 + visible.length) % visible.length];
    else if (e.key === 'Home') next = visible[0];
    else if (e.key === 'End') next = visible[visible.length - 1];
    if (next) { e.preventDefault(); this.emit('mdj:workspace', { id: next, source: 'keyboard' }); }
  }
}
define(MdjWorkspaceSwitcher);

/** Bottom tab bar (left rail on landscape/desktop). */
import {html, render, delegate} from '../ui/dom.js';
import {icon} from '../ui/icons.js';

export const WORKSPACES = [
  {name: 'decks', label: 'Decks', icon: 'decks'},
  {name: 'mixer', label: 'Mixer', icon: 'mixer'},
  {name: 'pads', label: 'Pads', icon: 'pads'},
  {name: 'fx', label: 'FX', icon: 'fx'},
  {name: 'library', label: 'Library', icon: 'library'},
  {name: 'challenge', label: 'Challenge', icon: 'challenge'},
];

export function createNav(el, router, {onSelect, guard} = {}) {
  render(el, WORKSPACES.map(w => html`<button class="tab" data-route="${w.name}" aria-label="${w.label}">${icon(w.icon, {size: 22})}<span>${w.label}</span></button>`));
  const update = () => {
    for (const button of el.querySelectorAll('[data-route]')) {
      const active = button.dataset.route === router.current.name;
      if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    }
  };
  delegate(el, 'click', '[data-route]', (event, button) => { onSelect?.(button.dataset.route); if (guard) guard(button.dataset.route); else router.navigate(button.dataset.route); });
  router.subscribe(update);
  update();
  return {update};
}

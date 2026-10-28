/** Mixline 6 bootstrap. */
import {$, html, render} from './ui/dom.js';
import {icon} from './ui/icons.js';
import {toast} from './ui/toast.js';
import {createRouter} from './shell/router.js';
import {createNav, WORKSPACES} from './shell/nav.js';

const ROUTES = [...WORKSPACES.map(w => w.name), 'settings'];
const router = createRouter({routes: ROUTES, initial: 'decks'});

render($('#header'), html`
  <a class="brand" href="#" data-route="decks" aria-label="Mixline home">
    <span class="brand-name">MIXLINE</span><span class="brand-sep">/</span><span class="brand-space" data-space>Decks</span>
  </a>
  <div class="header-actions">
    <button class="btn btn-icon btn-ghost is-rec" data-record aria-label="Record" aria-pressed="false"><span class="rec-dot"></span></button>
    <button class="btn btn-icon btn-ghost" data-lock aria-label="Performance lock" aria-pressed="false">${icon('unlock')}</button>
    <button class="btn btn-icon btn-ghost" data-settings aria-label="Studio settings">${icon('settings')}</button>
  </div>`);

createNav($('#nav'), router);

function paint() {
  const space = WORKSPACES.find(w => w.name === router.current.name);
  $('[data-space]').textContent = space ? space.label : 'Settings';
  render($('#main'), html`<section class="screen"><div class="screen-head"><div><h1>${space ? space.label : 'Studio settings'}</h1><p class="placeholder">Workspace under construction.</p></div></div></section>`);
}
router.subscribe(paint);
paint();
$('[data-settings]').addEventListener('click', () => router.navigate('settings'));
$('.brand').addEventListener('click', event => { event.preventDefault(); router.navigate('decks'); });

window.Mixline = {router, toast};
